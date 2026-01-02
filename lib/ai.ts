import Together from 'together-ai'
import OpenAI from 'openai'
import { inferProvider, getApiKeyForProvider, type LLMProvider } from '@/lib/llmModels'

/**
 * Generic AI request helper supporting both OpenAI and TogetherAI
 */

interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AIRequestOptions {
  model: string
  messages: AIMessage[]
  maxTokens?: number
  temperature?: number
  provider?: LLMProvider
}

export async function makeAIRequest(options: AIRequestOptions) {
  const provider = options.provider || inferProvider(options.model)
  const apiKey = getApiKeyForProvider(provider)
  
  if (!apiKey) {
    const envVar = provider === 'openai' ? 'OPENAI_API_KEY' : 'TOGETHERAI_API_KEY'
    throw new Error(`Missing ${envVar} environment variable`)
  }

  if (provider === 'openai') {
    const openai = new OpenAI({ apiKey })
    const response = await openai.chat.completions.create({
      model: options.model,
      messages: options.messages,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.7,
    })
    return response
  } else {
    const together = new Together({ apiKey })
    const response = await together.chat.completions.create({
      model: options.model,
      messages: options.messages,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.7,
    })
    return response
  }
}
