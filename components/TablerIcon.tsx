// Tabler Icon wrapper component for consistent icon usage
// Uses @tabler/icons-react for standard UI icons
import {
  IconSettings,
  IconSettingsFilled,
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
  IconHourglassFilled,
  IconUpload,
  IconCloudUpload,
  IconPlayerPause,
  IconPlayerPauseFilled,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlayerStopFilled,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconChevronRight,
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
  IconMicrophoneFilled,
  IconSparkles,
  IconRefresh,
  IconStairs,
  IconAlertTriangle,
  IconDatabase,
  IconDatabaseOff,
  IconEdit,
  IconLanguageHiragana,
  IconTextGrammar,
  IconCancel,
  IconBlockquote,
  IconCopy,
  IconRestore,
  IconEye,
  IconArrowBackUp,
  IconRobot,
  IconBrain,
  IconMessage2,
  IconSend,
} from '@tabler/icons-react'

// Mapping from old Material Icon names to Tabler Icons
const iconMap: Record<string, typeof IconSettings> = {
  // Settings & Profile
  settings: IconSettings,
  'settings-filled': IconSettingsFilled,
  manage_accounts: IconUserEdit,
  palette: IconPalette,
  tune: IconAdjustments,
  robot: IconRobot,
  
  // Actions
  delete: IconTrash,
  trash: IconTrash,
  save: IconDeviceFloppy,
  'device-floppy': IconDeviceFloppy,
  add_link: IconLink,
  upload_file: IconUpload,
  upload: IconUpload,
  'cloud-upload': IconCloudUpload,
  edit: IconEdit,
  cancel: IconCancel,
  
  // Medical
  stethoscope: IconStethoscope,
  spa: IconLeaf,
  
  // Documents & Notes
  rate_review: IconFileText,
  menu_book: IconBook,
  edit_note: IconNotebook,
  menu_book_2: IconBook,
  'text-grammar': IconTextGrammar,
  'language-hiragana': IconLanguageHiragana,
  
  // Media controls
  hourglass_empty: IconHourglass,
  hourglass: IconHourglass,
  'hourglass-filled': IconHourglassFilled,
  pause: IconPlayerPause,
  'player-pause': IconPlayerPause,
  'player-pause-filled': IconPlayerPauseFilled,
  play_arrow: IconPlayerPlay,
  'player-play': IconPlayerPlay,
  'player-stop': IconPlayerStop,
  'player-stop-filled': IconPlayerStopFilled,
  
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
  'microphone-filled': IconMicrophoneFilled,
  sparkles: IconSparkles,
  share: IconFileExport,
  cycle: IconRefresh,
  stairs_2: IconStairs,
  warning: IconAlertTriangle,
  
  // Database icons for audio keep toggle
  database: IconDatabase,
  'database-off': IconDatabaseOff,
  
  // OriginalTranscriptSection icons
  blockquote: IconBlockquote,
  copy: IconCopy,
  restore: IconRestore,
  eye: IconEye,
  'arrow-back-up': IconArrowBackUp,
  
  // Chevrons for collapsible panels
  'chevron-down': IconChevronDown,
  'chevron-right': IconChevronRight,
  'chevron-up': IconChevronUp,
  
  // File icons
  'file-text': IconFileText,
  
  // Additional icons
  brain: IconBrain,
  refresh: IconRefresh,
  book: IconBook,
  'message-2': IconMessage2,
  send: IconSend,
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
