import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getPrisma } from '@/lib/prisma'

function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
}

// DELETE /api/diary/cleanup-audio
// Body: { audioFileId: string }
export async function DELETE(req: NextRequest) {
  try {
    console.log('=== CLEANUP AUDIO DEBUG START ===')
    
    const { audioFileId } = await req.json()
    
    if (!audioFileId) {
      console.error('ERROR: Missing audioFileId in request body')
      return NextResponse.json({ error: 'Missing audioFileId' }, { status: 400 })
    }

    // Get media asset from database (replaces AudioFile)
    const prisma = getPrisma()
    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id: audioFileId }
    })

    if (!mediaAsset) {
      console.error('ERROR: Media asset not found:', audioFileId)
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 })
    }

    // Check if this media asset is referenced by any attachments
    const referencedAttachments = await prisma.mediaAttachment.findMany({
      where: { assetId: audioFileId }
    })

    if (referencedAttachments.length > 0) {
      console.log('Media asset is still referenced by attachments, not deleting:', audioFileId)
      return NextResponse.json({ 
        error: 'Audio file is still in use',
        referencedBy: referencedAttachments.length 
      }, { status: 409 })
    }

    // Delete the physical file
    const uploadsDir = getUploadsDir()
    if (!mediaAsset.filePath) {
      console.log('Media asset has no file path, skipping file deletion')
    }
    const fullPath = mediaAsset.filePath ? path.join(uploadsDir, mediaAsset.filePath) : null

    if (fullPath && existsSync(fullPath)) {
      await unlink(fullPath)
      console.log('Physical audio file deleted:', fullPath)
    } else {
      console.log('Physical audio file not found, skipping deletion:', fullPath)
    }

    // Delete the database record
    await prisma.mediaAsset.delete({
      where: { id: audioFileId }
    })

    console.log('Audio file record deleted from database:', audioFileId)
    console.log('=== CLEANUP AUDIO DEBUG END SUCCESS ===')
    
    return NextResponse.json({ 
      success: true,
      message: 'Audio file cleaned up successfully',
      audioFileId 
    })

  } catch (err) {
    console.error('=== CLEANUP AUDIO DEBUG END ERROR ===')
    console.error('DELETE /api/diary/cleanup-audio failed:', err)
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
    
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    }, { status: 500 })
  }
}
