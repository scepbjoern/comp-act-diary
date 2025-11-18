import Together from 'together-ai'

/**
 * Generic AI request helper using Together AI
 * Supports OpenAI-compatible models via Together AI
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
}

export async function makeAIRequest(options: AIRequestOptions) {
  const apiKey = process.env.TOGETHERAI_API_KEY
  if (!apiKey) {
    throw new Error('Missing TOGETHERAI_API_KEY')
  }

  const together = new Together({ apiKey })

  const response = await together.chat.completions.create({
    model: options.model,
    messages: options.messages,
    max_tokens: options.maxTokens || 2048,
    temperature: options.temperature || 0.7,
  })

  return response
}
