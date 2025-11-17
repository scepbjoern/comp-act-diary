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

    // Get audio file from database
    const prisma = getPrisma()
    const audioFile = await prisma.audioFile.findUnique({
      where: { id: audioFileId }
    })

    if (!audioFile) {
      console.error('ERROR: Audio file not found:', audioFileId)
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 })
    }

    // Check if this audio file is referenced by any notes
    const referencedNotes = await prisma.dayNote.findMany({
      where: { audioFileId }
    })

    if (referencedNotes.length > 0) {
      console.log('Audio file is still referenced by notes, not deleting:', audioFileId)
      return NextResponse.json({ 
        error: 'Audio file is still in use',
        referencedBy: referencedNotes.length 
      }, { status: 409 })
    }

    // Delete the physical file
    const uploadsDir = getUploadsDir()
    const fullPath = path.join(uploadsDir, audioFile.filePath)

    if (existsSync(fullPath)) {
      await unlink(fullPath)
      console.log('Physical audio file deleted:', fullPath)
    } else {
      console.log('Physical audio file not found, skipping deletion:', fullPath)
    }

    // Delete the database record
    await prisma.audioFile.delete({
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
