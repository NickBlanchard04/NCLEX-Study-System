-- NCLEX Study System SaaS foundation.
-- Run this in Supabase SQL editor or through the Supabase CLI.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Future RN',
  exam_track text not null default 'nclex-rn',
  exam_date date not null default (current_date + interval '90 days'),
  study_intensity text not null default 'steady',
  daily_goal integer not null default 20,
  streak integer not null default 0,
  preferences jsonb not null default '{"reducedMotion":false,"notifications":true,"analyticsScope":"selected-track"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  exam_track text not null default 'nclex-rn',
  selected_answer jsonb not null default '[]'::jsonb,
  is_correct boolean not null default false,
  confidence text not null,
  time_spent_sec integer not null default 0,
  flagged boolean not null default false,
  completed_at timestamptz not null,
  session_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'General',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.flashcard_reviews (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_id text not null,
  status text not null default 'new',
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  lapses integer not null default 0,
  interval_days integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, flashcard_id)
);

create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.material_flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_material_id uuid not null,
  flashcard jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.material_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_material_id uuid not null,
  question jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.material_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid not null,
  session jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  operation text not null,
  payload jsonb,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists question_attempts_user_completed_idx on public.question_attempts (user_id, completed_at desc) where deleted_at is null;
create index if not exists question_attempts_user_track_idx on public.question_attempts (user_id, exam_track) where deleted_at is null;
create index if not exists notes_user_updated_idx on public.notes (user_id, updated_at desc) where deleted_at is null;
create index if not exists flashcard_reviews_user_due_idx on public.flashcard_reviews (user_id, next_review_at) where deleted_at is null;
create index if not exists study_materials_user_updated_idx on public.study_materials (user_id, updated_at desc) where deleted_at is null;
create index if not exists material_flashcards_source_idx on public.material_flashcards (user_id, source_material_id) where deleted_at is null;
create index if not exists material_questions_source_idx on public.material_questions (user_id, source_material_id) where deleted_at is null;

alter table public.profiles enable row level security;
alter table public.question_attempts enable row level security;
alter table public.notes enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.study_materials enable row level security;
alter table public.material_flashcards enable row level security;
alter table public.material_questions enable row level security;
alter table public.material_quiz_sessions enable row level security;
alter table public.sync_events enable row level security;

create policy "profiles owner select" on public.profiles for select using (auth.uid() = id);
create policy "profiles owner insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles owner update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "attempts owner all" on public.question_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes owner all" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "flashcard reviews owner all" on public.flashcard_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "materials owner all" on public.study_materials for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "material flashcards owner all" on public.material_flashcards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "material questions owner all" on public.material_questions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "material quiz sessions owner all" on public.material_quiz_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sync events owner all" on public.sync_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('study-materials', 'study-materials', false)
on conflict (id) do nothing;

create policy "study material files owner read" on storage.objects
  for select using (bucket_id = 'study-materials' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "study material files owner write" on storage.objects
  for insert with check (bucket_id = 'study-materials' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "study material files owner update" on storage.objects
  for update using (bucket_id = 'study-materials' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'study-materials' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "study material files owner delete" on storage.objects
  for delete using (bucket_id = 'study-materials' and auth.uid()::text = (storage.foldername(name))[1]);
