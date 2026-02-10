/**
 * scripts/test-title-generation.ts
 * Test script to debug title generation with different LLM providers/models.
 * Run with: npx tsx scripts/test-title-generation.ts
 */

import Together from 'together-ai'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env from project root
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '../.env') })

const SAMPLE_TEXT = `So im Blick. So im Blick. So im Blick. Also etwas haben wir jetzt vorhin noch gesagt. Fürs Protokoll muss ich noch etwas sagen. Fürs Protokoll. Das ist echt mega. Das ist... Und dazu, obwohl du auch, deine Erfahrung, also deine Erfahrung für dich. Das ist unterstützung von dir gefühlt bezüglich mir. Das und das andere ist, dass ich es mega schön gefunden habe, dass du am Konzert dabei gewesen bist. Und eben so vorne gestanden bist und... und dabei gewesen bist. Und auch wenn es nicht alles so jetzt dieses war, dass ich auch dabei gewesen bin. Ja, habe ich wirklich mega geschätzt. Und äh... Und dann ist mir noch mal etwas in den Sinn gekommen. Und was ich auch mega geschätzt habe, dass ich jetzt gerade am Dienstag, als ich so den Abschluss hatte und... das Gefühl hatte, wenn ich mehr etwas mitteilen will oder etwas brauche von dir oder du bist einfach mega da. Du bist sehr präsent. Und dass ich dann den Raum bekomme, um mich mitzuteilen oder zu brüllen oder was auch gerade Emotionen oder was gerade aufkommt. Ja, das ist mega schön.`

const SYSTEM_PROMPT = `Du bist ein Assistent, der prägnante, aussagekräftige Titel für Tagebucheinträge generiert. Der Titel soll kurz (maximal 5-7 Wörter), informativ und ansprechend sein. Antworte NUR mit dem Titel, ohne zusätzliche Erklärungen oder Anführungszeichen.

Datum: 10. Februar 2026
Eintragstyp: Allgemein`

interface TestResult {
  model: string
  provider: string
  title: string
  error?: string
  durationMs: number
}

async function testTogether(modelId: string, maxTokens = 100): Promise<TestResult> {
  const apiKey = process.env.TOGETHERAI_API_KEY
  if (!apiKey) return { model: modelId, provider: 'togetherai', title: '', error: 'TOGETHERAI_API_KEY not set', durationMs: 0 }

  const start = Date.now()
  try {
    const together = new Together({ apiKey })
    const response = await together.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: SAMPLE_TEXT.substring(0, 1000) },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    })
    // Debug: log full response structure
    console.log(`  [DEBUG ${modelId}] choices[0]:`, JSON.stringify(response.choices?.[0], null, 2))
    console.log(`  [DEBUG ${modelId}] usage:`, JSON.stringify(response.usage))
    console.log(`  [DEBUG ${modelId}] finish_reason:`, response.choices?.[0]?.finish_reason)
    const title = response.choices?.[0]?.message?.content?.trim() || ''
    return { model: modelId, provider: 'togetherai', title, durationMs: Date.now() - start }
  } catch (err) {
    return { model: modelId, provider: 'togetherai', title: '', error: String(err), durationMs: Date.now() - start }
  }
}

async function testOpenAI(modelId: string): Promise<TestResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { model: modelId, provider: 'openai', title: '', error: 'OPENAI_API_KEY not set', durationMs: 0 }

  const start = Date.now()
  try {
    const openai = new OpenAI({ apiKey })
    const response = await openai.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: SAMPLE_TEXT.substring(0, 1000) },
      ],
      max_tokens: 100,
      temperature: 0.7,
    })
    const title = response.choices?.[0]?.message?.content?.trim() || ''
    return { model: modelId, provider: 'openai', title, durationMs: Date.now() - start }
  } catch (err) {
    return { model: modelId, provider: 'openai', title: '', error: String(err), durationMs: Date.now() - start }
  }
}

async function main() {
  console.log('=== Title Generation Test ===\n')
  console.log('System prompt:', SYSTEM_PROMPT.substring(0, 80), '...\n')
  console.log('User text (first 100 chars):', SAMPLE_TEXT.substring(0, 100), '...\n')
  console.log('---\n')

  const tests: Promise<TestResult>[] = [
    // Together reasoning models – need high max_tokens for reasoning budget
    testTogether('openai/gpt-oss-120b', 2048),
    testTogether('openai/gpt-oss-20b', 2048),
    // Together non-reasoning models
    testTogether('meta-llama/Llama-3.3-70B-Instruct-Turbo', 100),
    testTogether('Qwen/Qwen2.5-72B-Instruct-Turbo', 100),
    // OpenAI models
    testOpenAI('gpt-4o-mini'),
    testOpenAI('gpt-4.1-nano'),
  ]

  const results = await Promise.allSettled(tests)

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const r = result.value
      const status = r.error ? '❌' : r.title ? '✅' : '⚠️ EMPTY'
      console.log(`${status} [${r.provider}] ${r.model} (${r.durationMs}ms)`)
      if (r.title) console.log(`   Title: "${r.title}"`)
      if (r.error) console.log(`   Error: ${r.error.substring(0, 200)}`)
      console.log()
    } else {
      console.log(`❌ Unexpected error: ${result.reason}`)
    }
  }
}

main().catch(console.error)
