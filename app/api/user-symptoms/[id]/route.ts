import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * User Symptoms [id] API - Now uses MetricDefinition model
 */

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const row = await prisma.metricDefinition.findUnique({ where: { id } })
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (row.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const data: { name?: string; icon?: string | null } = {}
    if (typeof body.title === 'string') data.name = String(body.title).trim() || row.name
    if (Object.prototype.hasOwnProperty.call(body, 'icon')) {
      data.icon = (typeof body.icon === 'string' ? String(body.icon).trim() : '') || null
    }
    
    const updated = await prisma.metricDefinition.update({ where: { id }, data })
    return NextResponse.json({ ok: true, symptom: { id: updated.id, title: updated.name, icon: updated.icon ?? null } })
  } catch (err) {
    console.error('PATCH /api/user-symptoms/[id] failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const metric = await prisma.metricDefinition.findUnique({ where: { id } })
    if (!metric) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (metric.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Delete associated measurements first
    await prisma.measurement.deleteMany({ where: { metricId: id } })
    await prisma.metricDefinition.delete({ where: { id } })
    return NextResponse.json({ ok: true, deleted: id })
  } catch (err) {
    console.error('DELETE /api/user-symptoms/[id] failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
