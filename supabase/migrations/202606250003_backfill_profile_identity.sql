-- Backfill profile identity for existing beta accounts.
-- This prefers existing profile values, then auth metadata, and finally a known account override.

update public.profiles as profiles
set
  name = coalesce(
    nullif(profiles.name, ''),
    nullif(users.raw_user_meta_data ->> 'name', ''),
    nullif(users.raw_user_meta_data ->> 'full_name', ''),
    nullif(users.raw_user_meta_data ->> 'display_name', '')
  ),
  nursing_school = coalesce(
    nullif(profiles.nursing_school, ''),
    nullif(users.raw_user_meta_data ->> 'nursing_school', ''),
    nullif(users.raw_user_meta_data ->> 'school', ''),
    nullif(users.raw_user_meta_data ->> 'organization', '')
  ),
  exam_track = coalesce(
    nullif(profiles.exam_track, ''),
    nullif(users.raw_user_meta_data ->> 'exam_track', ''),
    'nclex-rn'
  ),
  updated_at = now()
from auth.users as users
where profiles.id = users.id
  and (
    profiles.name is null
    or profiles.name = ''
    or profiles.nursing_school is null
    or profiles.nursing_school = ''
    or profiles.exam_track is null
    or profiles.exam_track = ''
  );

update public.profiles as profiles
set
  name = 'Nick Blanchard',
  nursing_school = 'The King''s School of Hadley NY',
  exam_track = coalesce(nullif(profiles.exam_track, ''), 'nclex-rn'),
  updated_at = now()
from auth.users as users
where profiles.id = users.id
  and lower(users.email) = 'nblanchard@kingsschool.info';
