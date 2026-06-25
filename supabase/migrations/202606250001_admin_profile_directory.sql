create or replace function public.admin_profile_directory(user_ids uuid[] default null)
returns table (
  id uuid,
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
    profiles.id,
    profiles.name,
    profiles.member_number,
    profiles.exam_track,
    nullif(profiles.nursing_school, '') as nursing_school,
    nullif(profiles.profile_state, '') as profile_state,
    profiles.updated_at
  from public.profiles as profiles
  where public.is_admin_user()
    and (user_ids is null or profiles.id = any(user_ids))
    and profiles.deleted_at is null
  order by profiles.updated_at desc nulls last, profiles.name asc
$$;

grant execute on function public.admin_profile_directory(uuid[]) to authenticated;
