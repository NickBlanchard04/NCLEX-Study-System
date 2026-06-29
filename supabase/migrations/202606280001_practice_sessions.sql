create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('practice', 'quick-study', 'test', 'clinical-thinking')),
  exam_track text not null default 'nclex-rn',
  title text not null,
  subtitle text not null,
  question_ids jsonb not null default '[]'::jsonb,
  current_index integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  started_at timestamptz not null,
  ended_at timestamptz,
  score numeric,
  status text not null default 'active' check (status in ('active', 'completed', 'discarded')),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.practice_session_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  question_id text not null,
  selected_answer jsonb not null default '[]'::jsonb,
  is_correct boolean not null default false,
  confidence text,
  time_spent_sec integer not null default 0,
  flagged boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, session_id, question_id)
);

alter table public.question_attempts
  add column if not exists session_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'question_attempts_session_id_fkey'
      and conrelid = 'public.question_attempts'::regclass
  ) then
    alter table public.question_attempts
      add constraint question_attempts_session_id_fkey
      foreign key (session_id) references public.practice_sessions(id) on delete set null;
  end if;
end $$;

create index if not exists practice_sessions_user_status_idx
  on public.practice_sessions (user_id, status, updated_at desc)
  where deleted_at is null;

create index if not exists practice_sessions_user_started_idx
  on public.practice_sessions (user_id, started_at desc)
  where deleted_at is null;

create index if not exists practice_session_responses_session_idx
  on public.practice_session_responses (user_id, session_id)
  where deleted_at is null;

create index if not exists question_attempts_user_session_idx
  on public.question_attempts (user_id, session_id)
  where deleted_at is null and session_id is not null;

alter table public.practice_sessions enable row level security;
alter table public.practice_session_responses enable row level security;

drop policy if exists "practice sessions owner all" on public.practice_sessions;
create policy "practice sessions owner all" on public.practice_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "practice session responses owner all" on public.practice_session_responses;
create policy "practice session responses owner all" on public.practice_session_responses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
