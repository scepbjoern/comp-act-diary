import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Helper to get uploads directory
function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
}

// GET /api/uploads/[...path]
// Serves audio files from the uploads directory
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/')
    const uploadsDir = getUploadsDir()
    const fullPath = path.join(uploadsDir, filePath)

    // Security: ensure the path is within uploads directory
    const normalizedPath = path.normalize(fullPath)
    const normalizedUploadsDir = path.normalize(uploadsDir)
    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Read file
    const fileBuffer = await readFile(fullPath)
    
    // Determine content type based on extension
    const ext = path.extname(filePath).toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === '.mp3') contentType = 'audio/mpeg'
    if (ext === '.m4a') contentType = 'audio/mp4'
    if (ext === '.webm') contentType = 'audio/webm'
    if (ext === '.wav') contentType = 'audio/wav'

    // Return file with appropriate headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    console.error('GET /api/uploads/[...path] failed', err)
    return NextResponse.json({
      error: 'Internal Server Error',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
