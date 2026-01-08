/**
 * DEBUG VERSION - REMOVE AFTER TESTING!
 * Temporary hardcoded token for testing
 * 
 * USAGE: Replace import in DayLocationPanel.tsx temporarily:
 * import DayMapView from '@/components/DayMapViewDebug'
 */

// TEMPORARY HARDCODED TOKEN - REPLACE WITH YOUR ACTUAL TOKEN!
const HARDCODED_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

// This is just a debug helper - not a full component
export const debugMapboxToken = () => {
  console.log('=== MAPBOX TOKEN DEBUG ===')
  console.log('Hardcoded token:', HARDCODED_TOKEN ? 'SET' : 'NOT SET')
  console.log('Process env token:', process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? 'SET' : 'NOT SET')
  console.log('Token length:', HARDCODED_TOKEN?.length || 0)
  console.log('Token starts with pk.:', HARDCODED_TOKEN?.startsWith('pk.') || false)
  console.log('========================')
  
  return HARDCODED_TOKEN
}
