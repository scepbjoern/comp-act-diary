/**
 * Structured logging with Pino.
 * Provides JSON logs in production, pretty logs in development.
 */
import pino from 'pino'
import pinoPretty from 'pino-pretty'

// Create logger instance with environment-aware configuration
const isDevelopment = process.env.NODE_ENV === 'development'
const prettyStream = isDevelopment
  ? pinoPretty({
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    })
  : undefined

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  prettyStream
)

// Re-export for convenience
export default logger
