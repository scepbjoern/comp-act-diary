/**
 * Structured logging with Pino.
 * Provides JSON logs in production, pretty logs in development.
 */
import pino from 'pino'

// Create logger instance with environment-aware configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // In development, use pino-pretty for readable output
  // In production, output JSON for log aggregation
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
})

// Re-export for convenience
export default logger
