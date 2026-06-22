-- Persist optional Question Engine evidence on attempts.
-- Existing attempts remain valid; these columns are populated by newer app clients.

alter table public.question_attempts
  add column if not exists engine_diagnosis jsonb,
  add column if not exists engine_remediation_events jsonb not null default '[]'::jsonb;

create index if not exists question_attempts_engine_readiness_idx
  on public.question_attempts ((engine_diagnosis ->> 'countsTowardReadiness'))
  where deleted_at is null;
