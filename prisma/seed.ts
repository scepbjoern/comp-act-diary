import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const STANDARD_HABITS = [
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

const SYSTEM_METRICS = [
  { code: 'symptom_beschwerdefreiheit', name: 'Beschwerdefreiheit', minValue: 1, maxValue: 10, category: 'symptom', icon: '😌' },
  { code: 'symptom_energie', name: 'Energie', minValue: 1, maxValue: 10, category: 'symptom', icon: '⚡' },
  { code: 'symptom_stimmung', name: 'Stimmung', minValue: 1, maxValue: 10, category: 'symptom', icon: '😊' },
  { code: 'symptom_schlaf', name: 'Schlaf', minValue: 1, maxValue: 10, category: 'symptom', icon: '😴' },
  { code: 'symptom_entspannung', name: 'Entspannung', minValue: 1, maxValue: 10, category: 'symptom', icon: '🧘' },
  { code: 'symptom_heisshungerfreiheit', name: 'Heißhungerfreiheit', minValue: 1, maxValue: 10, category: 'symptom', icon: '🍎' },
  { code: 'symptom_bewegung', name: 'Bewegung', minValue: 1, maxValue: 10, category: 'symptom', icon: '🏃' },
  { code: 'bristol_stool', name: 'Bristol-Stuhlform', minValue: 1, maxValue: 7, category: 'health', icon: '💩' },
  { code: 'body_weight', name: 'Körpergewicht', minValue: 0, maxValue: 500, category: 'health', icon: '⚖️' },
]

function toSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Sample locations for Switzerland
const SAMPLE_LOCATIONS = [
  { name: 'Zuhause', address: 'Bahnhofstrasse 10, 8001 Zürich', lat: 47.3769, lng: 8.5417, poiType: 'HOME' as const },
  { name: 'Büro', address: 'Paradeplatz 1, 8001 Zürich', lat: 47.3697, lng: 8.5392, poiType: 'WORK' as const },
  { name: 'Fitnessstudio', address: 'Europaallee 21, 8004 Zürich', lat: 47.3782, lng: 8.5310, poiType: 'SPORT' as const },
  { name: 'Lieblings-Café', address: 'Niederdorfstrasse 15, 8001 Zürich', lat: 47.3726, lng: 8.5450, poiType: 'RESTAURANT' as const },
  { name: 'Hausarzt Dr. Müller', address: 'Seestrasse 42, 8002 Zürich', lat: 47.3625, lng: 8.5362, poiType: 'HEALTH' as const },
  { name: 'Migros City', address: 'Löwenstrasse 31, 8001 Zürich', lat: 47.3752, lng: 8.5365, poiType: 'SHOP' as const },
  { name: 'Zürichsee Uferweg', address: 'Utoquai, 8008 Zürich', lat: 47.3580, lng: 8.5510, poiType: 'NATURE' as const },
  { name: 'Hauptbahnhof Zürich', address: 'Bahnhofplatz, 8001 Zürich', lat: 47.3779, lng: 8.5403, poiType: 'TRANSPORT' as const },
]

// Sample notes for test data
const SAMPLE_NOTES = [
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

const WEEKLY_REFLECTIONS = [
  'Diese Woche war insgesamt sehr positiv. Ich habe mich gut an die Ernährungsregeln gehalten und spüre bereits erste Verbesserungen bei meiner Verdauung. Die Energie ist deutlich besser als letzte Woche.',
  'Eine herausfordernde Woche mit einigen sozialen Events, bei denen es schwer war, die Regeln einzuhalten. Trotzdem bin ich zufrieden, dass ich standhaft geblieben bin.',
  'Sehr gute Woche! Der Schlaf hat sich merklich verbessert und ich wache morgens erholter auf. Die Fermentationsprodukte scheinen zu wirken.',
  'Diese Woche hatte ich an zwei Tagen leichte Rückfälle (Kaffee), aber insgesamt bin ich auf einem guten Weg. Nächste Woche möchte ich es besser machen.',
]

// Schweizer Testdaten für Kontakte
const SAMPLE_CONTACTS = [
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
    socialUrls: JSON.stringify([
      { type: 'linkedin', url: 'https://linkedin.com/in/sarahweber' },
      { type: 'twitter', url: 'https://twitter.com/sarahweber' }
    ]),
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

// Beziehungen zwischen Kontakten
const SAMPLE_RELATIONS = [
  { personAIndex: 0, personBIndex: 2, relationType: 'Freund' },
  { personAIndex: 1, personBIndex: 3, relationType: 'Kollegin' },
  { personAIndex: 0, personBIndex: 1, relationType: 'Bekannter' },
]

// Beispiel-Tasks mit erweiterten Feldern (taskType, priority, source, isFavorite)
const SAMPLE_TASKS: Array<{
  contactIndex?: number
  title: string
  description?: string
  dueDate?: Date
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  taskType: 'IMMEDIATE' | 'REFLECTION' | 'PLANNED_INTERACTION' | 'FOLLOW_UP' | 'RESEARCH' | 'HABIT_RELATED' | 'GENERAL'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  source: 'MANUAL' | 'AI'
  aiConfidence?: number
  isFavorite?: boolean
}> = [
  // Kontaktbezogene Tasks
  { contactIndex: 0, title: 'Max zum Mittagessen einladen', description: 'Im Restaurant Hiltl treffen', dueDate: new Date(2026, 0, 25), status: 'PENDING', taskType: 'PLANNED_INTERACTION', priority: 'MEDIUM', source: 'MANUAL', isFavorite: true },
  { contactIndex: 1, title: 'Fachbuch-Empfehlung nachfragen', description: 'Nach dem ML-Buch fragen', dueDate: new Date(2026, 0, 15), status: 'COMPLETED', taskType: 'FOLLOW_UP', priority: 'LOW', source: 'MANUAL' },
  { contactIndex: 3, title: 'Startup-Pitch anschauen', description: 'Feedback zur App geben', dueDate: new Date(2026, 0, 28), status: 'PENDING', taskType: 'PLANNED_INTERACTION', priority: 'HIGH', source: 'MANUAL', isFavorite: true },
  { contactIndex: 5, title: 'Termin für Checkup vereinbaren', dueDate: new Date(2026, 0, 30), status: 'PENDING', taskType: 'IMMEDIATE', priority: 'HIGH', source: 'MANUAL' },
  // Tasks ohne Kontakt
  { title: 'Meditation wieder aufnehmen', description: 'Täglich 10 Minuten', dueDate: new Date(2026, 0, 22), status: 'PENDING', taskType: 'HABIT_RELATED', priority: 'MEDIUM', source: 'AI', aiConfidence: 0.85 },
  { title: 'Steuererklärung vorbereiten', description: 'Belege sammeln', dueDate: new Date(2026, 1, 28), status: 'PENDING', taskType: 'GENERAL', priority: 'LOW', source: 'MANUAL' },
  { title: 'Über Jobwechsel nachdenken', description: 'Pro/Contra Liste erstellen', status: 'PENDING', taskType: 'REFLECTION', priority: 'MEDIUM', source: 'AI', aiConfidence: 0.72 },
  { title: 'Neue Therapiemöglichkeiten recherchieren', description: 'ACT und MBCT vergleichen', dueDate: new Date(2026, 0, 31), status: 'PENDING', taskType: 'RESEARCH', priority: 'MEDIUM', source: 'AI', aiConfidence: 0.91, isFavorite: true },
  { title: 'Bei Bewerbung nachfragen', description: 'Nach 2 Wochen noch keine Antwort', dueDate: new Date(2026, 0, 20), status: 'PENDING', taskType: 'FOLLOW_UP', priority: 'HIGH', source: 'MANUAL', isFavorite: true },
  { title: 'Altes Projekt abschliessen', description: 'Dokumentation fertigstellen', dueDate: new Date(2026, 0, 18), status: 'CANCELLED', taskType: 'GENERAL', priority: 'LOW', source: 'MANUAL' },
  // Überfällige Tasks für Tests
  { title: 'Zahnarzttermin vereinbaren', dueDate: new Date(2026, 0, 10), status: 'PENDING', taskType: 'IMMEDIATE', priority: 'HIGH', source: 'MANUAL' },
  { title: 'Bücher zurückgeben', description: 'Bibliothek Oerlikon', dueDate: new Date(2026, 0, 15), status: 'PENDING', taskType: 'IMMEDIATE', priority: 'LOW', source: 'MANUAL' },
]

// Beispiel-Notifications
const SAMPLE_NOTIFICATIONS = [
  { type: 'BIRTHDAY_REMINDER' as const, title: 'Geburtstag: Max Mustermann', message: 'Max Mustermann hat am 15. Juni Geburtstag.' },
  { type: 'GENERAL' as const, title: 'Willkommen bei PRM', message: 'Dein Personal Relationship Manager ist bereit.' },
]

const MONTHLY_REFLECTION = `
# Monatsrückblick November 2025

## Was lief gut?
- Konsequente Einhaltung der Ernährungsregeln an den meisten Tagen
- Deutliche Verbesserung der Schlafqualität
- Mehr Energie im Alltag
- Regelmäßige Bewegung integriert

## Was kann ich verbessern?
- Abends manchmal zu spät gegessen
- Mehr Wasser trinken
- Stressmanagement weiter ausbauen

## Highlights des Monats
- Erste selbstgemachte Fermente erfolgreich!
- Gewicht stabilisiert sich
- Positive Rückmeldungen vom Umfeld

## Ziele für nächsten Monat
- 100% Compliance bei den Gewohnheiten anstreben
- Neue Rezepte für fermentierte Lebensmittel ausprobieren
- Meditation in den Alltag integrieren
`

async function seedContactsAndRelations(userId: string) {
  console.log('Seeding contacts, relations, tasks, and notifications...')
  
  const contactIds: string[] = []
  
  // Erstelle Kontakte
  for (const contactData of SAMPLE_CONTACTS) {
    const slug = toSlug(contactData.name)
    let contact = await prisma.contact.findFirst({
      where: { userId, slug }
    })
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          userId,
          slug,
          name: contactData.name,
          givenName: contactData.givenName,
          familyName: contactData.familyName,
          nickname: contactData.nickname,
          emailPrivate: contactData.emailPrivate,
          emailWork: contactData.emailWork,
          phonePrivate: contactData.phonePrivate,
          phoneWork: contactData.phoneWork,
          addressHome: contactData.addressHome,
          addressWork: contactData.addressWork,
          company: contactData.company,
          jobTitle: contactData.jobTitle,
          birthday: contactData.birthday,
          notes: contactData.notes,
          isFavorite: contactData.isFavorite ?? false,
          websiteUrl: contactData.websiteUrl,
          socialUrls: contactData.socialUrls ? JSON.parse(contactData.socialUrls as string) : undefined,
        }
      })
    }
    contactIds.push(contact.id)
  }
  console.log(`  Created ${contactIds.length} contacts`)
  
  // Erstelle Beziehungen zwischen Kontakten
  for (const rel of SAMPLE_RELATIONS) {
    const personAId = contactIds[rel.personAIndex]
    const personBId = contactIds[rel.personBIndex]
    if (personAId && personBId) {
      const exists = await prisma.personRelation.findFirst({
        where: { personAId, personBId, relationType: rel.relationType }
      })
      if (!exists) {
        await prisma.personRelation.create({
          data: {
            userId,
            personAId,
            personBId,
            relationType: rel.relationType,
          }
        })
      }
    }
  }
  console.log(`  Created ${SAMPLE_RELATIONS.length} relations`)
  
  // Erstelle Interaktionen (z.B. Treffen, Anrufe)
  const interactionTypes: Array<{ contactIndex: number; kind: 'MEETING' | 'CALL' | 'EMAIL'; notes: string; daysAgo: number }> = [
    { contactIndex: 0, kind: 'MEETING', notes: 'Mittagessen im Restaurant zum Löwen', daysAgo: 5 },
    { contactIndex: 0, kind: 'CALL', notes: 'Kurzes Telefonat wegen Weihnachtsfeier', daysAgo: 2 },
    { contactIndex: 1, kind: 'EMAIL', notes: 'Paper-Empfehlung erhalten', daysAgo: 10 },
    { contactIndex: 3, kind: 'MEETING', notes: 'Startup-Pitch besucht', daysAgo: 14 },
    { contactIndex: 5, kind: 'MEETING', notes: 'Checkup-Termin', daysAgo: 30 },
  ]
  
  for (const interaction of interactionTypes) {
    const contactId = contactIds[interaction.contactIndex]
    if (contactId) {
      const occurredAt = new Date()
      occurredAt.setDate(occurredAt.getDate() - interaction.daysAgo)
      
      const exists = await prisma.interaction.findFirst({
        where: { contactId, kind: interaction.kind, notes: interaction.notes }
      })
      if (!exists) {
        await prisma.interaction.create({
          data: {
            userId,
            contactId,
            kind: interaction.kind,
            notes: interaction.notes,
            occurredAt,
          }
        })
      }
    }
  }
  console.log(`  Created ${interactionTypes.length} interactions`)
  
  // Erstelle Tasks (mit und ohne Kontakt)
  for (const taskData of SAMPLE_TASKS) {
    const contactId = taskData.contactIndex !== undefined ? contactIds[taskData.contactIndex] : null
    const exists = await prisma.task.findFirst({
      where: { userId, title: taskData.title }
    })
    if (!exists) {
      await prisma.task.create({
        data: {
          userId,
          contactId,
          title: taskData.title,
          description: taskData.description,
          dueDate: taskData.dueDate,
          status: taskData.status,
          taskType: taskData.taskType,
          priority: taskData.priority,
          source: taskData.source,
          aiConfidence: taskData.aiConfidence,
          isFavorite: taskData.isFavorite ?? false,
          completedAt: taskData.status === 'COMPLETED' ? new Date() : undefined,
        }
      })
    }
  }
  console.log(`  Created ${SAMPLE_TASKS.length} tasks`)
  
  // Erstelle Notifications
  for (const notif of SAMPLE_NOTIFICATIONS) {
    const exists = await prisma.notification.findFirst({
      where: { userId, title: notif.title }
    })
    if (!exists) {
      await prisma.notification.create({
        data: {
          userId,
          type: notif.type,
          title: notif.title,
          message: notif.message,
        }
      })
    }
  }
  console.log(`  Created ${SAMPLE_NOTIFICATIONS.length} notifications`)
  
  return contactIds
}

async function seedSystemMetrics() {
  console.log('Seeding system MetricDefinitions...')
  for (const metric of SYSTEM_METRICS) {
    const exists = await prisma.metricDefinition.findFirst({ 
      where: { code: metric.code, userId: null } 
    })
    if (!exists) {
      await prisma.metricDefinition.create({
        data: {
          code: metric.code,
          name: metric.name,
          dataType: 'NUMERIC',
          minValue: metric.minValue,
          maxValue: metric.maxValue,
          category: metric.category,
          icon: metric.icon,
          origin: 'SYSTEM',
        },
      })
      console.log(`  Created: ${metric.code}`)
    }
  }
}

async function seedJournalEntryTypes() {
  console.log('Seeding JournalEntryTypes...')
  const types = [
    { code: 'daily_note', name: 'Tagesnotiz', icon: '📝', bgColorClass: 'bg-blue-100 dark:bg-blue-900/30' },
    { code: 'reflection_week', name: 'Wochenreflexion', icon: '📅', bgColorClass: 'bg-purple-100 dark:bg-purple-900/30' },
    { code: 'reflection_month', name: 'Monatsreflexion', icon: '📆', bgColorClass: 'bg-purple-100 dark:bg-purple-900/30' },
    { code: 'diary', name: 'Allgemein', icon: '📝', bgColorClass: 'bg-green-100 dark:bg-green-900/30' },
  ]
  const result: Record<string, string> = {}
  for (const t of types) {
    let type = await prisma.journalEntryType.findFirst({ where: { code: t.code, userId: null } })
    if (!type) {
      type = await prisma.journalEntryType.create({
        data: { code: t.code, name: t.name, icon: t.icon, bgColorClass: t.bgColorClass }
      })
      console.log(`  Created: ${t.code}`)
    } else {
      // Always sync name, icon, and bgColorClass for system types
      type = await prisma.journalEntryType.update({
        where: { id: type.id },
        data: { name: t.name, icon: t.icon, bgColorClass: t.bgColorClass }
      })
      console.log(`  Updated: ${t.code} → ${t.name}`)
    }
    result[t.code] = type.id
  }
  return result
}

// System templates with field definitions
async function seedSystemTemplates(journalTypes: Record<string, string>) {
  console.log('Seeding System Templates...')

  // Weekly reflection template with structured fields
  const weeklyReflectionFields = [
    { id: 'changed', label: 'Was hat sich verändert?', icon: '🔄', type: 'textarea', order: 0, required: true },
    { id: 'gratitude', label: 'Wofür bin ich dankbar?', icon: '🙏', type: 'textarea', order: 1, required: true },
    { id: 'vows', label: 'Meine Vorsätze', icon: '🎯', type: 'textarea', order: 2, required: false },
    { id: 'remarks', label: 'Sonstige Bemerkungen', icon: '💭', type: 'textarea', order: 3, required: false },
  ]

  const weeklyReflectionAIConfig = {
    contentModel: 'gpt-4o-mini',
    titleModel: 'gpt-4o-mini',
    summaryModel: 'gpt-4o-mini',
    analysisModel: 'gpt-4o',
    segmentationModel: 'gpt-4o-mini',
  }

  // Simple diary template (1 field, no label = minimal)
  const diaryFields = [
    { id: 'content', type: 'textarea', order: 0, required: false },
  ]

  // Monthly reflection template
  const monthlyReflectionFields = [
    { id: 'highlights', label: 'Highlights des Monats', icon: '✨', type: 'textarea', order: 0, required: true },
    { id: 'challenges', label: 'Herausforderungen', icon: '💪', type: 'textarea', order: 1, required: false },
    { id: 'learnings', label: 'Was habe ich gelernt?', icon: '📚', type: 'textarea', order: 2, required: false },
    { id: 'goals', label: 'Ziele für nächsten Monat', icon: '🎯', type: 'textarea', order: 3, required: false },
  ]

  const templates = [
    {
      name: 'Wochenreflexion (Standard)',
      description: 'Strukturierte Reflexion mit Veränderungen, Dankbarkeit und Vorsätzen',
      typeId: journalTypes['reflection_week'],
      fields: weeklyReflectionFields,
      aiConfig: weeklyReflectionAIConfig,
    },
    {
      name: 'Einfaches Tagebuch',
      description: 'Minimales Template für freies Schreiben ohne Struktur',
      typeId: journalTypes['diary'],
      fields: diaryFields,
      aiConfig: { contentModel: 'gpt-4o-mini', titleModel: 'gpt-4o-mini' },
    },
    {
      name: 'Monatsreflexion',
      description: 'Rückblick auf den Monat mit Highlights und Learnings',
      typeId: journalTypes['reflection_month'],
      fields: monthlyReflectionFields,
      aiConfig: weeklyReflectionAIConfig,
    },
  ]

  for (const t of templates) {
    let template = await prisma.journalTemplate.findFirst({
      where: { name: t.name, userId: null }
    })
    if (!template) {
      template = await prisma.journalTemplate.create({
        data: {
          name: t.name,
          description: t.description,
          typeId: t.typeId,
          fields: t.fields,
          aiConfig: t.aiConfig,
          origin: 'SYSTEM',
        }
      })
      console.log(`  Created template: ${t.name}`)
    }
  }
}

async function createUserWithHabits(username: string, displayName: string, password: string) {
  console.log(`Creating user: ${username}...`)
  let user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    user = await prisma.user.create({
      data: {
        username,
        displayName,
        passwordHash: await bcrypt.hash(password, 10),
      },
    })
    console.log(`  Created user: ${username}`)
  }

  // Seed standard habits
  const habits: { id: string; title: string }[] = []
  for (let i = 0; i < STANDARD_HABITS.length; i++) {
    const title = STANDARD_HABITS[i]
    const slug = toSlug(title)
    let habit = await prisma.habit.findFirst({ where: { title, userId: user.id } })
    if (!habit) {
      habit = await prisma.habit.create({
        data: { title, slug, userId: user.id, isActive: true, sortOrder: i },
      })
    }
    habits.push({ id: habit.id, title: habit.title })
  }
  console.log(`  Created ${habits.length} habits`)

  return { user, habits }
}

async function seedTestData(
  userId: string,
  habits: { id: string; title: string }[],
  journalTypes: Record<string, string>
) {
  console.log('Seeding test data for November 2025...')
  
  // Get metric IDs
  const symptomMetrics = await prisma.metricDefinition.findMany({
    where: { category: 'symptom', userId: null }
  })
  const stoolMetric = await prisma.metricDefinition.findFirst({
    where: { code: 'bristol_stool', userId: null }
  })
  const weightMetric = await prisma.metricDefinition.findFirst({
    where: { code: 'body_weight', userId: null }
  })

  // Create TimeBoxes and data for each day in November 2025
  const startDate = new Date(2025, 10, 1) // November 1, 2025
  const endDate = new Date(2025, 10, 30) // November 30, 2025
  
  let currentWeight = 78.5 // Starting weight
  const weeklyTimeBoxIds: string[] = []
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const localDate = toYmd(d)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    
    // Create or find TimeBox for day
    let timeBox = await prisma.timeBox.findFirst({
      where: { userId, localDate, kind: 'DAY' }
    })
    if (!timeBox) {
      timeBox = await prisma.timeBox.create({
        data: { userId, localDate, kind: 'DAY', startAt: dayStart, endAt: dayEnd }
      })
      // Create corresponding Entity for TimeBox (required for image generation)
      await prisma.entity.create({
        data: {
          id: timeBox.id,
          userId,
          type: 'TIMEBOX',
        }
      })
    } else {
      // Ensure Entity exists for existing TimeBox
      const entityExists = await prisma.entity.findUnique({ where: { id: timeBox.id } })
      if (!entityExists) {
        await prisma.entity.create({
          data: {
            id: timeBox.id,
            userId,
            type: 'TIMEBOX',
          }
        })
      }
    }

    // Create DayEntry
    let dayEntry = await prisma.dayEntry.findFirst({
      where: { userId, timeBoxId: timeBox.id }
    })
    if (!dayEntry) {
      dayEntry = await prisma.dayEntry.create({
        data: {
          userId,
          timeBoxId: timeBox.id,
          dayRating: randomInt(3, 5) as 1 | 2 | 3 | 4 | 5,
        }
      })
    }

    // Create symptom measurements (random values 5-10 to simulate generally good progress)
    for (const metric of symptomMetrics) {
      const exists = await prisma.measurement.findFirst({
        where: { metricId: metric.id, timeBoxId: timeBox.id, userId }
      })
      if (!exists) {
        await prisma.measurement.create({
          data: {
            metricId: metric.id,
            userId,
            timeBoxId: timeBox.id,
            valueNum: randomInt(5, 10),
            source: 'MANUAL',
          }
        })
      }
    }

    // Create stool measurement (Bristol scale 1-7, mostly 3-5 for normal)
    if (stoolMetric) {
      const exists = await prisma.measurement.findFirst({
        where: { metricId: stoolMetric.id, timeBoxId: timeBox.id, userId }
      })
      if (!exists) {
        await prisma.measurement.create({
          data: {
            metricId: stoolMetric.id,
            userId,
            timeBoxId: timeBox.id,
            valueNum: randomInt(3, 5),
            source: 'MANUAL',
          }
        })
      }
    }

    // Create weight measurement (slight fluctuation)
    if (weightMetric) {
      currentWeight += (Math.random() - 0.5) * 0.4 // +/- 0.2kg per day
      const exists = await prisma.measurement.findFirst({
        where: { metricId: weightMetric.id, timeBoxId: timeBox.id, userId }
      })
      if (!exists) {
        await prisma.measurement.create({
          data: {
            metricId: weightMetric.id,
            userId,
            timeBoxId: timeBox.id,
            valueNum: Math.round(currentWeight * 10) / 10,
            source: 'MANUAL',
          }
        })
      }
    }

    // Create habit check-ins (randomly check 8-12 habits as done)
    const habitsToCheck = randomInt(8, 12)
    const shuffledHabits = [...habits].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(habitsToCheck, habits.length); i++) {
      const habit = shuffledHabits[i]
      const exists = await prisma.habitCheckIn.findFirst({
        where: { habitId: habit.id, timeBoxId: timeBox.id }
      })
      if (!exists) {
        await prisma.habitCheckIn.create({
          data: {
            habitId: habit.id,
            userId,
            timeBoxId: timeBox.id,
            status: 'DONE',
          }
        })
      }
    }

    // Create daily note (random sample note)
    if (journalTypes['daily_note']) {
      const exists = await prisma.journalEntry.findFirst({
        where: { userId, timeBoxId: timeBox.id, typeId: journalTypes['daily_note'] }
      })
      if (!exists && Math.random() > 0.3) { // 70% chance of having a note
        await prisma.journalEntry.create({
          data: {
            userId,
            typeId: journalTypes['daily_note'],
            timeBoxId: timeBox.id,
            content: randomChoice(SAMPLE_NOTES),
          }
        })
      }
    }

    // Track week ends for weekly reflections
    const dayOfWeek = d.getDay()
    if (dayOfWeek === 0) { // Sunday
      weeklyTimeBoxIds.push(timeBox.id)
    }
  }

  console.log('  Created daily data for 30 days')

  // Create weekly reflections
  if (journalTypes['reflection_week']) {
    for (let i = 0; i < weeklyTimeBoxIds.length && i < WEEKLY_REFLECTIONS.length; i++) {
      const exists = await prisma.journalEntry.findFirst({
        where: { userId, timeBoxId: weeklyTimeBoxIds[i], typeId: journalTypes['reflection_week'] }
      })
      if (!exists) {
        await prisma.journalEntry.create({
          data: {
            userId,
            typeId: journalTypes['reflection_week'],
            timeBoxId: weeklyTimeBoxIds[i],
            title: `Wochenreflexion KW ${44 + i}`,
            content: WEEKLY_REFLECTIONS[i],
          }
        })
      }
    }
    console.log(`  Created ${Math.min(weeklyTimeBoxIds.length, WEEKLY_REFLECTIONS.length)} weekly reflections`)
  }

  // Create monthly reflection (on last day of month)
  if (journalTypes['reflection_month']) {
    // Create a MONTH TimeBox for monthly reflection
    let monthTimeBox = await prisma.timeBox.findFirst({
      where: { userId, localDate: '2025-11-01', kind: 'MONTH' }
    })
    if (!monthTimeBox) {
      monthTimeBox = await prisma.timeBox.create({
        data: {
          userId,
          localDate: '2025-11-01',
          kind: 'MONTH',
          startAt: new Date(2025, 10, 1),
          endAt: new Date(2025, 11, 1),
        }
      })
      // Create corresponding Entity for MONTH TimeBox
      await prisma.entity.create({
        data: {
          id: monthTimeBox.id,
          userId,
          type: 'TIMEBOX',
        }
      })
    } else {
      // Ensure Entity exists for existing MONTH TimeBox
      const entityExists = await prisma.entity.findUnique({ where: { id: monthTimeBox.id } })
      if (!entityExists) {
        await prisma.entity.create({
          data: {
            id: monthTimeBox.id,
            userId,
            type: 'TIMEBOX',
          }
        })
      }
    }
    const exists = await prisma.journalEntry.findFirst({
      where: { userId, timeBoxId: monthTimeBox.id, typeId: journalTypes['reflection_month'] }
    })
    if (!exists) {
      await prisma.journalEntry.create({
        data: {
          userId,
          typeId: journalTypes['reflection_month'],
          timeBoxId: monthTimeBox.id,
          title: 'Monatsreflexion November 2025',
          content: MONTHLY_REFLECTION,
        }
      })
      console.log('  Created monthly reflection')
    }
  }

  // Create bookmarks/links
  const SAMPLE_LINKS = [
    { title: 'Fairment Shop', url: 'https://www.fairment.de/', description: 'Fermentationsprodukte und Starter-Kulturen' },
    { title: 'Darmgesundheit Wiki', url: 'https://de.wikipedia.org/wiki/Darmflora', description: 'Wikipedia-Artikel zur Darmflora' },
    { title: 'Fermentieren lernen', url: 'https://www.fairment.de/wissen/', description: 'Anleitungen und Rezepte' },
    { title: 'Bristol-Stuhlformen-Skala', url: 'https://de.wikipedia.org/wiki/Bristol-Stuhlformen-Skala', description: 'Referenz zur Stuhlbewertung' },
  ]
  for (const link of SAMPLE_LINKS) {
    const exists = await prisma.bookmark.findFirst({
      where: { userId, url: link.url }
    })
    if (!exists) {
      await prisma.bookmark.create({
        data: {
          userId,
          title: link.title,
          url: link.url,
          description: link.description,
        }
      })
    }
  }
  console.log(`  Created ${SAMPLE_LINKS.length} bookmarks`)

  // Create a custom user symptom
  let customSymptom = await prisma.metricDefinition.findFirst({
    where: { userId, category: 'user_symptom', code: 'kopfschmerzen' }
  })
  if (!customSymptom) {
    customSymptom = await prisma.metricDefinition.create({
      data: {
        userId,
        code: 'kopfschmerzen',
        name: 'Kopfschmerzen',
        dataType: 'NUMERIC',
        minValue: 1,
        maxValue: 10,
        category: 'user_symptom',
        icon: '🤕',
        origin: 'USER',
      }
    })
    console.log('  Created custom symptom: Kopfschmerzen')
    
    // Add some measurements for it (random days with headaches)
    const timeBoxes = await prisma.timeBox.findMany({
      where: { userId, kind: 'DAY', localDate: { gte: '2025-11-01', lte: '2025-11-30' } }
    })
    for (const tb of timeBoxes) {
      if (Math.random() > 0.7) { // 30% chance of headache
        await prisma.measurement.create({
          data: {
            metricId: customSymptom.id,
            userId,
            timeBoxId: tb.id,
            valueNum: randomInt(2, 6), // Lower values = less headache
            source: 'MANUAL',
          }
        })
      }
    }
  }
}

async function seedLocations(userId: string) {
  console.log('Seeding locations...')
  
  const locationIds: string[] = []
  
  for (const loc of SAMPLE_LOCATIONS) {
    let location = await prisma.location.findFirst({
      where: { userId, name: loc.name }
    })
    if (!location) {
      location = await prisma.location.create({
        data: {
          userId,
          slug: loc.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
          name: loc.name,
          address: loc.address,
          lat: loc.lat,
          lng: loc.lng,
          poiType: loc.poiType,
        }
      })
      // Create corresponding Entity for Location
      await prisma.entity.create({
        data: {
          id: location.id,
          userId,
          type: 'LOCATION',
        }
      })
    }
    locationIds.push(location.id)
  }
  console.log(`  Created ${locationIds.length} locations`)
  
  // Create some location visits for the test data
  const timeBoxes = await prisma.timeBox.findMany({
    where: { userId, kind: 'DAY', localDate: { gte: '2025-11-01', lte: '2025-11-30' } },
    orderBy: { localDate: 'asc' }
  })
  
  let visitCount = 0
  for (const tb of timeBoxes) {
    // Each day, visit 2-4 random locations
    const numVisits = randomInt(2, 4)
    const visitedToday = new Set<string>()
    
    for (let i = 0; i < numVisits; i++) {
      const locationId = randomChoice(locationIds)
      if (visitedToday.has(locationId)) continue
      visitedToday.add(locationId)
      
      const exists = await prisma.locationVisit.findFirst({
        where: { userId, locationId, timeBoxId: tb.id }
      })
      if (!exists) {
        // Random arrival time during the day
        const tbDate = new Date(tb.startAt)
        const arrivalHour = randomInt(7, 20)
        const arrivalMinute = randomInt(0, 59)
        const arrivedAt = new Date(tbDate.getFullYear(), tbDate.getMonth(), tbDate.getDate(), arrivalHour, arrivalMinute)
        const durationMinutes = randomInt(15, 180)
        const departedAt = new Date(arrivedAt.getTime() + durationMinutes * 60 * 1000)
        
        await prisma.locationVisit.create({
          data: {
            userId,
            locationId,
            timeBoxId: tb.id,
            arrivedAt,
            departedAt,
          }
        })
        visitCount++
      }
    }
  }
  console.log(`  Created ${visitCount} location visits`)
  
  return locationIds
}

async function main() {
  console.log('=== Starting seed ===\n')

  // 1. Seed system metrics (available for all users)
  await seedSystemMetrics()

  // 2. Seed journal entry types
  const journalTypes = await seedJournalEntryTypes()

  // 2b. Seed system templates for journal entries
  await seedSystemTemplates(journalTypes)

  // 3. Create demo user with habits
  const { user: demoUser } = await createUserWithHabits('demo', 'Demo', 'demo')
  
  // Ensure today's TimeBox for demo user (with Entity)
  const today = new Date()
  const localDate = toYmd(today)
  const startAt = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000)
  
  let timeBox = await prisma.timeBox.findFirst({ 
    where: { userId: demoUser.id, localDate, kind: 'DAY' } 
  })
  if (!timeBox) {
    timeBox = await prisma.timeBox.create({
      data: { userId: demoUser.id, localDate, kind: 'DAY', startAt, endAt }
    })
    // Create corresponding Entity for demo user's TimeBox
    await prisma.entity.create({
      data: {
        id: timeBox.id,
        userId: demoUser.id,
        type: 'TIMEBOX',
      }
    })
  } else {
    // Ensure Entity exists
    const entityExists = await prisma.entity.findUnique({ where: { id: timeBox.id } })
    if (!entityExists) {
      await prisma.entity.create({
        data: {
          id: timeBox.id,
          userId: demoUser.id,
          type: 'TIMEBOX',
        }
      })
    }
  }

  // 4. Create test user with full test data
  const { user: testUser, habits: testHabits } = await createUserWithHabits('test', 'Testy', 'test')
  await seedTestData(testUser.id, testHabits, journalTypes)
  
  // 5. Seed contacts, relations, tasks and notifications for test user
  await seedContactsAndRelations(testUser.id)
  
  // 6. Seed locations and visits for test user
  await seedLocations(testUser.id)

  console.log('\n=== Seed completed ===')
  console.log('Users created:')
  console.log('  - demo / demo (empty, for fresh start)')
  console.log('  - test / test (with November 2025 test data)')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
