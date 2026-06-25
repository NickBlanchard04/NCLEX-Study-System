create extension if not exists "pgcrypto";

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'analyst')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and status = 'active'
  );
$$;

create policy "admin users self select"
on public.admin_users
for select
to authenticated
using ((select auth.uid()) = user_id);

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_user_id text not null,
  session_id text not null,
  event_name text not null check (
    event_name in (
      'page_view',
      'demo_started',
      'signup_started',
      'signup_completed',
      'onboarding_started',
      'onboarding_completed',
      'exam_track_selected',
      'feature_opened',
      'quiz_started',
      'question_answered',
      'confidence_selected',
      'rationale_opened',
      'quiz_completed',
      'weak_area_opened',
      'study_plan_opened',
      'flashcard_reviewed',
      'material_upload_started',
      'material_upload_completed',
      'material_upload_failed',
      'note_created',
      'feedback_opened',
      'feedback_submitted',
      'pricing_viewed',
      'external_cta_clicked'
    )
  ),
  page_path text not null default '/',
  source text,
  campaign text,
  exam_track text check (exam_track is null or exam_track in ('nclex-rn', 'nclex-pn', 'teas', 'fnp', 'ccma')),
  feature_name text,
  question_category text,
  question_result text check (question_result is null or question_result in ('correct', 'incorrect')),
  confidence_level text check (confidence_level is null or confidence_level in ('low', 'medium', 'high')),
  time_spent_seconds integer check (time_spent_seconds is null or time_spent_seconds >= 0),
  is_demo_user boolean not null default false,
  device_type text not null default 'desktop' check (device_type in ('desktop', 'tablet', 'mobile')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists app_events_created_idx
on public.app_events (created_at desc);

create index if not exists app_events_user_created_idx
on public.app_events (user_id, created_at desc)
where user_id is not null;

create index if not exists app_events_anon_created_idx
on public.app_events (anonymous_user_id, created_at desc);

create index if not exists app_events_event_created_idx
on public.app_events (event_name, created_at desc);

create index if not exists app_events_feature_created_idx
on public.app_events (feature_name, created_at desc)
where feature_name is not null;

create index if not exists app_events_source_campaign_created_idx
on public.app_events (source, campaign, created_at desc)
where source is not null;

alter table public.app_events enable row level security;

create policy "app events public insert"
on public.app_events
for insert
to anon, authenticated
with check (user_id is null or (select auth.uid()) = user_id);

create policy "app events owner or admin select"
on public.app_events
for select
to authenticated
using (
  ((select auth.uid()) = user_id)
  or public.is_admin_user()
);

grant select on public.admin_users to authenticated;
grant execute on function public.is_admin_user() to authenticated;
grant insert, select on public.app_events to anon, authenticated;
