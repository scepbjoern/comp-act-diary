/**
 * Debug route to check environment variables
 * REMOVE IN PRODUCTION!
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    // Server-side env vars
    server: {
      MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    },
    // Client-side env vars (available to browser)
    client: {
      NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    },
  })
}
