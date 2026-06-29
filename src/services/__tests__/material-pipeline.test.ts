import { describe, expect, it, vi } from 'vitest'
import type { StudyMaterial } from '../../app/types'
import {
  cleanExtractedStudyText,
  extractMaterialTextFromPastedStudyText,
  extractMaterialTextFromUrl,
  generateCleanFlashcardsFromMaterial,
  generateCleanQuestionsFromMaterial,
} from '../material-pipeline'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
}))

vi.mock('mammoth', () => ({
  extractRawText: vi.fn(),
}))

const makeMaterial = (assets: StudyMaterial['assets']): StudyMaterial => ({
  id: 'material-lab-values',
  filename: 'Pocket-Card_Quick-Guide-to-Laboratory-Values_June_2025.pdf',
  displayTitle: 'Laboratory Values Pocket Card',
  fileType: 'pdf',
  importedAt: '2026-06-23T12:00:00.000Z',
  extractionStatus: 'ready',
  textLength: 1200,
  tags: ['lab values'],
  sourceCategory: 'Lab Values / Clinical Judgment',
  preview: assets.map((asset) => asset.content).join(' '),
  assets,
  generatedFlashcardIds: [],
  generatedQuestionIds: [],
})

describe('material pipeline local generation', () => {
  it('removes source metadata without deleting usable nursing text', () => {
    const cleaned = cleanExtractedStudyText(`
      June 2025 www.nursingcenter.com
      Page 1 of 4

      Platelet count
      result: of bone marrow suppression, sepsis, sequestration from an enlarged spleen, increased platelet destruction, or decreased platelet production.

      Retrieved from https://www.nursingcenter.com/example
    `)

    expect(cleaned).toContain('bone marrow suppression')
    expect(cleaned).toContain('decreased platelet production')
    expect(cleaned).not.toMatch(/www\.|https?:\/\/|june 2025|page 1/i)
  })

  it('generates flashcards from real nursing concepts instead of raw result labels', () => {
    const material = makeMaterial([
      {
        id: 'asset-1',
        materialId: 'material-lab-values',
        title: 'Platelet count',
        content:
          'result: of bone marrow suppression, sepsis, sequestration from an enlarged spleen, increased platelet destruction, or decreased platelet production.',
        order: 0,
      },
    ])

    const cards = generateCleanFlashcardsFromMaterial(material)
    const allCardText = cards.map((card) => `${card.front} ${card.back}`).join(' ')

    expect(cards.length).toBeGreaterThan(0)
    expect(cards[0].front).toMatch(/causes|platelet|thrombocytopenia/i)
    expect(cards[0].back).toMatch(/bone marrow suppression|platelet destruction/i)
    expect(cards[0].back).not.toMatch(/^of\s/i)
    expect(allCardText).not.toMatch(/what should you know about result|uploaded nursing concept|www\.|june 2025/i)
  })

  it('generates editable NCLEX-style questions with concise choices and rationales', () => {
    const material = makeMaterial([
      {
        id: 'asset-1',
        materialId: 'material-lab-values',
        title: 'Platelet count',
        content:
          'result: of bone marrow suppression, sepsis, sequestration from an enlarged spleen, increased platelet destruction, or decreased platelet production.',
        order: 0,
      },
      {
        id: 'asset-2',
        materialId: 'material-lab-values',
        title: 'Total protein',
        content:
          'Total protein 6-8 g/100 mL. Proteins influence the colloid osmotic pressure and help retain fluid in the vascular space.',
        order: 1,
      },
      {
        id: 'asset-3',
        materialId: 'material-lab-values',
        title: 'Potassium',
        content:
          'Hyperkalemia can cause dysrhythmias and muscle weakness, so nurses should prioritize cardiac monitoring and safety assessment.',
        order: 2,
      },
      {
        id: 'asset-4',
        materialId: 'material-lab-values',
        title: 'Infection safety',
        content:
          'Sepsis requires prompt assessment because worsening perfusion and organ dysfunction can develop quickly.',
        order: 3,
      },
    ])
    const flashcards = generateCleanFlashcardsFromMaterial(material)
    const questions = generateCleanQuestionsFromMaterial(material, flashcards)

    expect(questions.length).toBeGreaterThan(0)
    questions.forEach((question) => {
      expect(question.prompt).toMatch(/nurse|which statement|which point/i)
      expect(question.prompt).not.toMatch(
        /best matches this point|what should you know about result|uploaded nursing concept|this study material|www\./i,
      )
      expect(question.choices).toHaveLength(4)
      expect(new Set(question.choices.map((choice) => choice.text))).toHaveProperty('size', 4)
      expect(question.choices.every((choice) => choice.text.length <= 190)).toBe(true)
      expect(question.choices.some((choice) => choice.id === question.correctAnswer[0])).toBe(true)
      expect(question.rationale).toMatch(/reviewed material|unsupported|different study point/i)
      expect(question.rationale).not.toMatch(/www\.|june 2025/i)
    })
  })

  it('uses clinical topic labels instead of file-name placeholders', () => {
    const material = makeMaterial([
      {
        id: 'asset-1',
        materialId: 'material-lab-values',
        title: 'Overview',
        content:
          'Thrombocytopenia means the platelet count is below the expected range. The nurse should assess for petechiae, bruising, bleeding gums, hematuria, melena, and prolonged bleeding.',
        order: 0,
      },
      {
        id: 'asset-2',
        materialId: 'material-lab-values',
        title: 'Overview',
        content:
          'The client should use an electric razor and report black stools, blood in urine, severe headache, or new neurologic changes.',
        order: 1,
      },
    ])
    const flashcards = generateCleanFlashcardsFromMaterial({
      ...material,
      displayTitle: 'smoke material',
      filename: 'smoke-material.txt',
    })
    const questions = generateCleanQuestionsFromMaterial(material, flashcards)
    const generatedText = [
      ...flashcards.map((card) => `${card.front} ${card.back}`),
      ...questions.map((question) => `${question.prompt} ${question.rationale}`),
    ].join(' ')

    expect(generatedText).toMatch(/thrombocytopenia|bleeding risk/i)
    expect(generatedText).not.toMatch(/smoke material|uploaded nursing concept/i)
  })

  it('rejects code-like links before material generation', async () => {
    await expect(
      extractMaterialTextFromUrl('https://github.com/example/project/blob/main/src/questions.ts'),
    ).rejects.toThrow(/source code|software page/i)
  })

  it('rejects readable links that do not look like nursing study material', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(
        new Response(
          'This page describes a software dashboard with routes, components, props, settings, and build scripts for a web application.',
          { headers: { 'content-type': 'text/plain' }, status: 200 },
        ),
      )),
    )

    await expect(
      extractMaterialTextFromUrl('https://example.com/dashboard-notes'),
    ).rejects.toThrow(/nursing study material/i)

    vi.unstubAllGlobals()
  })

  it('cleans Quizlet-style pasted decks into medication study assets', () => {
    const extracted = extractMaterialTextFromPastedStudyText({
      sourceUrl: 'https://quizlet.com/96216077/140-must-know-nclex-meds-flash-cards/',
      text: `
        Quizlet
        Study with Quizlet and memorize flashcards containing terms like
        Acetaminophen
        Monitor total daily dose and teach the client to avoid duplicate products because overdose can cause liver injury.
        Digoxin
        Check apical pulse before giving and monitor for toxicity such as nausea, visual halos, and dysrhythmias.
        Warfarin
        Monitor INR and bleeding precautions; teach the client to report black stools, hematuria, or unusual bruising.
        Upgrade
        Terms in this set (140)
      `,
    })
    const material = makeMaterial(
      extracted.assets.map((asset) => ({ ...asset, materialId: 'material-lab-values' })),
    )
    const flashcards = generateCleanFlashcardsFromMaterial({
      ...material,
      displayTitle: extracted.title,
      fileType: extracted.fileType,
      sourceUrl: extracted.sourceUrl,
      preview: extracted.preview,
    })
    const questions = generateCleanQuestionsFromMaterial(material, flashcards)
    const generatedText = [
      extracted.assets.map((asset) => `${asset.title} ${asset.content}`).join(' '),
      flashcards.map((card) => `${card.front} ${card.back}`).join(' '),
      questions.map((question) => `${question.prompt} ${question.choices.map((choice) => choice.text).join(' ')}`).join(' '),
    ].join(' ')

    expect(extracted.assets.length).toBeGreaterThanOrEqual(3)
    expect(generatedText).toMatch(/acetaminophen|digoxin|warfarin|bleeding precautions|toxicity/i)
    expect(generatedText).not.toMatch(/quizlet|upgrade|terms in this set|study with quizlet/i)
    expect(flashcards.length).toBeGreaterThanOrEqual(3)
    expect(questions.length).toBeGreaterThan(0)
    expect(questions.every((question) => question.choices.length === 4)).toBe(true)
  })

  it('routes blocked Quizlet links to assisted import', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await expect(
      extractMaterialTextFromUrl('https://quizlet.com/96216077/140-must-know-nclex-meds-flash-cards/'),
    ).rejects.toMatchObject({ name: 'MaterialImportBlockedError' })

    vi.unstubAllGlobals()
  })
})
