// Next.js instrumentation hook: runs once when a server instance boots.
// Validates required environment variables (fail-fast at runtime, not at build time).
export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    const { getEnv } = await import('@/lib/config/env')
    getEnv()
  }
}
