import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Verify a passcode hash against the stored hash.
 * Used by the PasscodeSettings component to verify the current passcode
 * before allowing changes.
 */
export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { passcodeHash } = body

    if (typeof passcodeHash !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const userSettings = (user.settings as Record<string, unknown>) || {}
    const storedHash = userSettings.passcodeHash

    if (!storedHash || typeof storedHash !== 'string') {
      return NextResponse.json({ valid: false, error: 'No passcode set' })
    }

    const valid = passcodeHash === storedHash

    return NextResponse.json({ valid })
  } catch (err) {
    console.error('Verify passcode error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
