type MaterialPayload = {
  assets?: Array<{ content?: string; title?: string }>
  displayTitle?: string
  fileType?: string
  filename?: string
  id?: string
  preview?: string
  sourceCategory?: string
}

type GeneratedFlashcard = {
  back: string
  front: string
}

type GeneratedQuestion = {
  choices: Array<{ id: string; text: string }>
  correctAnswer: string[]
  prompt: string
  rationale: string
}

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  })

const clean = (value: string) => value.replace(/\s+/g, ' ').trim()

const getOutputText = (response: Record<string, unknown>) => {
  if (typeof response.output_text === 'string') return response.output_text

  const output = Array.isArray(response.output) ? response.output : []
  return output
    .flatMap((item) => (typeof item === 'object' && item && 'content' in item ? item.content : []))
    .flatMap((content) => (Array.isArray(content) ? content : []))
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      if ('text' in part && typeof part.text === 'string') return part.text
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

const getGeminiOutputText = (response: Record<string, unknown>) => {
  const candidates = Array.isArray(response.candidates) ? response.candidates : []
  return candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== 'object' || !('content' in candidate)) return []
      const content = candidate.content
      if (!content || typeof content !== 'object' || !('parts' in content)) return []
      return Array.isArray(content.parts) ? content.parts : []
    })
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      if ('text' in part && typeof part.text === 'string') return part.text
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

const parseGeneratedJson = (text: string) => {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  return JSON.parse(trimmed) as {
    flashcards?: GeneratedFlashcard[]
    questions?: GeneratedQuestion[]
    warnings?: string[]
  }
}

const makeSourceText = (material: MaterialPayload) => {
  const assetText = (material.assets ?? [])
    .map((asset, index) => {
      const title = clean(asset.title ?? `Section ${index + 1}`)
      const content = clean(asset.content ?? '')
      return title && content ? `${title}\n${content}` : content
    })
    .filter(Boolean)
    .join('\n\n')

  return clean(`${material.displayTitle ?? material.filename ?? 'Uploaded material'}\n\n${material.preview ?? ''}\n\n${assetText}`).slice(0, 24000)
}

const normalizeFlashcards = (
  flashcards: GeneratedFlashcard[] | undefined,
  material: MaterialPayload,
) =>
  (flashcards ?? [])
    .filter((card) => clean(card.front).length >= 12 && clean(card.back).length >= 24)
    .slice(0, 12)
    .map((card) => ({
      id: crypto.randomUUID(),
      sourceMaterialId: material.id ?? crypto.randomUUID(),
      sourceTitle: material.displayTitle ?? material.filename ?? 'Uploaded material',
      front: clean(card.front).slice(0, 180),
      back: clean(card.back).slice(0, 520),
      status: 'new',
      createdAt: new Date().toISOString(),
    }))

const normalizeQuestions = (
  questions: GeneratedQuestion[] | undefined,
  material: MaterialPayload,
) =>
  (questions ?? [])
    .filter((question) => {
      const choices = question.choices ?? []
      return clean(question.prompt).length >= 40 && choices.length === 4 && clean(question.rationale).length >= 45
    })
    .slice(0, 8)
    .map((question) => {
      const choices = question.choices.slice(0, 4).map((choice, index) => ({
        id: ['A', 'B', 'C', 'D'][index],
        text: clean(choice.text).slice(0, 220),
      }))
      const acceptedIds = new Set(choices.map((choice) => choice.id))
      const correctId = question.correctAnswer.find((id) => acceptedIds.has(id)) ?? choices[0]?.id ?? 'A'

      return {
        id: crypto.randomUUID(),
        sourceMaterialId: material.id ?? crypto.randomUUID(),
        sourceTitle: material.displayTitle ?? material.filename ?? 'Uploaded material',
        prompt: clean(question.prompt).slice(0, 360),
        choices,
        correctAnswer: [correctId],
        rationale: clean(question.rationale).slice(0, 700),
        createdAt: new Date().toISOString(),
      }
    })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'Authentication required.' }, 401)
  }

  const provider = (Deno.env.get('AI_PROVIDER') ?? (Deno.env.get('GEMINI_API_KEY') ? 'gemini' : 'openai')).toLowerCase()
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (provider === 'gemini' && !geminiApiKey) {
    return json({ error: 'Gemini generation is not configured.' }, 503)
  }
  if (provider !== 'gemini' && !openAiApiKey) {
    return json({ error: 'AI generation is not configured.' }, 503)
  }

  const body = await request.json().catch(() => null) as null | {
    material?: MaterialPayload
    requestedCounts?: { flashcards?: number; questions?: number }
  }
  const material = body?.material
  if (!material?.id || !(material.assets?.length || material.preview)) {
    return json({ error: 'Material content is required.' }, 400)
  }

  const sourceText = makeSourceText(material)
  const flashcardCount = Math.min(Math.max(body?.requestedCounts?.flashcards ?? 12, 1), 12)
  const questionCount = Math.min(Math.max(body?.requestedCounts?.questions ?? 8, 1), 8)

  const prompt = [
    'Create editable NCLEX-style study tools from the uploaded nursing material.',
    'Return only valid JSON with this shape:',
    '{"flashcards":[{"front":"...","back":"..."}],"questions":[{"prompt":"...","choices":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"correctAnswer":["A"],"rationale":"..."}],"warnings":["..."]}',
    `Create up to ${flashcardCount} flashcards and ${questionCount} single-answer questions.`,
    'Rules: use only the material, remove source footers/URLs/dates, avoid raw fragments, keep choices concise, write nursing judgment stems, and include rationales.',
    'Do not use the file name, URL slug, "uploaded nursing concept", "this material", "result", or source title as the clinical topic. Name the actual nursing concept, finding, action, risk, or teaching point.',
    `Material:\n${sourceText}`,
  ].join('\n\n')

  let generated: ReturnType<typeof parseGeneratedJson>

  if (provider === 'gemini') {
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey!,
        },
        method: 'POST',
      },
    )

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.json().catch(() => null) as null | {
        error?: { code?: number; message?: string; status?: string }
      }
      return json(
        {
          error: 'Gemini generation failed.',
          geminiStatus: geminiResponse.status,
          geminiCode: errorBody?.error?.code ?? null,
          geminiReason: errorBody?.error?.status ?? null,
        },
        502,
      )
    }

    const geminiJson = await geminiResponse.json() as Record<string, unknown>
    try {
      generated = parseGeneratedJson(getGeminiOutputText(geminiJson))
    } catch {
      return json({ error: 'Gemini generation returned invalid study-tool JSON.' }, 502)
    }
  } else {
    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'
    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      body: JSON.stringify({
        input: prompt,
        model,
        temperature: 0.2,
      }),
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    if (!openAiResponse.ok) {
      const errorBody = await openAiResponse.json().catch(() => null) as null | {
        error?: { code?: string; type?: string }
      }
      return json(
        {
          error: 'AI generation failed.',
          openaiStatus: openAiResponse.status,
          openaiCode: errorBody?.error?.code ?? null,
          openaiType: errorBody?.error?.type ?? null,
        },
        502,
      )
    }

    const openAiJson = await openAiResponse.json() as Record<string, unknown>
    try {
      generated = parseGeneratedJson(getOutputText(openAiJson))
    } catch {
      return json({ error: 'AI generation returned invalid study-tool JSON.' }, 502)
    }
  }

  return json({
    flashcards: normalizeFlashcards(generated.flashcards, material),
    questions: normalizeQuestions(generated.questions, material),
    warnings: generated.warnings ?? [],
  })
})
