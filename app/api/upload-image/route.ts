import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const timeStr = formData.get('time') as string | null // HH:MM from diary entry
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Determine the date/time to use for filename
    let targetDate: Date
    if (timeStr) {
      // Use the diary entry time
      const now = new Date()
      const [hours, minutes] = timeStr.split(':').map(Number)
      targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
    } else if (file.lastModified) {
      // Use file's last modified time (camera/creation time)
      targetDate = new Date(file.lastModified)
    } else {
      // Fallback to current time
      targetDate = new Date()
    }

    // Generate folder structure: uploads/images/2020s/2025/11/17/
    const year = targetDate.getFullYear()
    const decade = `${Math.floor(year / 10) * 10}s`
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const day = String(targetDate.getDate()).padStart(2, '0')
    
    const uploadDir = join(process.cwd(), 'uploads', 'images', decade, String(year), month, day)
    
    // Create directory if it doesn't exist
    await mkdir(uploadDir, { recursive: true })

    // Generate filename with date, time and UUID: YYYY-MM-DD_HH-MM_UUID.ext
    const ext = file.name.split('.').pop() || 'jpg'
    const hours = String(targetDate.getHours()).padStart(2, '0')
    const minutes = String(targetDate.getMinutes()).padStart(2, '0')
    const filename = `${year}-${month}-${day}_${hours}-${minutes}_${uuidv4()}.${ext}`
    const filepath = join(uploadDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Return the relative URL path
    const url = `/uploads/images/${decade}/${year}/${month}/${day}/${filename}`
    
    return NextResponse.json({ url, filename })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
