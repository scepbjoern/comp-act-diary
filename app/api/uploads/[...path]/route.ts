import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { existsSync, createReadStream } from 'fs'
import path from 'path'

// Helper to get uploads directory
function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
}

// HEAD /api/uploads/[...path]
// Returns headers without body - used by browsers for seeking preparation
export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params
    const filePath = resolvedParams.path.join('/')
    const uploadsDir = getUploadsDir()
    const fullPath = path.join(uploadsDir, filePath)

    // Security check
    const normalizedPath = path.normalize(fullPath)
    const normalizedUploadsDir = path.normalize(uploadsDir)
    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileStats = await stat(fullPath)
    const fileSize = fileStats.size
    
    const ext = path.extname(filePath).toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === '.mp3') contentType = 'audio/mpeg'
    if (ext === '.m4a') contentType = 'audio/mp4'
    if (ext === '.webm') contentType = 'audio/webm'
    if (ext === '.wav') contentType = 'audio/wav'

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('HEAD /api/uploads/[...path] failed', err)
    return NextResponse.json({
      error: 'Internal Server Error',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}

// GET /api/uploads/[...path]
// Serves audio files from the uploads directory with Range request support
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params
    const filePath = resolvedParams.path.join('/')
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

    // Get file stats
    const fileStats = await stat(fullPath)
    const fileSize = fileStats.size
    
    // Determine content type based on extension
    const ext = path.extname(filePath).toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === '.mp3') contentType = 'audio/mpeg'
    if (ext === '.m4a') contentType = 'audio/mp4'
    if (ext === '.webm') contentType = 'audio/webm'
    if (ext === '.wav') contentType = 'audio/wav'

    // Handle Range requests for seeking
    const range = req.headers.get('range')
    
    if (range) {
      // Parse Range header: "bytes=start-end"
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunksize = (end - start) + 1

      // Validate range
      if (start >= fileSize) {
        return new NextResponse('Requested Range Not Satisfiable', {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        })
      }

      // Create read stream for the specific range
      const stream = createReadStream(fullPath, { start, end })
      
      // Return partial content
      const response = new NextResponse(stream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunksize),
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range',
          'Cache-Control': 'public, max-age=3600',
        },
      })
      
      console.log('Range request:', { range, start, end, chunksize, fileSize })
      return response
    } else {
      // Return entire file for non-range requests
      const fileBuffer = await readFile(fullPath)
      
      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(fileBuffer.length),
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }
  } catch (err) {
    console.error('GET /api/uploads/[...path] failed', err)
    return NextResponse.json({
      error: 'Internal Server Error',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
