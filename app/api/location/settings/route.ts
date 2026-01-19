/**
 * Location Settings API
 * Get and update geocoding settings for the current user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface GeocodingSettings {
  clusterDistanceMeters: number
  knownLocationRadiusMeters: number
  includePoi: boolean
}

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

// =============================================================================
// GET - Get geocoding settings
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Extract geocoding settings from user.settings JSON
    const userSettings = user.settings as Record<string, unknown> | null
    const geocodingSettings: GeocodingSettings = {
      clusterDistanceMeters: (userSettings?.clusterDistanceMeters as number) ?? 50,
      knownLocationRadiusMeters: (userSettings?.knownLocationRadiusMeters as number) ?? 100,
      includePoi: (userSettings?.includePoi as boolean) ?? false,
    }

    return NextResponse.json({ settings: geocodingSettings })

  } catch (error) {
    console.error('Error fetching location settings:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Einstellungen' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT - Update geocoding settings
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const clusterDistanceMeters = Math.max(10, Math.min(200, body.clusterDistanceMeters ?? 50))
    const knownLocationRadiusMeters = Math.max(25, Math.min(500, body.knownLocationRadiusMeters ?? 100))
    const includePoi = Boolean(body.includePoi)

    // Merge with existing settings
    const existingSettings = (user.settings as Record<string, unknown>) || {}
    const updatedSettings = {
      ...existingSettings,
      clusterDistanceMeters,
      knownLocationRadiusMeters,
      includePoi,
    }

    // Update user settings
    await prisma.user.update({
      where: { id: user.id },
      data: { settings: updatedSettings },
    })

    return NextResponse.json({ 
      success: true,
      settings: {
        clusterDistanceMeters,
        knownLocationRadiusMeters,
        includePoi,
      },
    })

  } catch (error) {
    console.error('Error updating location settings:', error)
    return NextResponse.json(
      { error: 'Fehler beim Speichern der Einstellungen' },
      { status: 500 }
    )
  }
}
