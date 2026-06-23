-- Durable Question Engine persistence foundation.
-- Keeps raw question_attempts as the learner response event and stores auditable
-- diagnosis, remediation, mastery, readiness, item-quality, and claim evidence.

create extension if not exists "pgcrypto";

create table if not exists public.question_items (
  item_id text primary key,
  exam_tracks text[] not null default '{}'::text[],
  content_type text not null default 'standalone_question',
  client_need text not null,
  subcategory text not null,
  clinical_judgment_step text not null,
  nursing_process_step text not null,
  body_system text,
  topic text,
  difficulty text,
  item_type text not null,
  scoring_method text not null,
  priority_frameworks text[] not null default '{}'::text[],
  safety_flags text[] not null default '{}'::text[],
  safety_severity text not null default 'medium',
  source_status text not null default 'source_needed',
  review_status text not null default 'not_reviewed',
  readiness_state text not null default 'draft_only',
  readiness_exclusion_reasons text[] not null default '{}'::text[],
  source_refs jsonb not null default '[]'::jsonb,
  rationale_quality_status text not null default 'basic',
  misconception_tested text,
  distractor_misconceptions jsonb not null default '{}'::jsonb,
  related_flashcard_ids text[] not null default '{}'::text[],
  related_remediation_ids text[] not null default '{}'::text[],
  related_scenario_pack_id text,
  content_hash text,
  metadata_version text not null,
  revision_flag boolean not null default false,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attempt_diagnoses (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  engine_diagnosis_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null references public.question_attempts(id) on delete cascade,
  item_id text not null,
  exam_track text not null,
  selected_answer jsonb not null default '[]'::jsonb,
  selected_distractor_ids text[] not null default '{}'::text[],
  unsafe_extra_selection_ids text[] not null default '{}'::text[],
  is_correct boolean not null default false,
  raw_score numeric not null default 0,
  max_score numeric not null default 0,
  partial_credit_score numeric,
  scoring_method text not null,
  scoring_contract_version text not null,
  scoring_warnings text[] not null default '{}'::text[],
  confidence text not null,
  calibration_score numeric not null default 0,
  confidence_escalated boolean not null default false,
  likely_misconception_id text not null,
  misconception_family text not null,
  misconception_confidence numeric not null default 0,
  diagnosis_source text not null,
  diagnosis_evidence_level text not null,
  learner_copy_certainty text not null,
  performance_band text not null,
  confidence_signal text not null,
  confidence_mismatch boolean not null default false,
  weak_area_dimensions jsonb not null default '[]'::jsonb,
  weak_area_tags text[] not null default '{}'::text[],
  clinical_judgment_step text not null,
  nursing_process_step text not null,
  client_need text not null,
  subcategory text not null,
  item_type text not null,
  safety_severity text not null,
  remediation_route text not null,
  repair_required boolean not null default false,
  counts_toward_readiness boolean not null default false,
  can_show_as_durable_weak_area boolean not null default false,
  can_count_toward_official_readiness boolean not null default false,
  readiness_exclusion_reasons text[] not null default '{}'::text[],
  readiness_state_snapshot text not null,
  item_trust_snapshot jsonb not null,
  diagnosis_version text not null,
  misconception_vocabulary_version text not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, idempotency_key)
);

create table if not exists public.remediation_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  engine_remediation_event_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  trigger_attempt_id uuid not null references public.question_attempts(id) on delete cascade,
  trigger_diagnosis_id uuid references public.attempt_diagnoses(id) on delete set null,
  trigger_engine_diagnosis_id text not null,
  item_id text not null,
  exam_track text not null,
  misconception_id text not null,
  misconception_family text not null,
  safety_severity text not null,
  remediation_route text not null,
  route_label text not null,
  action_type text not null,
  assigned_asset_ids text[] not null default '{}'::text[],
  assigned_repair_item_ids text[] not null default '{}'::text[],
  repair_available boolean not null default false,
  repair_required boolean not null default false,
  repair_completed boolean not null default false,
  repair_success boolean not null default false,
  official_repair_eligible boolean not null default false,
  readiness_repair_eligible boolean not null default false,
  status text not null,
  teaching_status text not null,
  blocked_official_repair_reason text,
  blocked_reasons text[] not null default '{}'::text[],
  repair_outcome text not null,
  transfer_distance text,
  repair_evidence_level text not null,
  repair_item_id text,
  repair_attempt_id uuid references public.question_attempts(id) on delete set null,
  repair_engine_attempt_id text,
  repair_diagnosis_id uuid references public.attempt_diagnoses(id) on delete set null,
  repair_engine_diagnosis_id text,
  repair_item_trust_snapshot jsonb,
  repair_misconception_id text,
  repair_misconception_family text,
  repair_score numeric,
  repair_confidence text,
  repair_calibration_score numeric,
  trigger_confidence text not null,
  trigger_calibration_score numeric not null default 0,
  next_action_copy text not null,
  remediation_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, idempotency_key)
);

create table if not exists public.learner_mastery_vectors (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  vector_version text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_track text not null,
  dimension_type text not null,
  dimension_id text not null,
  evidence_scope text not null,
  attempt_count integer not null default 0,
  trusted_attempt_count integer not null default 0,
  practice_attempt_count integer not null default 0,
  readiness_attempt_count integer not null default 0,
  score_total numeric not null default 0,
  max_score_total numeric not null default 0,
  avg_score numeric not null default 0,
  accuracy numeric not null default 0,
  readiness_accuracy numeric not null default 0,
  avg_calibration_score numeric not null default 0,
  calibration_trend text not null,
  high_confidence_miss_count integer not null default 0,
  low_confidence_correct_count integer not null default 0,
  confidence_mismatch_score numeric not null default 0,
  remediation_assigned_count integer not null default 0,
  remediation_repaired_count integer not null default 0,
  active_repair_count integer not null default 0,
  unresolved_high_severity_count integer not null default 0,
  practice_signal_count integer not null default 0,
  trusted_signal_count integer not null default 0,
  untrusted_signal_count integer not null default 0,
  recurrence_count integer not null default 0,
  exposure_level text not null,
  evidence_level text not null,
  selection_weight numeric not null default 0,
  readiness_weight numeric not null default 0,
  active_exclusion_reasons jsonb not null default '[]'::jsonb,
  source_record_refs jsonb not null default '[]'::jsonb,
  mastery_score numeric not null default 0,
  weakness_score numeric not null default 0,
  mastery_level text not null,
  first_attempt_at timestamptz,
  last_attempt_at timestamptz,
  last_trusted_attempt_at timestamptz,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, exam_track, dimension_type, dimension_id)
);

create table if not exists public.item_stats (
  item_id text primary key,
  attempt_count integer not null default 0,
  readiness_attempt_count integer not null default 0,
  percent_correct numeric not null default 0,
  avg_time_seconds numeric not null default 0,
  most_selected_distractor_id text,
  distractor_distribution jsonb not null default '{}'::jsonb,
  high_confidence_miss_rate numeric not null default 0,
  low_confidence_correct_rate numeric not null default 0,
  avg_calibration_score numeric not null default 0,
  calibration_state text not null default 'uncalibrated',
  difficulty_source text not null default 'authored_estimate',
  observed_difficulty_band text not null default 'insufficient_volume',
  scoring_stability text not null default 'insufficient_metadata',
  exposure_count_recent integer not null default 0,
  exposure_cap_status text not null default 'not_tracked',
  calibration_blocked_reasons text[] not null default '{}'::text[],
  discrimination_notes text,
  revision_flag boolean not null default false,
  revision_reason text,
  analytics_review_status text not null default 'insufficient_volume',
  quality_flags jsonb not null default '[]'::jsonb,
  quality_severity text not null default 'low',
  review_packet_version text,
  reviewer_decision text,
  reviewer_notes text,
  reviewed_by text,
  last_analytics_reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  snapshot_version text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_track text not null,
  snapshot_type text not null,
  snapshot_scope text not null,
  snapshot_period_or_session_id text not null,
  readiness_band text not null,
  readiness_score numeric,
  readiness_score_available boolean not null default false,
  trusted_attempt_count integer not null default 0,
  practice_attempt_count integer not null default 0,
  excluded_attempt_count integer not null default 0,
  trusted_item_count integer not null default 0,
  practice_item_count integer not null default 0,
  evidence_requirements_met boolean not null default false,
  exclusion_counts jsonb not null default '{}'::jsonb,
  top_weak_dimensions jsonb not null default '[]'::jsonb,
  top_confidence_risks jsonb not null default '[]'::jsonb,
  remediation_summary jsonb not null default '{}'::jsonb,
  session_summary jsonb not null default '{}'::jsonb,
  quality_metric_summary jsonb not null default '{}'::jsonb,
  content_trust_summary jsonb not null default '{}'::jsonb,
  coverage_summary jsonb not null default '{}'::jsonb,
  confidence_calibration_summary jsonb not null default '{}'::jsonb,
  safety_recovery_summary jsonb not null default '{}'::jsonb,
  coverage_gaps jsonb not null default '[]'::jsonb,
  clinical_judgment_balance numeric not null default 0,
  coverage_requirements_met boolean not null default false,
  claim_evidence_record_ids text[] not null default '{}'::text[],
  required_claims_present boolean not null default false,
  reconstruction_status text not null default 'pending',
  blocked_reasons text[] not null default '{}'::text[],
  learner_copy_keys text[] not null default '{}'::text[],
  school_reporting_allowed boolean not null default false,
  fallback_to_overall_accuracy boolean not null default false,
  show_practice_progress_separately boolean not null default true,
  calculation_version text not null,
  calculation_versions jsonb not null default '{}'::jsonb,
  next_best_action text not null,
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, exam_track, snapshot_type, snapshot_period_or_session_id, calculation_version)
);

create table if not exists public.claim_evidence_records (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  claim_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  exam_track text not null,
  claim_category text not null,
  claim_surface text not null,
  claim_text_key text not null,
  claim_strength text not null,
  trust_label text not null,
  evidence_record_refs jsonb not null default '[]'::jsonb,
  required_records_present boolean not null default false,
  item_trust_summary jsonb not null default '{}'::jsonb,
  reconstruction_status text not null default 'pending',
  blocked_reasons text[] not null default '{}'::text[],
  can_show_to_learner boolean not null default false,
  can_show_to_school boolean not null default false,
  can_count_toward_official_readiness boolean not null default false,
  calculation_versions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  deleted_at timestamptz,
  unique (user_id, idempotency_key)
);

create index if not exists question_items_readiness_track_idx
  on public.question_items (readiness_state)
  where retired_at is null;
create index if not exists question_items_exam_tracks_gin_idx
  on public.question_items using gin (exam_tracks);
create index if not exists question_items_client_need_idx
  on public.question_items (client_need, subcategory);
create index if not exists question_items_clinical_judgment_idx
  on public.question_items (clinical_judgment_step);
create index if not exists question_items_misconception_idx
  on public.question_items (misconception_tested);
create index if not exists question_items_safety_flags_gin_idx
  on public.question_items using gin (safety_flags);

create index if not exists attempt_diagnoses_user_created_idx
  on public.attempt_diagnoses (user_id, created_at desc)
  where deleted_at is null;
create index if not exists attempt_diagnoses_user_track_created_idx
  on public.attempt_diagnoses (user_id, exam_track, created_at desc)
  where deleted_at is null;
create index if not exists attempt_diagnoses_user_misconception_idx
  on public.attempt_diagnoses (user_id, likely_misconception_id)
  where deleted_at is null;
create index if not exists attempt_diagnoses_user_cj_idx
  on public.attempt_diagnoses (user_id, clinical_judgment_step)
  where deleted_at is null;
create index if not exists attempt_diagnoses_user_readiness_idx
  on public.attempt_diagnoses (user_id, counts_toward_readiness)
  where deleted_at is null;
create index if not exists attempt_diagnoses_attempt_id_idx
  on public.attempt_diagnoses (attempt_id)
  where deleted_at is null;

create index if not exists remediation_events_user_status_idx
  on public.remediation_events (user_id, status, created_at desc)
  where deleted_at is null;
create index if not exists remediation_events_user_misconception_idx
  on public.remediation_events (user_id, misconception_id)
  where deleted_at is null;
create index if not exists remediation_events_user_trigger_diagnosis_idx
  on public.remediation_events (user_id, trigger_engine_diagnosis_id)
  where deleted_at is null;
create index if not exists remediation_events_user_repair_success_idx
  on public.remediation_events (user_id, repair_success)
  where deleted_at is null;
create index if not exists remediation_events_trigger_attempt_idx
  on public.remediation_events (trigger_attempt_id)
  where deleted_at is null;

create index if not exists learner_mastery_vectors_user_mastery_idx
  on public.learner_mastery_vectors (user_id, exam_track, mastery_score)
  where deleted_at is null;
create index if not exists learner_mastery_vectors_user_confidence_idx
  on public.learner_mastery_vectors (user_id, dimension_type, confidence_mismatch_score)
  where deleted_at is null;

create index if not exists item_stats_revision_confidence_idx
  on public.item_stats (revision_flag, high_confidence_miss_rate);
create index if not exists item_stats_reviewed_idx
  on public.item_stats (last_analytics_reviewed_at);
create index if not exists item_stats_readiness_attempts_idx
  on public.item_stats (readiness_attempt_count);
create index if not exists item_stats_calibration_idx
  on public.item_stats (calibration_state, observed_difficulty_band);

create index if not exists readiness_snapshots_user_track_created_idx
  on public.readiness_snapshots (user_id, exam_track, created_at desc)
  where deleted_at is null;
create index if not exists readiness_snapshots_user_type_created_idx
  on public.readiness_snapshots (user_id, snapshot_type, created_at desc)
  where deleted_at is null;

create index if not exists claim_evidence_records_user_track_created_idx
  on public.claim_evidence_records (user_id, exam_track, created_at desc)
  where deleted_at is null;
create index if not exists claim_evidence_records_claim_id_idx
  on public.claim_evidence_records (claim_id)
  where deleted_at is null;
create index if not exists claim_evidence_records_category_surface_idx
  on public.claim_evidence_records (claim_category, claim_surface)
  where deleted_at is null;
create index if not exists claim_evidence_records_reconstruction_idx
  on public.claim_evidence_records (reconstruction_status)
  where deleted_at is null;

alter table public.question_items enable row level security;
alter table public.attempt_diagnoses enable row level security;
alter table public.remediation_events enable row level security;
alter table public.learner_mastery_vectors enable row level security;
alter table public.item_stats enable row level security;
alter table public.readiness_snapshots enable row level security;
alter table public.claim_evidence_records enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'question_items'
      and policyname = 'question items learner read active'
  ) then
    create policy "question items learner read active"
      on public.question_items
      for select
      to authenticated
      using (readiness_state <> 'retired' and retired_at is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'attempt_diagnoses'
      and policyname = 'attempt diagnoses owner all'
  ) then
    create policy "attempt diagnoses owner all"
      on public.attempt_diagnoses
      for all
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'remediation_events'
      and policyname = 'remediation events owner all'
  ) then
    create policy "remediation events owner all"
      on public.remediation_events
      for all
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'learner_mastery_vectors'
      and policyname = 'learner mastery vectors owner all'
  ) then
    create policy "learner mastery vectors owner all"
      on public.learner_mastery_vectors
      for all
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'readiness_snapshots'
      and policyname = 'readiness snapshots owner all'
  ) then
    create policy "readiness snapshots owner all"
      on public.readiness_snapshots
      for all
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'claim_evidence_records'
      and policyname = 'claim evidence records owner all'
  ) then
    create policy "claim evidence records owner all"
      on public.claim_evidence_records
      for all
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;
