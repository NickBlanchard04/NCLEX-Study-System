create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create sequence if not exists public.profile_signup_number_seq;

alter table public.profiles
add column if not exists member_number bigint,
add column if not exists profile_state text,
add column if not exists directory_visible boolean not null default true;

with numbered_profiles as (
  select
    id,
    row_number() over (order by created_at, id) as assigned_number
  from public.profiles
  where member_number is null
)
update public.profiles as profiles
set member_number = numbered_profiles.assigned_number
from numbered_profiles
where profiles.id = numbered_profiles.id
  and profiles.member_number is null;

select setval(
  'public.profile_signup_number_seq',
  greatest(coalesce((select max(member_number) from public.profiles), 0), 1),
  coalesce((select max(member_number) from public.profiles), 0) > 0
);

alter table public.profiles
alter column member_number set default nextval('public.profile_signup_number_seq');

create unique index if not exists profiles_member_number_key
on public.profiles (member_number)
where member_number is not null;

create index if not exists profiles_name_trgm_idx
on public.profiles using gin (name gin_trgm_ops)
where deleted_at is null and directory_visible = true;

create or replace function public.lock_profile_member_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.member_number is distinct from new.member_number then
    new.member_number := old.member_number;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_lock_member_number on public.profiles;
create trigger profiles_lock_member_number
before update on public.profiles
for each row
execute function public.lock_profile_member_number();

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id)
);

create unique index if not exists friend_requests_pending_pair_key
on public.friend_requests (
  least(requester_id, recipient_id),
  greatest(requester_id, recipient_id)
)
where status = 'pending';

create index if not exists friend_requests_recipient_status_idx
on public.friend_requests (recipient_id, status, created_at desc);

create index if not exists friend_requests_requester_status_idx
on public.friend_requests (requester_id, status, created_at desc);

create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create index if not exists friendships_friend_lookup_idx
on public.friendships (friend_id, user_id);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_lookup_idx
on public.user_blocks (blocked_id, blocker_id);

create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (sender_id <> recipient_id)
);

create index if not exists social_messages_recipient_unread_idx
on public.social_messages (recipient_id, read_at, created_at desc)
where deleted_at is null;

create index if not exists social_messages_thread_idx
on public.social_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc)
where deleted_at is null;

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;
alter table public.social_messages enable row level security;

create or replace function public.is_social_blocked(first_user uuid, second_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_blocks
    where (blocker_id = first_user and blocked_id = second_user)
       or (blocker_id = second_user and blocked_id = first_user)
  );
$$;

create policy "friend requests participant select"
on public.friend_requests
for select
to authenticated
using ((select auth.uid()) in (requester_id, recipient_id));

create policy "friend requests requester insert"
on public.friend_requests
for insert
to authenticated
with check (
  (select auth.uid()) = requester_id
  and status = 'pending'
  and requester_id <> recipient_id
  and not public.is_social_blocked(requester_id, recipient_id)
);

create policy "friendships participant select"
on public.friendships
for select
to authenticated
using ((select auth.uid()) in (user_id, friend_id));

create policy "blocks owner select"
on public.user_blocks
for select
to authenticated
using ((select auth.uid()) = blocker_id);

create policy "blocks owner insert"
on public.user_blocks
for insert
to authenticated
with check ((select auth.uid()) = blocker_id and blocker_id <> blocked_id);

create policy "blocks owner delete"
on public.user_blocks
for delete
to authenticated
using ((select auth.uid()) = blocker_id);

create policy "messages participant select"
on public.social_messages
for select
to authenticated
using ((select auth.uid()) in (sender_id, recipient_id));

create policy "messages friends insert"
on public.social_messages
for insert
to authenticated
with check (
  (select auth.uid()) = sender_id
  and sender_id <> recipient_id
  and not public.is_social_blocked(sender_id, recipient_id)
  and exists (
    select 1
    from public.friendships
    where user_id = (select auth.uid())
      and friend_id = recipient_id
  )
);

create policy "messages recipient read receipt"
on public.social_messages
for update
to authenticated
using ((select auth.uid()) = recipient_id)
with check ((select auth.uid()) = recipient_id);

create or replace function public.search_people(search_text text default '')
returns table (
  user_id uuid,
  display_name text,
  member_number bigint,
  profile_image_data_url text,
  college text,
  profile_state text,
  friend_status text,
  request_id uuid
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  search_term text := trim(coalesce(search_text, ''));
begin
  if viewer_id is null then
    raise exception 'Authentication is required.';
  end if;

  return query
  with matches as (
    select
      profiles.id,
      profiles.name,
      profiles.member_number,
      profiles.preferences ->> 'profileImageDataUrl' as profile_image_data_url,
      profiles.nursing_school,
      profiles.profile_state
    from public.profiles
    where profiles.id <> viewer_id
      and profiles.deleted_at is null
      and profiles.directory_visible = true
      and not public.is_social_blocked(viewer_id, profiles.id)
      and (
        search_term = ''
        or profiles.name ilike '%' || search_term || '%'
        or profiles.nursing_school ilike '%' || search_term || '%'
      )
    order by
      case
        when lower(profiles.name) = lower(search_term) then 0
        when lower(profiles.name) like lower(search_term) || '%' then 1
        else 2
      end,
      profiles.name
    limit 24
  )
  select
    matches.id,
    matches.name,
    matches.member_number,
    matches.profile_image_data_url,
    nullif(matches.nursing_school, '') as college,
    nullif(matches.profile_state, '') as profile_state,
    case
      when exists (
        select 1 from public.friendships
        where user_id = viewer_id and friend_id = matches.id
      ) then 'friends'
      when exists (
        select 1 from public.friend_requests
        where requester_id = viewer_id and recipient_id = matches.id and status = 'pending'
      ) then 'requested'
      when exists (
        select 1 from public.friend_requests
        where requester_id = matches.id and recipient_id = viewer_id and status = 'pending'
      ) then 'incoming'
      else 'none'
    end as friend_status,
    (
      select friend_requests.id
      from public.friend_requests
      where status = 'pending'
        and (
          (requester_id = viewer_id and recipient_id = matches.id)
          or (requester_id = matches.id and recipient_id = viewer_id)
        )
      order by created_at desc
      limit 1
    ) as request_id
  from matches;
end;
$$;

create or replace function public.list_social_connections()
returns table (
  connection_type text,
  request_id uuid,
  user_id uuid,
  display_name text,
  member_number bigint,
  profile_image_data_url text,
  college text,
  profile_state text,
  created_at timestamptz,
  status text
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null then
    raise exception 'Authentication is required.';
  end if;

  return query
  select *
  from (
    select
      'friend'::text as connection_type,
      null::uuid as request_id,
      profiles.id as user_id,
      profiles.name as display_name,
      profiles.member_number,
      profiles.preferences ->> 'profileImageDataUrl' as profile_image_data_url,
      nullif(profiles.nursing_school, '') as college,
      nullif(profiles.profile_state, '') as profile_state,
      friendships.created_at,
      'friends'::text as status
    from public.friendships
    join public.profiles on profiles.id = friendships.friend_id
    where friendships.user_id = viewer_id
      and profiles.deleted_at is null
      and not public.is_social_blocked(viewer_id, profiles.id)

    union all

    select
      'incoming_request'::text,
      friend_requests.id,
      profiles.id,
      profiles.name,
      profiles.member_number,
      profiles.preferences ->> 'profileImageDataUrl',
      nullif(profiles.nursing_school, ''),
      nullif(profiles.profile_state, ''),
      friend_requests.created_at,
      friend_requests.status
    from public.friend_requests
    join public.profiles on profiles.id = friend_requests.requester_id
    where friend_requests.recipient_id = viewer_id
      and friend_requests.status = 'pending'
      and profiles.deleted_at is null
      and not public.is_social_blocked(viewer_id, profiles.id)

    union all

    select
      'outgoing_request'::text,
      friend_requests.id,
      profiles.id,
      profiles.name,
      profiles.member_number,
      profiles.preferences ->> 'profileImageDataUrl',
      nullif(profiles.nursing_school, ''),
      nullif(profiles.profile_state, ''),
      friend_requests.created_at,
      friend_requests.status
    from public.friend_requests
    join public.profiles on profiles.id = friend_requests.recipient_id
    where friend_requests.requester_id = viewer_id
      and friend_requests.status = 'pending'
      and profiles.deleted_at is null
      and not public.is_social_blocked(viewer_id, profiles.id)
  ) as connections
  order by created_at desc;
end;
$$;

create or replace function public.list_inbox_items()
returns table (
  item_type text,
  item_id uuid,
  user_id uuid,
  display_name text,
  profile_image_data_url text,
  preview text,
  created_at timestamptz,
  request_status text
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null then
    raise exception 'Authentication is required.';
  end if;

  return query
  select *
  from (
    select
      'friend_request'::text as item_type,
      friend_requests.id as item_id,
      profiles.id as user_id,
      profiles.name as display_name,
      profiles.preferences ->> 'profileImageDataUrl' as profile_image_data_url,
      'Friend request'::text as preview,
      friend_requests.created_at,
      friend_requests.status as request_status
    from public.friend_requests
    join public.profiles on profiles.id = friend_requests.requester_id
    where friend_requests.recipient_id = viewer_id
      and friend_requests.status = 'pending'
      and profiles.deleted_at is null
      and not public.is_social_blocked(viewer_id, profiles.id)

    union all

    select
      unread_messages.item_type,
      unread_messages.item_id,
      unread_messages.user_id,
      unread_messages.display_name,
      unread_messages.profile_image_data_url,
      unread_messages.preview,
      unread_messages.created_at,
      unread_messages.request_status
    from (
      select distinct on (social_messages.sender_id)
        'message'::text as item_type,
        social_messages.id as item_id,
        profiles.id as user_id,
        profiles.name as display_name,
        profiles.preferences ->> 'profileImageDataUrl' as profile_image_data_url,
        left(social_messages.body, 160) as preview,
        social_messages.created_at,
        null::text as request_status
      from public.social_messages
      join public.profiles on profiles.id = social_messages.sender_id
      where social_messages.recipient_id = viewer_id
        and social_messages.read_at is null
        and social_messages.deleted_at is null
        and profiles.deleted_at is null
        and not public.is_social_blocked(viewer_id, profiles.id)
      order by social_messages.sender_id, social_messages.created_at desc
    ) as unread_messages
  ) as inbox_items
  order by created_at desc
  limit 50;
end;
$$;

create or replace function public.send_friend_request(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  existing_request_id uuid;
begin
  if viewer_id is null then
    raise exception 'Authentication is required.';
  end if;

  if target_user_id is null or target_user_id = viewer_id then
    raise exception 'Choose another learner.';
  end if;

  if public.is_social_blocked(viewer_id, target_user_id) then
    raise exception 'This connection is unavailable.';
  end if;

  if exists (
    select 1 from public.friendships
    where user_id = viewer_id and friend_id = target_user_id
  ) then
    return null;
  end if;

  select id into existing_request_id
  from public.friend_requests
  where status = 'pending'
    and (
      (requester_id = viewer_id and recipient_id = target_user_id)
      or (requester_id = target_user_id and recipient_id = viewer_id)
    )
  order by created_at desc
  limit 1;

  if existing_request_id is not null then
    return existing_request_id;
  end if;

  insert into public.friend_requests (requester_id, recipient_id)
  values (viewer_id, target_user_id)
  returning id into existing_request_id;

  return existing_request_id;
end;
$$;

create or replace function public.respond_friend_request(request_id uuid, next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  selected_request public.friend_requests%rowtype;
begin
  if viewer_id is null then
    raise exception 'Authentication is required.';
  end if;

  if next_status not in ('accepted', 'declined') then
    raise exception 'Unsupported request response.';
  end if;

  select *
  into selected_request
  from public.friend_requests
  where id = request_id
    and recipient_id = viewer_id
    and status = 'pending'
  for update;

  if selected_request.id is null then
    raise exception 'Friend request was not found.';
  end if;

  if public.is_social_blocked(selected_request.requester_id, selected_request.recipient_id) then
    raise exception 'This connection is unavailable.';
  end if;

  update public.friend_requests
  set status = next_status,
      responded_at = now()
  where id = request_id;

  if next_status = 'accepted' then
    insert into public.friendships (user_id, friend_id, created_at)
    values
      (selected_request.requester_id, selected_request.recipient_id, now()),
      (selected_request.recipient_id, selected_request.requester_id, now())
    on conflict (user_id, friend_id) do nothing;
  end if;
end;
$$;

create or replace function public.cancel_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null then
    raise exception 'Authentication is required.';
  end if;

  update public.friend_requests
  set status = 'cancelled',
      responded_at = now()
  where id = request_id
    and requester_id = viewer_id
    and status = 'pending';
end;
$$;

create or replace function public.remove_friend(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null then
    raise exception 'Authentication is required.';
  end if;

  delete from public.friendships
  where (user_id = viewer_id and friend_id = target_user_id)
     or (user_id = target_user_id and friend_id = viewer_id);
end;
$$;

create or replace function public.block_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null then
    raise exception 'Authentication is required.';
  end if;

  if target_user_id is null or target_user_id = viewer_id then
    raise exception 'Choose another learner.';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (viewer_id, target_user_id)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from public.friendships
  where (user_id = viewer_id and friend_id = target_user_id)
     or (user_id = target_user_id and friend_id = viewer_id);

  update public.friend_requests
  set status = 'cancelled',
      responded_at = now()
  where status = 'pending'
    and (
      (requester_id = viewer_id and recipient_id = target_user_id)
      or (requester_id = target_user_id and recipient_id = viewer_id)
    );
end;
$$;

create or replace function public.mark_messages_read(sender_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null then
    raise exception 'Authentication is required.';
  end if;

  update public.social_messages
  set read_at = now()
  where sender_id = sender_user_id
    and recipient_id = viewer_id
    and read_at is null
    and deleted_at is null;
end;
$$;

grant usage, select on sequence public.profile_signup_number_seq to authenticated, service_role;
grant select, insert on public.friend_requests to authenticated;
grant select on public.friendships to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant select, insert on public.social_messages to authenticated;
grant update (read_at) on public.social_messages to authenticated;

grant execute on function public.is_social_blocked(uuid, uuid) to authenticated;
grant execute on function public.search_people(text) to authenticated;
grant execute on function public.list_social_connections() to authenticated;
grant execute on function public.list_inbox_items() to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, text) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.mark_messages_read(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'friend_requests'
    ) then
      alter publication supabase_realtime add table public.friend_requests;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'social_messages'
    ) then
      alter publication supabase_realtime add table public.social_messages;
    end if;
  end if;
end;
$$;
