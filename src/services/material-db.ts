import { openDB } from 'idb'
import type {
  MaterialFlashcard,
  MaterialQuestion,
  StudyMaterial,
} from '../app/types'

const MATERIAL_DB_NAME = 'nclex-study-system-materials'
const MATERIAL_DB_VERSION = 1

const getDb = () =>
  openDB(MATERIAL_DB_NAME, MATERIAL_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('materials')) {
        db.createObjectStore('materials', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('material-flashcards')) {
        const store = db.createObjectStore('material-flashcards', { keyPath: 'id' })
        store.createIndex('sourceMaterialId', 'sourceMaterialId')
      }

      if (!db.objectStoreNames.contains('material-questions')) {
        const store = db.createObjectStore('material-questions', { keyPath: 'id' })
        store.createIndex('sourceMaterialId', 'sourceMaterialId')
      }
    },
  })

export interface MaterialBundle {
  material: StudyMaterial
  flashcards: MaterialFlashcard[]
  questions: MaterialQuestion[]
}

export async function saveMaterialBundle(bundle: MaterialBundle) {
  const db = await getDb()
  const tx = db.transaction(['materials', 'material-flashcards', 'material-questions'], 'readwrite')

  await tx.objectStore('materials').put(bundle.material)

  const flashcardStore = tx.objectStore('material-flashcards')
  const flashcardIndex = flashcardStore.index('sourceMaterialId')
  const existingFlashcards = await flashcardIndex.getAllKeys(bundle.material.id)
  await Promise.all(existingFlashcards.map((key) => flashcardStore.delete(key)))
  await Promise.all(bundle.flashcards.map((item) => flashcardStore.put(item)))

  const questionStore = tx.objectStore('material-questions')
  const questionIndex = questionStore.index('sourceMaterialId')
  const existingQuestions = await questionIndex.getAllKeys(bundle.material.id)
  await Promise.all(existingQuestions.map((key) => questionStore.delete(key)))
  await Promise.all(bundle.questions.map((item) => questionStore.put(item)))

  await tx.done
}

export async function getMaterialLibrary() {
  const db = await getDb()
  return db.getAll('materials')
}

export async function getMaterialFlashcards(materialId?: string) {
  const db = await getDb()
  if (!materialId) {
    return db.getAll('material-flashcards')
  }
  return db.getAllFromIndex('material-flashcards', 'sourceMaterialId', materialId)
}

export async function getMaterialQuestions(materialId?: string) {
  const db = await getDb()
  if (!materialId) {
    return db.getAll('material-questions')
  }
  return db.getAllFromIndex('material-questions', 'sourceMaterialId', materialId)
}

export async function deleteMaterialBundle(materialId: string) {
  const db = await getDb()
  const tx = db.transaction(['materials', 'material-flashcards', 'material-questions'], 'readwrite')

  await tx.objectStore('materials').delete(materialId)

  const flashcardStore = tx.objectStore('material-flashcards')
  const flashcardKeys = await flashcardStore.index('sourceMaterialId').getAllKeys(materialId)
  await Promise.all(flashcardKeys.map((key) => flashcardStore.delete(key)))

  const questionStore = tx.objectStore('material-questions')
  const questionKeys = await questionStore.index('sourceMaterialId').getAllKeys(materialId)
  await Promise.all(questionKeys.map((key) => questionStore.delete(key)))

  await tx.done
}

export async function updateStudyMaterialMeta(
  materialId: string,
  updates: Partial<StudyMaterial>,
) {
  const db = await getDb()
  const current = await db.get('materials', materialId)
  if (!current) return null
  const next = { ...current, ...updates }
  await db.put('materials', next)
  return next
}

export async function updateMaterialFlashcard(
  flashcardId: string,
  updates: Partial<MaterialFlashcard>,
) {
  const db = await getDb()
  const current = await db.get('material-flashcards', flashcardId)
  if (!current) return null
  const next = { ...current, ...updates }
  await db.put('material-flashcards', next)
  return next
}
