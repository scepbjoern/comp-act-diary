import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const prisma = getPrisma()
    const { id: contactId } = await params

    // Get contact's entity and media attachments
    const entity = await prisma.entity.findFirst({
      where: { id: contactId, userId },
      include: {
        mediaAttachments: {
          include: {
            asset: true,
          },
          orderBy: [
            { role: 'asc' },
            { displayOrder: 'asc' },
          ],
        },
      },
    })

    if (!entity) {
      return NextResponse.json({ photos: [] })
    }

    const photos = entity.mediaAttachments
      .filter(a => a.asset.mimeType?.startsWith('image/'))
      .map(a => ({
        id: a.id,
        assetId: a.assetId,
        url: a.asset.externalUrl || (a.asset.filePath ? `/uploads/${a.asset.filePath}` : ''),
        role: a.role,
        displayOrder: a.displayOrder,
        createdAt: a.createdAt,
      }))

    return NextResponse.json({ photos })
  } catch (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Fotos' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const prisma = getPrisma()
    const { id: contactId } = await params

    // Verify contact exists
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Kontakt nicht gefunden' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const role = (formData.get('role') as string) || 'COVER'

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Nur Bilder erlaubt' }, { status: 400 })
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'contacts', contactId)
    await mkdir(uploadDir, { recursive: true })

    // Generate unique filename
    const ext = path.extname(file.name) || '.jpg'
    const filename = `${uuidv4()}${ext}`
    const filePath = path.join(uploadDir, filename)
    const relativePath = `contacts/${contactId}/${filename}`

    // Save file
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Ensure entity exists for contact
    let entity = await prisma.entity.findUnique({ where: { id: contactId } })
    if (!entity) {
      entity = await prisma.entity.create({
        data: {
          id: contactId,
          userId,
          type: 'CONTACT',
        },
      })
    }

    // Create MediaAsset
    const asset = await prisma.mediaAsset.create({
      data: {
        userId,
        filePath: relativePath,
        mimeType: file.type,
      },
    })

    // If this is a COVER photo, update existing COVER to GALLERY
    if (role === 'COVER') {
      await prisma.mediaAttachment.updateMany({
        where: {
          entityId: contactId,
          userId,
          role: 'COVER',
        },
        data: {
          role: 'GALLERY',
        },
      })
    }

    // Create MediaAttachment
    const attachment = await prisma.mediaAttachment.create({
      data: {
        assetId: asset.id,
        entityId: contactId,
        userId,
        role: role as 'COVER' | 'GALLERY' | 'ATTACHMENT' | 'THUMBNAIL',
        displayOrder: 0,
      },
    })

    // Update contact's photoUrl if this is a COVER
    if (role === 'COVER') {
      await prisma.contact.update({
        where: { id: contactId },
        data: { photoUrl: `/uploads/${relativePath}` },
      })
    }

    return NextResponse.json({
      success: true,
      photo: {
        id: attachment.id,
        assetId: asset.id,
        url: `/uploads/${relativePath}`,
        role,
      },
    })
  } catch (error) {
    console.error('Error uploading photo:', error)
    return NextResponse.json({ error: 'Fehler beim Hochladen' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const prisma = getPrisma()
    const { id: contactId } = await params
    const body = await request.json()
    const { attachmentId, role } = body

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID erforderlich' }, { status: 400 })
    }

    // Verify ownership
    const attachment = await prisma.mediaAttachment.findFirst({
      where: { id: attachmentId, userId, entityId: contactId },
      include: { asset: true },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Foto nicht gefunden' }, { status: 404 })
    }

    // If setting as COVER, demote current COVER to GALLERY
    if (role === 'COVER') {
      await prisma.mediaAttachment.updateMany({
        where: {
          entityId: contactId,
          userId,
          role: 'COVER',
          NOT: { id: attachmentId },
        },
        data: { role: 'GALLERY' },
      })

      // Update the attachment to COVER
      await prisma.mediaAttachment.update({
        where: { id: attachmentId },
        data: { role: 'COVER' },
      })

      // Update contact's photoUrl
      const photoUrl = attachment.asset.externalUrl || 
        (attachment.asset.filePath ? `/uploads/${attachment.asset.filePath}` : null)
      
      await prisma.contact.update({
        where: { id: contactId },
        data: { photoUrl },
      })

      return NextResponse.json({ success: true, photoUrl })
    }

    return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 })
  } catch (error) {
    console.error('Error updating photo:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const prisma = getPrisma()
    const { id: contactId } = await params
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('attachmentId')

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID erforderlich' }, { status: 400 })
    }

    // Verify ownership
    const attachment = await prisma.mediaAttachment.findFirst({
      where: { id: attachmentId, userId, entityId: contactId },
      include: { asset: true },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Foto nicht gefunden' }, { status: 404 })
    }

    // Delete attachment (cascade will handle asset if no other references)
    await prisma.mediaAttachment.delete({ where: { id: attachmentId } })

    // If this was the COVER, promote next GALLERY image or clear photoUrl
    if (attachment.role === 'COVER') {
      const nextPhoto = await prisma.mediaAttachment.findFirst({
        where: { entityId: contactId, userId, role: 'GALLERY' },
        include: { asset: true },
        orderBy: { displayOrder: 'asc' },
      })

      if (nextPhoto) {
        await prisma.mediaAttachment.update({
          where: { id: nextPhoto.id },
          data: { role: 'COVER' },
        })
        const nextUrl = nextPhoto.asset.externalUrl || (nextPhoto.asset.filePath ? `/uploads/${nextPhoto.asset.filePath}` : null)
        await prisma.contact.update({
          where: { id: contactId },
          data: { photoUrl: nextUrl },
        })
      } else {
        await prisma.contact.update({
          where: { id: contactId },
          data: { photoUrl: null },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
