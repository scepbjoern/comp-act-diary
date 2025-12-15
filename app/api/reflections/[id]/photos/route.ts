import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Reflection Photos API - TEMPORARILY DISABLED
 * ReflectionPhoto table removed in new schema.
 */

export async function POST(_req: NextRequest, _context: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ 
    ok: true, 
    photos: [],
    message: 'Reflection photos temporarily disabled during schema migration'
  })
}
