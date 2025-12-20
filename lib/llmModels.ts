/**
 * Shared LLM model configuration
 * Used across all AI features (Text Improvement, Coach, Summary, etc.)
 */

export type LLMModel = {
  id: string
  name: string
  inputCost: string
  outputCost: string
}

// Default models available - shared across all AI features
export const DEFAULT_LLM_MODELS: LLMModel[] = [
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS-120B', inputCost: '$0.15', outputCost: '$0.60' },
  { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama-3.3-70B-Instruct-Turbo', inputCost: '$0.88', outputCost: '$0.88' },
  { id: 'deepcogito/cogito-v2-preview-llama-405B', name: 'Cogito-v2-Preview-Llama-405B', inputCost: '$3.50', outputCost: '$3.50' },
  { id: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', name: 'Llama-4-Maverick-17B', inputCost: '$0.27', outputCost: '$0.85' },
  { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Meta-Llama-3.1-405B', inputCost: '$3.50', outputCost: '$3.50' },
  { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1', inputCost: '$3.00', outputCost: '$7.00' },
  { id: 'moonshotai/Kimi-K2-Thinking', name: 'Kimi-K2-Thinking', inputCost: '$1.20', outputCost: '$4.00' },
]

// Get default model ID
export const DEFAULT_MODEL_ID = DEFAULT_LLM_MODELS[0].id
