/**
 * Single Location API
 * GET: Get location details
 * PATCH: Update location
 * DELETE: Delete location
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/core/prisma'
import { reverseGeocodeSingle } from '@/lib/services/mapboxService'
import { PoiType } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCurrentUser(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  return user
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await context.params

    const location = await prisma.location.findFirst({
      where: { id, userId: user.id },
      include: {
        _count: {
          select: { visits: true, rawGpsPoints: true },
        },
      },
    })

    if (!location) {
      return NextResponse.json({ error: 'Location nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ location })
  } catch (error) {
    console.error('Failed to fetch location:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    // Check if location exists and belongs to user
    const existing = await prisma.location.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Location nicht gefunden' }, { status: 404 })
    }

    // Handle geocode action
    if (body.action === 'geocode') {
      if (!existing.lat || !existing.lng) {
        return NextResponse.json({ error: 'Keine Koordinaten vorhanden' }, { status: 400 })
      }

      const geocodeResult = await reverseGeocodeSingle(existing.lat, existing.lng)
      
      if (!geocodeResult) {
        return NextResponse.json({ error: 'Geocoding fehlgeschlagen' }, { status: 500 })
      }

      const updated = await prisma.location.update({
        where: { id },
        data: {
          address: geocodeResult.address,
          city: geocodeResult.city,
          country: geocodeResult.country,
        },
      })

      return NextResponse.json({ location: updated, geocodeResult })
    }

    // Regular update
    const updateData: Record<string, unknown> = {}
    
    if (body.name !== undefined) updateData.name = body.name
    if (body.address !== undefined) updateData.address = body.address || null
    if (body.city !== undefined) updateData.city = body.city || null
    if (body.country !== undefined) updateData.country = body.country || null
    if (body.poiType !== undefined) {
      // Handle empty string as null, otherwise validate enum
      if (body.poiType === '' || body.poiType === null) {
        updateData.poiType = null
      } else if (Object.values(PoiType).includes(body.poiType as PoiType)) {
        updateData.poiType = body.poiType as PoiType
      }
    }
    if (body.isFavorite !== undefined) updateData.isFavorite = body.isFavorite
    if (body.notes !== undefined) updateData.notes = body.notes || null

    // Update slug if name changed
    if (body.name && body.name !== existing.name) {
      const baseSlug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9äöüß]+/g, '-')
        .replace(/^-|-$/g, '')
      
      // Check for slug uniqueness
      let slug = baseSlug
      let counter = 1
      while (await prisma.location.findFirst({ where: { userId: user.id, slug, id: { not: id } } })) {
        slug = `${baseSlug}-${counter++}`
      }
      updateData.slug = slug
    }

    const updated = await prisma.location.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ location: updated })
  } catch (error) {
    console.error('Failed to update location:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const prisma = getPrisma()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await context.params

    // Check if location exists and belongs to user
    const existing = await prisma.location.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Location nicht gefunden' }, { status: 404 })
    }

    await prisma.location.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete location:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
