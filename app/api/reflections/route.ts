import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Reflections API - Now uses JournalEntry with reflection type
 */

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function getOrCreateReflectionType(prisma: ReturnType<typeof getPrisma>, userId: string, kind: 'WEEK' | 'MONTH') {
  const code = kind === 'WEEK' ? 'reflection_week' : 'reflection_month'
  let type = await prisma.journalEntryType.findFirst({ where: { code, OR: [{ userId: null }, { userId }] } })
  if (!type) {
    type = await prisma.journalEntryType.create({
      data: { code, name: kind === 'WEEK' ? 'Wochenreflexion' : 'Monatsreflexion', icon: '📝' }
    })
  }
  return type
}

async function getOrCreateTimeBox(prisma: ReturnType<typeof getPrisma>, userId: string, kind: 'WEEK' | 'MONTH') {
  const now = new Date()
  const localDate = toYmd(now)
  const tbKind = kind === 'WEEK' ? 'WEEK' : 'MONTH'
  
  let timeBox = await prisma.timeBox.findFirst({ where: { userId, kind: tbKind, localDate } })
  if (!timeBox) {
    const startAt = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000)
    timeBox = await prisma.timeBox.create({
      data: { userId, kind: tbKind, localDate, startAt, endAt }
    })
  }
  return timeBox
}

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    // Get reflection types
    const reflectionTypes = await prisma.journalEntryType.findMany({
      where: { code: { in: ['reflection_week', 'reflection_month'] } }
    })
    const typeIds = reflectionTypes.map(t => t.id)

    if (typeIds.length === 0) {
      return NextResponse.json({ reflections: [] })
    }

    const entries = await prisma.journalEntry.findMany({
      where: { userId: user.id, typeId: { in: typeIds }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { type: true }
    })

    const reflections = entries.map(e => ({
      id: e.id,
      kind: e.type.code === 'reflection_month' ? 'MONTH' : 'WEEK',
      createdAtIso: e.createdAt.toISOString(),
      changed: '', // Parse from content if needed
      gratitude: '',
      vows: '',
      remarks: e.content,
      photos: [],
    }))
    return NextResponse.json({ reflections })
  } catch (err) {
    console.error('GET /api/reflections failed', err)
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
    const kind = (body?.kind === 'MONTH' ? 'MONTH' : 'WEEK') as 'WEEK' | 'MONTH'
    
    // Build content from reflection fields
    const parts: string[] = []
    if (body?.changed) parts.push(`**Was hat sich verändert?**\n${body.changed}`)
    if (body?.gratitude) parts.push(`**Wofür bin ich dankbar?**\n${body.gratitude}`)
    if (body?.vows) parts.push(`**Meine Vorsätze**\n${body.vows}`)
    if (body?.remarks) parts.push(`**Bemerkungen**\n${body.remarks}`)
    const content = parts.join('\n\n') || 'Reflexion'

    const type = await getOrCreateReflectionType(prisma, user.id, kind)
    const timeBox = await getOrCreateTimeBox(prisma, user.id, kind)

    const created = await prisma.journalEntry.create({
      data: {
        userId: user.id,
        typeId: type.id,
        timeBoxId: timeBox.id,
        content,
        title: kind === 'WEEK' ? 'Wochenreflexion' : 'Monatsreflexion',
      }
    })

    return NextResponse.json({ ok: true, reflection: { id: created.id } })
  } catch (err) {
    console.error('POST /api/reflections failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
