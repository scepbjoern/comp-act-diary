// Tabler Icon wrapper component for consistent icon usage
// Uses @tabler/icons-react for standard UI icons
import {
  IconSettings,
  IconUserEdit,
  IconPalette,
  IconChecklist,
  IconTrash,
  IconDeviceFloppy,
  IconAdjustments,
  IconStethoscope,
  IconLink,
  IconFileText,
  IconBook,
  IconNotebook,
  IconLeaf,
  IconHourglass,
  IconUpload,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconCalendar,
  IconChartBar,
  IconLogout,
  IconHelp,
  IconFileExport,
  IconPlus,
  IconMinus,
  IconCheck,
  IconCamera,
  IconMicrophone,
  IconSparkles,
  IconRefresh,
  IconStairs,
  IconAlertTriangle,
} from '@tabler/icons-react'

// Mapping from old Material Icon names to Tabler Icons
const iconMap: Record<string, typeof IconSettings> = {
  // Settings & Profile
  settings: IconSettings,
  manage_accounts: IconUserEdit,
  palette: IconPalette,
  tune: IconAdjustments,
  
  // Actions
  delete: IconTrash,
  save: IconDeviceFloppy,
  add_link: IconLink,
  upload_file: IconUpload,
  
  // Medical
  stethoscope: IconStethoscope,
  spa: IconLeaf,
  
  // Documents & Notes
  rate_review: IconFileText,
  menu_book: IconBook,
  edit_note: IconNotebook,
  menu_book_2: IconBook,
  
  // Media controls
  hourglass_empty: IconHourglass,
  pause: IconPlayerPause,
  play_arrow: IconPlayerPlay,
  'player-stop': IconPlayerStop,
  
  // UI Elements
  close: IconX,
  expand_more: IconChevronDown,
  expand_less: IconChevronUp,
  calendar: IconCalendar,
  bar_chart: IconChartBar,
  logout: IconLogout,
  help: IconHelp,
  export: IconFileExport,
  add: IconPlus,
  remove: IconMinus,
  check: IconCheck,
  checklist: IconChecklist,
  camera: IconCamera,
  microphone: IconMicrophone,
  sparkles: IconSparkles,
  share: IconFileExport,
  cycle: IconRefresh,
  stairs_2: IconStairs,
  warning: IconAlertTriangle,
}

interface TablerIconProps {
  name: string
  size?: number
  className?: string
}

/**
 * TablerIcon component - wrapper for Tabler icons with Material Icon name compatibility
 * 
 * @param name - Icon name (Material Icon compatible)
 * @param size - Icon size in pixels (default: 20)
 * @param className - Additional CSS classes
 */
export function TablerIcon({ name, size = 20, className = '' }: TablerIconProps) {
  const IconComponent = iconMap[name]
  
  if (!IconComponent) {
    // Fallback: show name as text for unmapped icons
    console.warn(`Icon "${name}" not mapped to Tabler icon`)
    return <span className={`inline-flex items-center text-xs ${className} text-red-500`}>[{name}]</span>
  }
  
  // Add explicit styling to ensure visibility
  return <IconComponent size={size} className={`${className} text-current`} />
}
