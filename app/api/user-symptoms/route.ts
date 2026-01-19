import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * User Symptoms API - Now uses MetricDefinition model
 * Custom user-defined symptoms are stored as MetricDefinition with category='symptom'
 */

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const rows = await prisma.metricDefinition.findMany({ 
      where: { userId: user.id, category: 'user_symptom' }, 
      orderBy: { createdAt: 'asc' } 
    })
    const list = rows.map(r => ({ id: r.id, title: r.name, icon: r.icon ?? null }))
    return NextResponse.json({ symptoms: list })
  } catch (err) {
    console.error('GET /api/user-symptoms failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const title = String(body?.title || '').trim()
    const icon = (typeof body?.icon === 'string' ? String(body.icon).trim() : '') || null
    if (!title) return NextResponse.json({ error: 'Titel erforderlich' }, { status: 400 })

    // Generate unique code from title
    const code = 'user_symptom_' + title.toLowerCase()
      .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

    const created = await prisma.metricDefinition.create({ 
      data: { 
        userId: user.id, 
        code,
        name: title, 
        icon, 
        category: 'user_symptom',
        dataType: 'NUMERIC',
        minValue: 1,
        maxValue: 10,
      } 
    })
    return NextResponse.json({ ok: true, symptom: { id: created.id, title: created.name, icon: created.icon ?? null } })
  } catch (err) {
    console.error('POST /api/user-symptoms failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
