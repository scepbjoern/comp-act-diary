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
    { code: 'daily_note', name: 'Tagesnotiz', icon: '📝' },
    { code: 'reflection_week', name: 'Wochenreflexion', icon: '📅' },
    { code: 'reflection_month', name: 'Monatsreflexion', icon: '📆' },
  ]
  const result: Record<string, string> = {}
  for (const t of types) {
    let type = await prisma.journalEntryType.findFirst({ where: { code: t.code, userId: null } })
    if (!type) {
      type = await prisma.journalEntryType.create({
        data: { code: t.code, name: t.name, icon: t.icon }
      })
      console.log(`  Created: ${t.code}`)
    }
    result[t.code] = type.id
  }
  return result
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

async function main() {
  console.log('=== Starting seed ===\n')

  // 1. Seed system metrics (available for all users)
  await seedSystemMetrics()

  // 2. Seed journal entry types
  const journalTypes = await seedJournalEntryTypes()

  // 3. Create demo user with habits
  const { user: demoUser } = await createUserWithHabits('demo', 'Demo', 'demo')
  
  // Ensure today's TimeBox for demo user
  const today = new Date()
  const localDate = toYmd(today)
  const startAt = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000)
  
  let timeBox = await prisma.timeBox.findFirst({ 
    where: { userId: demoUser.id, localDate, kind: 'DAY' } 
  })
  if (!timeBox) {
    await prisma.timeBox.create({
      data: { userId: demoUser.id, localDate, kind: 'DAY', startAt, endAt }
    })
  }

  // 4. Create test user with full test data
  const { user: testUser, habits: testHabits } = await createUserWithHabits('test', 'Testy', 'test')
  await seedTestData(testUser.id, testHabits, journalTypes)

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
