import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Environment Variables Validation', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    // Start with a clean env stub
    vi.stubEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/compactdiary')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-key')
    vi.stubEnv('TOGETHERAI_API_KEY', 'together-test-key')
    vi.stubEnv('MAPBOX_ACCESS_TOKEN', 'pk-mapbox-token')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    // Restore original env
    process.env = { ...originalEnv }
  })

  it('should successfully validate a correct environment', async () => {
    const { getEnv } = await import('@/lib/config/env')
    const config = getEnv()
    
    expect(config.DATABASE_URL).toBe('postgresql://postgres:postgres@localhost:5432/compactdiary')
    expect(config.OPENAI_API_KEY).toBe('sk-test-key')
    expect(config.TOGETHERAI_API_KEY).toBe('together-test-key')
    expect(config.MAPBOX_ACCESS_TOKEN).toBe('pk-mapbox-token')
  })

  it('should fail validation and throw when a required key is missing', async () => {
    // Remove required key
    delete process.env.OPENAI_API_KEY
    
    const { getEnv } = await import('@/lib/config/env')
    
    expect(() => getEnv()).toThrow('Environment validation failed')
  })

  it('should not throw when optional MAPBOX_ACCESS_TOKEN is missing', async () => {
    // Delete optional token
    delete process.env.MAPBOX_ACCESS_TOKEN
    
    const { getEnv } = await import('@/lib/config/env')
    const config = getEnv()
    
    expect(config.MAPBOX_ACCESS_TOKEN).toBeUndefined()
  })

  it('should memoize the validation result and not parse process.env again', async () => {
    const { getEnv } = await import('@/lib/config/env')
    
    const firstCall = getEnv()
    expect(firstCall.OPENAI_API_KEY).toBe('sk-test-key')
    
    // Change environment variable in process.env
    vi.stubEnv('OPENAI_API_KEY', 'new-openai-key')
    
    const secondCall = getEnv()
    // The value should remain the cached/memoized one, not the new one
    expect(secondCall.OPENAI_API_KEY).toBe('sk-test-key')
  })
})
