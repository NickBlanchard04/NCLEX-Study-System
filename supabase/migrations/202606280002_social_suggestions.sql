create or replace function public.suggest_people(limit_count integer default 18)
returns table (
  user_id uuid,
  display_name text,
  member_number bigint,
  profile_image_data_url text,
  college text,
  profile_state text,
  friend_status text,
  request_id uuid,
  suggestion_reason text,
  match_score integer
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  safe_limit integer := least(greatest(coalesce(limit_count, 18), 1), 36);
begin
  if viewer_id is null then
    raise exception 'Authentication is required.';
  end if;

  return query
  with viewer_profile as (
    select profiles.id, profiles.nursing_school, profiles.profile_state, profiles.exam_track
    from public.profiles
    where profiles.id = viewer_id
    limit 1
  ),
  ranked_candidates as (
    select
      candidate_profiles.id,
      candidate_profiles.name,
      candidate_profiles.member_number,
      candidate_profiles.preferences ->> 'profileImageDataUrl' as profile_image_data_url,
      candidate_profiles.nursing_school,
      candidate_profiles.profile_state,
      candidate_profiles.exam_track,
      candidate_profiles.created_at,
      (
        case
          when viewer_profile.nursing_school is not null
            and candidate_profiles.nursing_school is not null
            and lower(candidate_profiles.nursing_school) = lower(viewer_profile.nursing_school)
          then 50
          else 0
        end
        + case
          when viewer_profile.profile_state is not null
            and candidate_profiles.profile_state is not null
            and lower(candidate_profiles.profile_state) = lower(viewer_profile.profile_state)
          then 30
          else 0
        end
        + case
          when viewer_profile.exam_track is not null
            and candidate_profiles.exam_track = viewer_profile.exam_track
          then 20
          else 0
        end
        + case
          when candidate_profiles.created_at > now() - interval '21 days'
          then 6
          else 0
        end
      ) as score
    from public.profiles as candidate_profiles
    cross join viewer_profile
    where candidate_profiles.id <> viewer_id
      and candidate_profiles.deleted_at is null
      and candidate_profiles.directory_visible = true
      and not public.is_social_blocked(viewer_id, candidate_profiles.id)
      and not exists (
        select 1
        from public.friendships as existing_friends
        where existing_friends.user_id = viewer_id
          and existing_friends.friend_id = candidate_profiles.id
      )
  )
  select
    ranked_candidates.id,
    ranked_candidates.name,
    ranked_candidates.member_number,
    ranked_candidates.profile_image_data_url,
    nullif(ranked_candidates.nursing_school, '') as college,
    nullif(ranked_candidates.profile_state, '') as profile_state,
    case
      when exists (
        select 1
        from public.friend_requests as outgoing_requests
        where outgoing_requests.requester_id = viewer_id
          and outgoing_requests.recipient_id = ranked_candidates.id
          and outgoing_requests.status = 'pending'
      ) then 'requested'
      when exists (
        select 1
        from public.friend_requests as incoming_requests
        where incoming_requests.requester_id = ranked_candidates.id
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
          (pending_requests.requester_id = viewer_id and pending_requests.recipient_id = ranked_candidates.id)
          or (pending_requests.requester_id = ranked_candidates.id and pending_requests.recipient_id = viewer_id)
        )
      order by pending_requests.created_at desc
      limit 1
    ) as request_id,
    case
      when ranked_candidates.nursing_school is not null
        and exists (
          select 1
          from viewer_profile
          where viewer_profile.nursing_school is not null
            and lower(viewer_profile.nursing_school) = lower(ranked_candidates.nursing_school)
        )
      then 'Same college'
      when ranked_candidates.profile_state is not null
        and exists (
          select 1
          from viewer_profile
          where viewer_profile.profile_state is not null
            and lower(viewer_profile.profile_state) = lower(ranked_candidates.profile_state)
        )
      then 'Nearby'
      when ranked_candidates.exam_track is not null
        and exists (
          select 1
          from viewer_profile
          where viewer_profile.exam_track = ranked_candidates.exam_track
        )
      then 'Same track'
      when ranked_candidates.created_at > now() - interval '21 days'
      then 'New'
      else 'Suggested'
    end as suggestion_reason,
    ranked_candidates.score as match_score
  from ranked_candidates
  order by ranked_candidates.score desc, ranked_candidates.created_at desc, ranked_candidates.name
  limit safe_limit;
end;
$$;

grant execute on function public.suggest_people(integer) to authenticated;
