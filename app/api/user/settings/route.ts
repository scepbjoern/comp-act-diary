import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  let settings = await prisma.userSettings.findUnique({ where: { userId: user.id } })
  if (!settings) {
    settings = await prisma.userSettings.create({
      data: {
        userId: user.id,
        transcriptionModel: 'gpt-4o-transcribe',
      },
    })
  }

  return NextResponse.json({ settings })
}

export async function PATCH(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const data: any = {}

  if (typeof body.transcriptionModel === 'string') {
    data.transcriptionModel = body.transcriptionModel
  }
  if (typeof body.theme === 'string') {
    data.theme = body.theme
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: data,
    create: {
      userId: user.id,
      ...data,
    },
  })

  return NextResponse.json({ ok: true, settings })
}
