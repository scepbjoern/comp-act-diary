import { NextRequest, NextResponse } from 'next/server'
import { getNotifications, createNotification, markAllAsRead, archiveAllNotifications, getUnreadCount } from '@/lib/notification'
import { NotificationCreateSchema, NotificationFilterSchema } from '@/lib/validators/task'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value || null
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // Check if this is an unread count request
    if (searchParams.get('count') === 'true') {
      const count = await getUnreadCount(userId)
      return NextResponse.json({ count })
    }

    // Parse filter parameters
    const filterResult = NotificationFilterSchema.safeParse({
      type: searchParams.get('type') || undefined,
      isRead: searchParams.get('isRead') === 'true' ? true : searchParams.get('isRead') === 'false' ? false : undefined,
      includeArchived: searchParams.get('includeArchived') === 'true',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    })

    if (!filterResult.success) {
      return NextResponse.json({ error: 'Ungültige Filter-Parameter', details: filterResult.error.flatten() }, { status: 400 })
    }

    const { notifications, total, unreadCount } = await getNotifications(userId, filterResult.data)
    
    return NextResponse.json({
      notifications,
      total,
      unreadCount,
      limit: filterResult.data.limit,
      offset: filterResult.data.offset,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Benachrichtigungen' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json()

    // Handle batch actions
    if (body.action === 'markAllRead') {
      const count = await markAllAsRead(userId)
      return NextResponse.json({ success: true, count })
    }

    if (body.action === 'archiveAll') {
      const count = await archiveAllNotifications(userId)
      return NextResponse.json({ success: true, count })
    }

    // Create new notification
    const result = NotificationCreateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Ungültige Daten', details: result.error.flatten() }, { status: 400 })
    }

    const notification = await createNotification(userId, result.data)
    
    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('Error with notifications:', error)
    return NextResponse.json({ error: 'Fehler bei Benachrichtigungen' }, { status: 500 })
  }
}
