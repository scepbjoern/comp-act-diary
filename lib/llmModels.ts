/**
 * Shared LLM model types and utilities
 * Used across all AI features (Text Improvement, Coach, Summary, etc.)
 */

export type LLMProvider = 'openai' | 'togetherai'

export type LLMModel = {
  id: string
  modelId: string
  name: string
  provider: LLMProvider
  inputCost?: string | null
  outputCost?: string | null
  url?: string | null
  bestFor?: string | null
  sortOrder?: number
}

/**
 * Fallback default model ID used when no models are configured.
 * This should be a model available via TogetherAI.
 */
export const FALLBACK_MODEL_ID = 'openai/gpt-oss-120b'
export const FALLBACK_PROVIDER: LLMProvider = 'togetherai'

/**
 * Check if a model ID belongs to OpenAI
 * Used as fallback when provider is not explicitly set
 */
export function inferProvider(modelId: string): LLMProvider {
  if (modelId.startsWith('gpt-') || modelId.startsWith('o1-') || modelId.startsWith('o3-')) {
    return 'openai'
  }
  return 'togetherai'
}

/**
 * Get the API key for a provider from environment variables
 */
export function getApiKeyForProvider(provider: LLMProvider): string | undefined {
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY
  }
  return process.env.TOGETHERAI_API_KEY
}

/**
 * Validate that an API key exists for the given provider
 */
export function validateProviderApiKey(provider: LLMProvider): void {
  const apiKey = getApiKeyForProvider(provider)
  if (!apiKey) {
    const envVar = provider === 'openai' ? 'OPENAI_API_KEY' : 'TOGETHERAI_API_KEY'
    throw new Error(`Missing ${envVar} environment variable for provider: ${provider}`)
  }
}
