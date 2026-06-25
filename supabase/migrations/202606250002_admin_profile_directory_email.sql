drop function if exists public.admin_profile_directory(uuid[]);

create or replace function public.admin_profile_directory(user_ids uuid[] default null)
returns table (
  id uuid,
  email text,
  name text,
  member_number integer,
  exam_track text,
  nursing_school text,
  profile_state text,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    users.id,
    users.email,
    profiles.name,
    profiles.member_number,
    profiles.exam_track,
    nullif(profiles.nursing_school, '') as nursing_school,
    nullif(profiles.profile_state, '') as profile_state,
    coalesce(profiles.updated_at, users.updated_at) as updated_at
  from auth.users as users
  left join public.profiles as profiles
    on profiles.id = users.id
  where public.is_admin_user()
    and (user_ids is null or users.id = any(user_ids))
    and (profiles.deleted_at is null or profiles.id is null)
  order by coalesce(profiles.updated_at, users.updated_at) desc nulls last, coalesce(profiles.name, users.email) asc
$$;

grant execute on function public.admin_profile_directory(uuid[]) to authenticated;
