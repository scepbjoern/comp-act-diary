import { PrismaClient } from '@prisma/client'
import '../config/env' // Validate environment variables on import

declare global {
  var __prisma__: PrismaClient | undefined
}

function createClient() {
  return new PrismaClient()
}

export function getPrisma(): PrismaClient {
  if (!globalThis.__prisma__) {
    globalThis.__prisma__ = createClient()
  }
  return globalThis.__prisma__
}

export const prisma = getPrisma()
