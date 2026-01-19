/**
 * API route for updating MediaAsset metadata (e.g., capturedAt).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()
  const body = await req.json().catch(() => ({} as Record<string, unknown>))

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const asset = await prisma.mediaAsset.findUnique({ where: { id } })
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (asset.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data: { capturedAt?: Date } = {}
  if (body.capturedAt !== undefined) {
    data.capturedAt = new Date(body.capturedAt as string)
  }

  if (Object.keys(data).length > 0) {
    await prisma.mediaAsset.update({ where: { id }, data })
  }

  return NextResponse.json({ ok: true })
}
