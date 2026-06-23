import {
  buildQuestionEnginePersistenceBundle,
  type BuildQuestionEnginePersistenceBundleInput,
  type QuestionEnginePersistenceBundle,
} from './question-engine/persistence'
import { isSupabaseConfigured, supabase } from './supabase'

const requireClient = () => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Question Engine persistence is unavailable until Supabase is configured.')
  }
  return supabase
}

const upsertRows = async (
  tableName: string,
  rows: Record<string, unknown>[],
  onConflict?: string,
) => {
  if (!rows.length) return
  const client = requireClient()
  const query = onConflict
    ? client.from(tableName).upsert(rows, { onConflict })
    : client.from(tableName).upsert(rows)
  const { error } = await query
  if (error) throw error
}

export const buildQuestionEngineRepositoryBundle = (
  input: BuildQuestionEnginePersistenceBundleInput,
): QuestionEnginePersistenceBundle => buildQuestionEnginePersistenceBundle(input)

export async function saveQuestionEnginePersistenceBundle(
  bundle: QuestionEnginePersistenceBundle,
) {
  await upsertRows('question_items', bundle.questionItemRows as unknown as Record<string, unknown>[])
  await upsertRows(
    'attempt_diagnoses',
    bundle.attemptDiagnosisRows as unknown as Record<string, unknown>[],
    'user_id,idempotency_key',
  )
  await upsertRows(
    'remediation_events',
    bundle.remediationEventRows as unknown as Record<string, unknown>[],
    'user_id,idempotency_key',
  )
  await upsertRows(
    'learner_mastery_vectors',
    bundle.learnerMasteryVectorRows as unknown as Record<string, unknown>[],
    'user_id,exam_track,dimension_type,dimension_id',
  )
  await upsertRows('item_stats', bundle.itemStatsRows as unknown as Record<string, unknown>[])
  await upsertRows(
    'claim_evidence_records',
    bundle.claimEvidenceRecordRows as unknown as Record<string, unknown>[],
    'user_id,idempotency_key',
  )
  await upsertRows(
    'readiness_snapshots',
    [bundle.readinessSnapshotRow] as unknown as Record<string, unknown>[],
    'user_id,exam_track,snapshot_type,snapshot_period_or_session_id,calculation_version',
  )

  return bundle.reconstructionResult
}

export async function loadLatestQuestionEngineReadinessSnapshot(
  userId: string,
  examTrack: string,
  snapshotType = 'learner_dashboard',
) {
  const client = requireClient()
  const { data, error } = await client
    .from('readiness_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('exam_track', examTrack)
    .eq('snapshot_type', snapshotType)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}
