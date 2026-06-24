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
        select 1
        from public.friendships as friend_matches
        where friend_matches.user_id = viewer_id
          and friend_matches.friend_id = matches.id
      ) then 'friends'
      when exists (
        select 1
        from public.friend_requests as outgoing_requests
        where outgoing_requests.requester_id = viewer_id
          and outgoing_requests.recipient_id = matches.id
          and outgoing_requests.status = 'pending'
      ) then 'requested'
      when exists (
        select 1
        from public.friend_requests as incoming_requests
        where incoming_requests.requester_id = matches.id
          and incoming_requests.recipient_id = viewer_id
          and incoming_requests.status = 'pending'
      ) then 'incoming'
      else 'none'
    end as friend_status,
    (
      select pending_requests.id
      from public.friend_requests as pending_requests
      where pending_requests.status = 'pending'
        and (
          (pending_requests.requester_id = viewer_id and pending_requests.recipient_id = matches.id)
          or (pending_requests.requester_id = matches.id and pending_requests.recipient_id = viewer_id)
        )
      order by pending_requests.created_at desc
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
  select
    social_connections.connection_type,
    social_connections.request_id,
    social_connections.user_id,
    social_connections.display_name,
    social_connections.member_number,
    social_connections.profile_image_data_url,
    social_connections.college,
    social_connections.profile_state,
    social_connections.created_at,
    social_connections.status
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
  ) as social_connections
  order by social_connections.created_at desc;
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
  select
    inbox_items.item_type,
    inbox_items.item_id,
    inbox_items.user_id,
    inbox_items.display_name,
    inbox_items.profile_image_data_url,
    inbox_items.preview,
    inbox_items.created_at,
    inbox_items.request_status
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
  order by inbox_items.created_at desc
  limit 50;
end;
$$;

grant execute on function public.search_people(text) to authenticated;
grant execute on function public.list_social_connections() to authenticated;
grant execute on function public.list_inbox_items() to authenticated;
