import type { MaterialFlashcard, MaterialQuestion, StudyMaterial } from '../app/types'
import { isSupabaseConfigured, supabase } from './supabase'

interface GeneratedMaterialTools {
  flashcards: MaterialFlashcard[]
  questions: MaterialQuestion[]
  warnings?: string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isGeneratedMaterialTools = (value: unknown): value is GeneratedMaterialTools => {
  if (!isRecord(value)) return false
  return Array.isArray(value.flashcards) && Array.isArray(value.questions)
}

const slimMaterialPayload = (material: StudyMaterial) => ({
  id: material.id,
  displayTitle: material.displayTitle,
  filename: material.filename,
  fileType: material.fileType,
  sourceCategory: material.sourceCategory,
  preview: material.preview.slice(0, 3000),
  assets: material.assets.slice(0, 18).map((asset) => ({
    title: asset.title,
    content: asset.content.slice(0, 2500),
  })),
})

export async function generateMaterialToolsWithAi(
  material: StudyMaterial,
): Promise<GeneratedMaterialTools | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) return null

  const { data, error } = await supabase.functions.invoke('generate-material-tools', {
    body: {
      material: slimMaterialPayload(material),
      requestedCounts: {
        flashcards: 12,
        questions: 8,
      },
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (error || !isGeneratedMaterialTools(data)) return null

  return data
}
