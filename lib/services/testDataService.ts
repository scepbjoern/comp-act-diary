/**
 * Test Data Generator Service
 * 
 * Provides functionality to generate test data for development and testing:
 * - Predefined test data sets (contacts, tasks, journal entries, etc.)
 * - AI-generated ad-hoc test data with customizable prompts
 * 
 * Uses the current Prisma schema to ensure data consistency.
 */

import { PrismaClient, TaskType, TaskSource, TaskPriority, PoiType, EntityType } from '@prisma/client'
import { makeAIRequest } from '@/lib/core/ai'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

export type TestDataCategory = 
  | 'contacts'
  | 'tasks' 
  | 'journal_entries'
  | 'habits'
  | 'locations'
  | 'measurements'
  | 'all'

export type GenerationMode = 'predefined' | 'ai'

export interface TestDataOptions {
  category: TestDataCategory
  mode: GenerationMode
  count?: number // For AI mode: how many items to generate
  customPrompt?: string // Override default AI prompt
  userId: string
}

export interface TestDataResult {
  success: boolean
  category: TestDataCategory
  itemsCreated: number
  details?: string[]
  error?: string
}

// =============================================================================
// PREDEFINED TEST DATA (extracted from seed.ts)
// =============================================================================

const PREDEFINED_CONTACTS = [
  {
    name: 'Max Mustermann',
    givenName: 'Max',
    familyName: 'Mustermann',
    nickname: 'Maxi',
    emailPrivate: 'max.mustermann@gmail.com',
    emailWork: 'max.mustermann@firma.ch',
    phonePrivate: '+41 79 123 45 67',
    phoneWork: '+41 44 987 65 43',
    addressHome: 'Bahnhofstrasse 10, 8001 Zürich',
    addressWork: 'Paradeplatz 1, 8001 Zürich',
    company: 'Schweizer Bank AG',
    jobTitle: 'Senior Consultant',
    birthday: new Date(1985, 5, 15),
    notes: 'Alter Schulfreund, arbeitet im Finanzsektor.',
    isFavorite: true,
  },
  {
    name: 'Anna Meier',
    givenName: 'Anna',
    familyName: 'Meier',
    emailPrivate: 'anna.meier@bluewin.ch',
    phonePrivate: '+41 78 234 56 78',
    addressHome: 'Seestrasse 25, 8002 Zürich',
    company: 'ETH Zürich',
    jobTitle: 'Professorin für Informatik',
    birthday: new Date(1980, 2, 22),
    notes: 'Kennengelernt an einer Konferenz. Sehr interessante Gespräche über KI.',
    isFavorite: true,
  },
  {
    name: 'Peter Brunner',
    givenName: 'Peter',
    familyName: 'Brunner',
    nickname: 'Peti',
    emailPrivate: 'peter.brunner@sunrise.ch',
    phonePrivate: '+41 76 345 67 89',
    addressHome: 'Hauptstrasse 42, 3011 Bern',
    birthday: new Date(1990, 8, 3),
    notes: 'Cousin mütterlicherseits.',
  },
  {
    name: 'Sarah Weber',
    givenName: 'Sarah',
    familyName: 'Weber',
    emailPrivate: 'sarah.weber@gmail.com',
    emailWork: 'sweber@startup.io',
    phonePrivate: '+41 79 456 78 90',
    phoneWork: '+41 44 111 22 33',
    addressHome: 'Limmatquai 88, 8001 Zürich',
    company: 'TechStartup GmbH',
    jobTitle: 'CEO & Gründerin',
    websiteUrl: 'https://sarahweber.ch',
    notes: 'Erfolgreiche Unternehmerin, guter Kontakt für Startup-Fragen.',
    isFavorite: false,
  },
  {
    name: 'Thomas Keller',
    givenName: 'Thomas',
    familyName: 'Keller',
    emailPrivate: 'thomas.keller@gmx.ch',
    phonePrivate: '+41 77 567 89 01',
    addressHome: 'Bergweg 5, 6003 Luzern',
    birthday: new Date(1975, 11, 8),
    notes: 'Nachbar aus der alten Wohnung.',
  },
  {
    name: 'Lisa Schmid',
    givenName: 'Lisa',
    familyName: 'Schmid',
    emailPrivate: 'lisa.schmid@outlook.com',
    phonePrivate: '+41 78 678 90 12',
    addressHome: 'Rösslimatte 12, 4001 Basel',
    company: 'Kantonsspital Basel',
    jobTitle: 'Ärztin',
    birthday: new Date(1988, 3, 28),
    notes: 'Meine Hausärztin, sehr kompetent.',
  },
]

const PREDEFINED_TASKS = [
  { title: 'Max zum Mittagessen einladen', description: 'Im Restaurant Hiltl treffen', dueDate: 7, status: 'PENDING' as const, taskType: 'PLANNED_INTERACTION' as const, priority: 'MEDIUM' as const, source: 'MANUAL' as const, isFavorite: true },
  { title: 'Fachbuch-Empfehlung nachfragen', description: 'Nach dem ML-Buch fragen', dueDate: -5, status: 'COMPLETED' as const, taskType: 'FOLLOW_UP' as const, priority: 'LOW' as const, source: 'MANUAL' as const },
  { title: 'Startup-Pitch anschauen', description: 'Feedback zur App geben', dueDate: 10, status: 'PENDING' as const, taskType: 'PLANNED_INTERACTION' as const, priority: 'HIGH' as const, source: 'MANUAL' as const, isFavorite: true },
  { title: 'Termin für Checkup vereinbaren', dueDate: 14, status: 'PENDING' as const, taskType: 'IMMEDIATE' as const, priority: 'HIGH' as const, source: 'MANUAL' as const },
  { title: 'Meditation wieder aufnehmen', description: 'Täglich 10 Minuten', dueDate: 3, status: 'PENDING' as const, taskType: 'HABIT_RELATED' as const, priority: 'MEDIUM' as const, source: 'AI' as const, aiConfidence: 0.85 },
  { title: 'Steuererklärung vorbereiten', description: 'Belege sammeln', dueDate: 30, status: 'PENDING' as const, taskType: 'GENERAL' as const, priority: 'LOW' as const, source: 'MANUAL' as const },
  { title: 'Über Jobwechsel nachdenken', description: 'Pro/Contra Liste erstellen', status: 'PENDING' as const, taskType: 'REFLECTION' as const, priority: 'MEDIUM' as const, source: 'AI' as const, aiConfidence: 0.72 },
  { title: 'Neue Therapiemöglichkeiten recherchieren', description: 'ACT und MBCT vergleichen', dueDate: 14, status: 'PENDING' as const, taskType: 'RESEARCH' as const, priority: 'MEDIUM' as const, source: 'AI' as const, aiConfidence: 0.91, isFavorite: true },
  { title: 'Bei Bewerbung nachfragen', description: 'Nach 2 Wochen noch keine Antwort', dueDate: 2, status: 'PENDING' as const, taskType: 'FOLLOW_UP' as const, priority: 'HIGH' as const, source: 'MANUAL' as const, isFavorite: true },
  { title: 'Zahnarzttermin vereinbaren', dueDate: -10, status: 'PENDING' as const, taskType: 'IMMEDIATE' as const, priority: 'HIGH' as const, source: 'MANUAL' as const },
  { title: 'Bücher zurückgeben', description: 'Bibliothek Oerlikon', dueDate: -5, status: 'PENDING' as const, taskType: 'IMMEDIATE' as const, priority: 'LOW' as const, source: 'MANUAL' as const },
]

const PREDEFINED_LOCATIONS = [
  { name: 'Zuhause', address: 'Bahnhofstrasse 10, 8001 Zürich', lat: 47.3769, lng: 8.5417, poiType: 'HOME' as const },
  { name: 'Büro', address: 'Paradeplatz 1, 8001 Zürich', lat: 47.3697, lng: 8.5392, poiType: 'WORK' as const },
  { name: 'Fitnessstudio', address: 'Europaallee 21, 8004 Zürich', lat: 47.3782, lng: 8.5310, poiType: 'SPORT' as const },
  { name: 'Lieblings-Café', address: 'Niederdorfstrasse 15, 8001 Zürich', lat: 47.3726, lng: 8.5450, poiType: 'RESTAURANT' as const },
  { name: 'Hausarzt Dr. Müller', address: 'Seestrasse 42, 8002 Zürich', lat: 47.3625, lng: 8.5362, poiType: 'HEALTH' as const },
  { name: 'Migros City', address: 'Löwenstrasse 31, 8001 Zürich', lat: 47.3752, lng: 8.5365, poiType: 'SHOP' as const },
  { name: 'Zürichsee Uferweg', address: 'Utoquai, 8008 Zürich', lat: 47.3580, lng: 8.5510, poiType: 'NATURE' as const },
  { name: 'Hauptbahnhof Zürich', address: 'Bahnhofplatz, 8001 Zürich', lat: 47.3779, lng: 8.5403, poiType: 'TRANSPORT' as const },
]

const PREDEFINED_HABITS = [
  '1 Glas Wasser mit Salz & Zitrone oder Apfelessig',
  'Proteinreiches Frühstück & Mittagessen',
  'Einnahme Fairment-Produkte',
  'Max. 1 Kaffee / 1 grüner Tee',
  'Keine Fertigprodukte',
  'Kein Zucker, Softdrinks oder Süßstoffe',
  'Keine Margarine und Saatenöle',
  'Keine unfermentierten Milchprodukte',
  'Keine Wurst oder Wurstwaren',
  'Kein glutenhaltiges Getreide',
  'Kein Alkohol',
  'Nichts essen ab 3 Std. vor dem Schlafengehen',
]

const PREDEFINED_JOURNAL_ENTRIES = [
  'Heute war ein guter Tag. Habe mich an alle Regeln gehalten.',
  'Morgens etwas müde, aber nach dem Frühstück ging es besser.',
  'Hatte etwas Heißhunger am Nachmittag, konnte aber widerstehen.',
  'Super geschlafen letzte Nacht!',
  'Bin heute viel spazieren gegangen, das tat gut.',
  'Leichte Verdauungsbeschwerden am Vormittag.',
  'Fühle mich energiegeladen und motiviert.',
  'Etwas Stress bei der Arbeit, aber gut damit umgegangen.',
  'Heute zum ersten Mal Sauerkraut selbst gemacht!',
  'Kefir-Smoothie zum Frühstück - lecker!',
]

// =============================================================================
// AI PROMPT TEMPLATES
// =============================================================================

const AI_PROMPTS: Record<TestDataCategory, string> = {
  contacts: `Generiere ${'{count}'} realistische Schweizer Kontakte als JSON-Array.
Jeder Kontakt hat: name, givenName, familyName, emailPrivate (optional), phonePrivate (Schweizer Format +41...), 
addressHome (Schweizer Adresse), company (optional), jobTitle (optional), birthday (ISO-Format, optional), 
notes (kurze Notiz zur Person).
Variiere Geschlecht, Alter, Berufe. Verwende typisch schweizerische Namen.`,

  tasks: `Generiere ${'{count}'} realistische persönliche Aufgaben als JSON-Array.
Jede Aufgabe hat: title, description (optional), dueDays (Tage ab heute, kann negativ sein für überfällig),
taskType (IMMEDIATE|REFLECTION|PLANNED_INTERACTION|FOLLOW_UP|RESEARCH|HABIT_RELATED|GENERAL),
priority (LOW|MEDIUM|HIGH), source (MANUAL|AI).
Mische verschiedene Lebensbereiche: Arbeit, Gesundheit, Beziehungen, Finanzen, Hobbies.`,

  journal_entries: `Generiere ${'{count}'} realistische deutschsprachige Tagebucheinträge als JSON-Array.
Jeder Eintrag hat: content (2-4 Sätze), mood (1-10), energy (1-10).
Themen: Alltag, Reflexionen, Erfolge, Herausforderungen, Beziehungen, Gesundheit.
Variiere zwischen positiven, neutralen und herausfordernden Tagen.`,

  habits: `Generiere ${'{count}'} realistische Gewohnheiten/Routinen als JSON-Array.
Jede Gewohnheit hat: title (kurz und prägnant), description (optional).
Themen: Gesundheit, Produktivität, Beziehungen, Selbstfürsorge, Lernen.
Formuliere positiv (was tun, nicht was vermeiden).`,

  locations: `Generiere ${'{count}'} realistische Schweizer Orte als JSON-Array.
Jeder Ort hat: name, address (Schweizer Adresse mit PLZ), lat, lng (realistische Koordinaten für Schweiz),
poiType (HOME|WORK|RESTAURANT|SHOP|LANDMARK|TRANSPORT|NATURE|SPORT|HEALTH|OTHER).
Variiere zwischen verschiedenen Städten und Ortstypen.`,

  measurements: `Generiere Messwerte für die letzten 7 Tage als JSON-Array.
Pro Tag: date (ISO), symptoms (Array mit code und value 1-10 für: energie, stimmung, schlaf, entspannung),
stoolType (Bristol-Skala 1-7), weight (kg, leichte Schwankungen um 75kg).`,

  all: '', // Not used directly
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function toSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// =============================================================================
// GENERATION FUNCTIONS
// =============================================================================

async function generatePredefinedContacts(userId: string): Promise<TestDataResult> {
  const details: string[] = []
  let created = 0

  for (const contact of PREDEFINED_CONTACTS) {
    const slug = toSlug(contact.name)
    const exists = await prisma.contact.findFirst({
      where: { userId, slug }
    })
    
    if (!exists) {
      const newContact = await prisma.contact.create({
        data: {
          userId,
          slug,
          ...contact,
        }
      })
      // Create Entity for polymorphic queries
      await prisma.entity.create({
        data: { id: newContact.id, userId, type: 'CONTACT' }
      })
      created++
      details.push(`Kontakt: ${contact.name}`)
    }
  }

  return { success: true, category: 'contacts', itemsCreated: created, details }
}

async function generatePredefinedTasks(userId: string): Promise<TestDataResult> {
  const details: string[] = []
  let created = 0
  const today = new Date()

  for (const task of PREDEFINED_TASKS) {
    const exists = await prisma.task.findFirst({
      where: { userId, title: task.title }
    })

    if (!exists) {
      const dueDate = task.dueDate ? addDays(today, task.dueDate) : undefined
      await prisma.task.create({
        data: {
          userId,
          title: task.title,
          description: task.description,
          dueDate,
          status: task.status,
          taskType: task.taskType,
          priority: task.priority,
          source: task.source,
          aiConfidence: task.aiConfidence,
          isFavorite: task.isFavorite ?? false,
        }
      })
      created++
      details.push(`Task: ${task.title}`)
    }
  }

  return { success: true, category: 'tasks', itemsCreated: created, details }
}

async function generatePredefinedLocations(userId: string): Promise<TestDataResult> {
  const details: string[] = []
  let created = 0

  for (const loc of PREDEFINED_LOCATIONS) {
    const slug = toSlug(loc.name)
    const exists = await prisma.location.findFirst({
      where: { userId, slug }
    })

    if (!exists) {
      const newLocation = await prisma.location.create({
        data: {
          userId,
          slug,
          name: loc.name,
          address: loc.address,
          lat: loc.lat,
          lng: loc.lng,
          poiType: loc.poiType,
        }
      })
      await prisma.entity.create({
        data: { id: newLocation.id, userId, type: 'LOCATION' }
      })
      created++
      details.push(`Ort: ${loc.name}`)
    }
  }

  return { success: true, category: 'locations', itemsCreated: created, details }
}

async function generatePredefinedHabits(userId: string): Promise<TestDataResult> {
  const details: string[] = []
  let created = 0

  for (let i = 0; i < PREDEFINED_HABITS.length; i++) {
    const title = PREDEFINED_HABITS[i]
    const slug = toSlug(title)
    const exists = await prisma.habit.findFirst({
      where: { userId, slug }
    })

    if (!exists) {
      const newHabit = await prisma.habit.create({
        data: {
          userId,
          slug,
          title,
          frequency: 'daily',
          isActive: true,
          sortOrder: i,
        }
      })
      await prisma.entity.create({
        data: { id: newHabit.id, userId, type: 'HABIT' }
      })
      created++
      details.push(`Gewohnheit: ${title.substring(0, 40)}...`)
    }
  }

  return { success: true, category: 'habits', itemsCreated: created, details }
}

async function generatePredefinedJournalEntries(userId: string): Promise<TestDataResult> {
  const details: string[] = []
  let created = 0
  const today = new Date()

  // Get or create daily_note journal type
  let dailyNoteType = await prisma.journalEntryType.findFirst({
    where: { userId, code: 'daily_note' }
  })
  if (!dailyNoteType) {
    dailyNoteType = await prisma.journalEntryType.create({
      data: {
        userId,
        code: 'daily_note',
        name: 'Tagesnotiz',
        icon: '📝',
        sortOrder: 0,
      }
    })
  }

  // Create entries for the last 10 days
  for (let i = 0; i < PREDEFINED_JOURNAL_ENTRIES.length; i++) {
    const entryDate = addDays(today, -i)
    const localDate = toYmd(entryDate)

    // Get or create TimeBox for this day
    let timeBox = await prisma.timeBox.findFirst({
      where: { userId, localDate, kind: 'DAY' }
    })
    if (!timeBox) {
      const startAt = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate())
      const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000)
      timeBox = await prisma.timeBox.create({
        data: { userId, localDate, kind: 'DAY', startAt, endAt }
      })
      await prisma.entity.create({
        data: { id: timeBox.id, userId, type: 'TIMEBOX' }
      })
    }

    // Check if entry already exists
    const exists = await prisma.journalEntry.findFirst({
      where: { userId, timeBoxId: timeBox.id, typeId: dailyNoteType.id }
    })

    if (!exists) {
      const newEntry = await prisma.journalEntry.create({
        data: {
          userId,
          typeId: dailyNoteType.id,
          timeBoxId: timeBox.id,
          content: PREDEFINED_JOURNAL_ENTRIES[i],
        }
      })
      await prisma.entity.create({
        data: { id: newEntry.id, userId, type: 'JOURNAL_ENTRY' }
      })
      created++
      details.push(`Eintrag: ${localDate}`)

      // Phase 2+3 test data: enrich specific entries
      try {
        if (i === 0) {
          // First entry: add JournalEntryAccess (sharing) for test
          await prisma.journalEntryAccess.create({
            data: {
              journalEntryId: newEntry.id,
              userId,
              grantedByUserId: userId,
              role: 'VIEWER',
            }
          })
          details.push('  → JournalEntryAccess (Sharing) hinzugefügt')
        }

        if (i === 1) {
          // Second entry: add a SOURCE MediaAttachment (OCR test data)
          const ocrAsset = await prisma.mediaAsset.create({
            data: {
              userId,
              filePath: 'uploads/test/ocr-sample.png',
              mimeType: 'image/png',
            }
          })
          await prisma.mediaAttachment.create({
            data: {
              entityId: newEntry.id,
              assetId: ocrAsset.id,
              userId,
              role: 'SOURCE',
              displayOrder: 0,
            }
          })
          details.push('  → OCR SOURCE Attachment hinzugefügt')
        }

        if (i === 2) {
          // Third entry: add linked Task
          await prisma.task.create({
            data: {
              userId,
              title: 'Arzttermin ausmachen',
              description: 'Wegen Kopfschmerzen vom Tagebucheintrag',
              status: 'PENDING',
              taskType: 'IMMEDIATE',
              priority: 'HIGH',
              source: 'AI',
              aiConfidence: 0.88,
              journalEntryId: newEntry.id,
            }
          })
          details.push('  → Task mit journalEntryId hinzugefügt')
        }
      } catch (enrichErr) {
        // Non-critical: log but don't fail entry creation
        details.push(`  → Anreicherung fehlgeschlagen: ${enrichErr instanceof Error ? enrichErr.message : 'Unbekannt'}`)
      }
    }
  }

  return { success: true, category: 'journal_entries', itemsCreated: created, details }
}

async function generatePredefinedMeasurements(userId: string): Promise<TestDataResult> {
  const details: string[] = []
  let created = 0
  const today = new Date()

  // Get system metrics
  const metrics = await prisma.metricDefinition.findMany({
    where: { 
      OR: [
        { userId: null, origin: 'SYSTEM' },
        { userId }
      ]
    }
  })

  const energyMetric = metrics.find(m => m.code === 'symptom_energie')
  const moodMetric = metrics.find(m => m.code === 'symptom_stimmung')
  const sleepMetric = metrics.find(m => m.code === 'symptom_schlaf')

  // Create measurements for last 7 days
  for (let i = 0; i < 7; i++) {
    const measureDate = addDays(today, -i)
    const localDate = toYmd(measureDate)

    // Get or create TimeBox
    let timeBox = await prisma.timeBox.findFirst({
      where: { userId, localDate, kind: 'DAY' }
    })
    if (!timeBox) {
      const startAt = new Date(measureDate.getFullYear(), measureDate.getMonth(), measureDate.getDate())
      const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000)
      timeBox = await prisma.timeBox.create({
        data: { userId, localDate, kind: 'DAY', startAt, endAt }
      })
      await prisma.entity.create({
        data: { id: timeBox.id, userId, type: 'TIMEBOX' }
      })
    }

    // Create random measurements
    for (const metric of [energyMetric, moodMetric, sleepMetric]) {
      if (!metric) continue
      
      const exists = await prisma.measurement.findFirst({
        where: { userId, metricId: metric.id, timeBoxId: timeBox.id }
      })

      if (!exists) {
        await prisma.measurement.create({
          data: {
            userId,
            metricId: metric.id,
            timeBoxId: timeBox.id,
            valueNum: Math.floor(Math.random() * 5) + 5, // 5-10
            source: 'MANUAL',
          }
        })
        created++
      }
    }
    details.push(`Messwerte: ${localDate}`)
  }

  return { success: true, category: 'measurements', itemsCreated: created, details }
}

// =============================================================================
// AI GENERATION
// =============================================================================

async function generateWithAI(options: TestDataOptions): Promise<TestDataResult> {
  const { category, count = 5, customPrompt, userId } = options
  
  if (category === 'all') {
    return { success: false, category, itemsCreated: 0, error: 'AI mode does not support "all" category' }
  }

  const basePrompt = AI_PROMPTS[category].replace('{count}', String(count))
  const prompt = customPrompt 
    ? `${customPrompt}\n\nFormat: ${basePrompt}`
    : basePrompt

  const systemPrompt = `Du bist ein Testdaten-Generator. Generiere realistische, konsistente Testdaten.
Antworte NUR mit einem validen JSON-Array, keine Erklärungen.
Sprache: Deutsch (Schweiz).`

  try {
    const response = await makeAIRequest({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
    })

    // Extract text from response
    const text = response.choices?.[0]?.message?.content || ''
    
    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return { success: false, category, itemsCreated: 0, error: 'KI-Antwort enthielt kein valides JSON' }
    }

    const data = JSON.parse(jsonMatch[0])
    
    // Insert data based on category
    const result = await insertAIGeneratedData(category, data, userId)
    return result
  } catch (error) {
    return { 
      success: false, 
      category, 
      itemsCreated: 0, 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    }
  }
}

async function insertAIGeneratedData(
  category: TestDataCategory, 
  data: unknown[], 
  userId: string
): Promise<TestDataResult> {
  const details: string[] = []
  let created = 0

  switch (category) {
    case 'contacts':
      for (const item of data as Array<{ name: string; [key: string]: unknown }>) {
        const slug = toSlug(item.name)
        const exists = await prisma.contact.findFirst({ where: { userId, slug } })
        if (!exists) {
          const contact = await prisma.contact.create({
            data: {
              userId,
              slug,
              name: item.name,
              givenName: item.givenName as string | undefined,
              familyName: item.familyName as string | undefined,
              emailPrivate: item.emailPrivate as string | undefined,
              phonePrivate: item.phonePrivate as string | undefined,
              addressHome: item.addressHome as string | undefined,
              company: item.company as string | undefined,
              jobTitle: item.jobTitle as string | undefined,
              birthday: item.birthday ? new Date(item.birthday as string) : undefined,
              notes: item.notes as string | undefined,
            }
          })
          await prisma.entity.create({ data: { id: contact.id, userId, type: 'CONTACT' } })
          created++
          details.push(`KI-Kontakt: ${item.name}`)
        }
      }
      break

    case 'tasks':
      for (const item of data as Array<{ title: string; [key: string]: unknown }>) {
        const exists = await prisma.task.findFirst({ where: { userId, title: item.title } })
        if (!exists) {
          const dueDays = item.dueDays as number | undefined
          await prisma.task.create({
            data: {
              userId,
              title: item.title,
              description: item.description as string | undefined,
              dueDate: dueDays ? addDays(new Date(), dueDays) : undefined,
              taskType: (item.taskType as TaskType) || TaskType.GENERAL,
              priority: (item.priority as TaskPriority) || TaskPriority.MEDIUM,
              source: (item.source as TaskSource) || TaskSource.AI,
              status: 'PENDING',
            }
          })
          created++
          details.push(`KI-Task: ${item.title}`)
        }
      }
      break

    case 'locations':
      for (const item of data as Array<{ name: string; [key: string]: unknown }>) {
        const slug = toSlug(item.name)
        const exists = await prisma.location.findFirst({ where: { userId, slug } })
        if (!exists) {
          const location = await prisma.location.create({
            data: {
              userId,
              slug,
              name: item.name,
              address: item.address as string | undefined,
              lat: item.lat as number | undefined,
              lng: item.lng as number | undefined,
              poiType: (item.poiType as PoiType) || PoiType.OTHER,
            }
          })
          await prisma.entity.create({ data: { id: location.id, userId, type: EntityType.LOCATION } })
          created++
          details.push(`KI-Ort: ${item.name}`)
        }
      }
      break

    case 'habits':
      for (const item of data as Array<{ title: string; [key: string]: unknown }>) {
        const slug = toSlug(item.title)
        const exists = await prisma.habit.findFirst({ where: { userId, slug } })
        if (!exists) {
          const habit = await prisma.habit.create({
            data: {
              userId,
              slug,
              title: item.title,
              description: item.description as string | undefined,
              frequency: 'daily',
              isActive: true,
            }
          })
          await prisma.entity.create({ data: { id: habit.id, userId, type: EntityType.HABIT } })
          created++
          details.push(`KI-Gewohnheit: ${item.title}`)
        }
      }
      break

    case 'journal_entries':
      // Get or create daily_note type
      let dailyNoteType = await prisma.journalEntryType.findFirst({
        where: { userId, code: 'daily_note' }
      })
      if (!dailyNoteType) {
        dailyNoteType = await prisma.journalEntryType.create({
          data: { userId, code: 'daily_note', name: 'Tagesnotiz', icon: '📝', sortOrder: 0 }
        })
      }

      for (let i = 0; i < (data as Array<{ content: string }>).length; i++) {
        const item = data[i] as { content: string; mood?: number; energy?: number }
        const entryDate = addDays(new Date(), -i)
        const localDate = toYmd(entryDate)

        let timeBox = await prisma.timeBox.findFirst({
          where: { userId, localDate, kind: 'DAY' }
        })
        if (!timeBox) {
          const startAt = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate())
          const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000)
          timeBox = await prisma.timeBox.create({
            data: { userId, localDate, kind: 'DAY', startAt, endAt }
          })
          await prisma.entity.create({ data: { id: timeBox.id, userId, type: EntityType.TIMEBOX } })
        }

        const exists = await prisma.journalEntry.findFirst({
          where: { userId, timeBoxId: timeBox.id, typeId: dailyNoteType.id }
        })

        if (!exists) {
          const entry = await prisma.journalEntry.create({
            data: {
              userId,
              typeId: dailyNoteType.id,
              timeBoxId: timeBox.id,
              content: item.content,
            }
          })
          await prisma.entity.create({ data: { id: entry.id, userId, type: 'JOURNAL_ENTRY' } })
          created++
          details.push(`KI-Eintrag: ${localDate}`)
        }
      }
      break

    default:
      return { success: false, category, itemsCreated: 0, error: `Kategorie "${category}" wird für KI-Generierung nicht unterstützt` }
  }

  return { success: true, category, itemsCreated: created, details }
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

export async function generateTestData(options: TestDataOptions): Promise<TestDataResult[]> {
  const results: TestDataResult[] = []
  const { category, mode, userId } = options

  const categoriesToGenerate: TestDataCategory[] = category === 'all'
    ? ['contacts', 'tasks', 'locations', 'habits', 'journal_entries', 'measurements']
    : [category]

  for (const cat of categoriesToGenerate) {
    try {
      let result: TestDataResult

      if (mode === 'predefined') {
        switch (cat) {
          case 'contacts':
            result = await generatePredefinedContacts(userId)
            break
          case 'tasks':
            result = await generatePredefinedTasks(userId)
            break
          case 'locations':
            result = await generatePredefinedLocations(userId)
            break
          case 'habits':
            result = await generatePredefinedHabits(userId)
            break
          case 'journal_entries':
            result = await generatePredefinedJournalEntries(userId)
            break
          case 'measurements':
            result = await generatePredefinedMeasurements(userId)
            break
          default:
            result = { success: false, category: cat, itemsCreated: 0, error: `Unbekannte Kategorie: ${cat}` }
        }
      } else {
        result = await generateWithAI({ ...options, category: cat })
      }

      results.push(result)
    } catch (error) {
      results.push({
        success: false,
        category: cat,
        itemsCreated: 0,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      })
    }
  }

  return results
}

export { AI_PROMPTS }
