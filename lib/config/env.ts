// Environment Variables Validation
// Validates all required environment variables at startup using Zod

import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // AI Providers
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  TOGETHERAI_API_KEY: z.string().min(1, 'TOGETHERAI_API_KEY is required'),
  
  // Optional AI Providers
  DEEPGRAM_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  
  // Maps & Location
  MAPBOX_ACCESS_TOKEN: z.string().min(1, 'MAPBOX_ACCESS_TOKEN is required'),
  
  // Google Integration (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Next.js (optional, auto-set)
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => {
        const path = err.path.join('.')
        return `  - ${path}: ${err.message}`
      }).join('\n')
      
      console.error('❌ Invalid environment variables:\n' + missingVars)
      console.error('\nPlease check your .env file and ensure all required variables are set.')
      
      // In development, show helpful message
      if (process.env.NODE_ENV === 'development') {
        console.error('\n💡 Tip: Copy .env.example to .env and fill in the values.')
      }
      
      throw new Error('Environment validation failed')
    }
    throw error
  }
}

// Export validated environment variables
export const env = validateEnv()

// Type-safe access to environment variables
export type Env = z.infer<typeof envSchema>
