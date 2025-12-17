/**
 * Diarium Import Script für CompACT Diary
 * 
 * Importiert Tagebucheinträge aus einem Diarium JSON-Export.
 * 
 * Verwendung:
 *   npx ts-node scripts/import-diarium.ts <path-to-json> [--dry-run]
 * 
 * Beispiel:
 *   npx ts-node scripts/import-diarium.ts uploads/temp/Diarium_2022-04-13_2024-12-25.json
 */

import { PrismaClient, TimeBoxKind, TaxonomyKind, TaxonomyOrigin, TaggingSource, MeasurementSource, Prisma } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface DiariumEntry {
  date: string
  heading?: string
  html: string
  rating?: number
  location?: [number, number]
  tags?: string[]
  people?: string[]
  tracker?: string[]
  weather?: string
}

/**
 * Konvertiert HTML zu einfachem Text/Markdown
 */
function htmlToText(html: string): string {
  if (!html) return ''
  
  return html
    // Ersetze <br> und <br/> durch Zeilenumbrüche
    .replace(/<br\s*\/?>/gi, '\n')
    // Ersetze </p> durch doppelten Zeilenumbruch
    .replace(/<\/p>/gi, '\n\n')
    // Ersetze </li> durch Zeilenumbruch
    .replace(/<\/li>/gi, '\n')
    // Ersetze <li> durch Listenpunkt
    .replace(/<li>/gi, '- ')
    // Ersetze <ol> und <ul> Tags (werden ignoriert, da <li> bereits behandelt)
    .replace(/<\/?[ou]l>/gi, '')
    // Ersetze <strong> und <b> durch **
    .replace(/<strong>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<b>/gi, '**')
    .replace(/<\/b>/gi, '**')
    // Ersetze <em> und <i> durch *
    .replace(/<em>/gi, '*')
    .replace(/<\/em>/gi, '*')
    .replace(/<i>/gi, '*')
    .replace(/<\/i>/gi, '*')
    // Entferne alle verbleibenden HTML-Tags
    .replace(/<[^>]*>/g, '')
    // Dekodiere HTML-Entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Entferne mehrfache Leerzeilen
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Erstellt einen URL-freundlichen Slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Entferne Akzente
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

/**
 * Extrahiert Datum ohne Zeit (für localDate)
 */
function getLocalDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toISOString().split('T')[0]
}

/**
 * Berechnet Start- und End-Zeitpunkt für einen Tag
 */
function getDayBounds(localDate: string, timezone: string = 'Europe/Zurich'): { startAt: Date, endAt: Date } {
  // Für Einfachheit: Verwende UTC-Zeiten basierend auf dem Datum
  const startAt = new Date(`${localDate}T00:00:00.000Z`)
  const endAt = new Date(`${localDate}T23:59:59.999Z`)
  return { startAt, endAt }
}

/**
 * Konvertiert Diarium Rating (1-5) zu DayRating (1-10)
 */
function convertRating(diariumRating?: number): number | null {
  if (!diariumRating || diariumRating < 1 || diariumRating > 5) return null
  return diariumRating * 2
}

/**
 * Parst Weather-String zu JSON
 */
function parseWeather(weatherStr?: string): object | null {
  if (!weatherStr) return null
  
  // Format: "23°C, Teilweise bewölkt."
  const tempMatch = weatherStr.match(/(-?\d+)°C/)
  const temp = tempMatch ? parseInt(tempMatch[1]) : null
  
  const condition = weatherStr.replace(/^-?\d+°C,?\s*/, '').replace(/\.$/, '').trim()
  
  return {
    temperature: temp,
    condition: condition || null,
    raw: weatherStr
  }
}

/**
 * Parst Tracker-String und extrahiert Wert
 * Beispiele: "Schritte: 3.500", "Gewicht: 75", "Schritte: 5,0"
 * Bei Schritten: 5,0 = 5000, 5.000 = 5000
 */
function parseTrackerValue(trackerStr: string): { type: 'weight' | 'steps' | null, value: number | null } {
  const weightMatch = trackerStr.match(/Gewicht:\s*([\d,.]+)/i)
  if (weightMatch) {
    // Gewicht: Komma als Dezimaltrenner
    const value = parseFloat(weightMatch[1].replace(',', '.'))
    return { type: 'weight', value: isNaN(value) ? null : value }
  }
  
  const stepsMatch = trackerStr.match(/Schritte:\s*([\d,.]+)/i)
  if (stepsMatch) {
    // Schritte: Punkte und Kommas ignorieren (Tausendertrennzeichen)
    // 5,0 = 5000, 5.000 = 5000, 3.500 = 3500
    let stepsStr = stepsMatch[1]
    // Entferne alle Punkte und Kommas
    stepsStr = stepsStr.replace(/[.,]/g, '')
    const value = parseInt(stepsStr)
    return { type: 'steps', value: isNaN(value) ? null : value }
  }
  
  return { type: null, value: null }
}

/**
 * Hauptfunktion zum Importieren
 */
async function importDiarium(jsonPath: string, dryRun: boolean = false) {
  console.log(`\n📥 Lade Diarium-Export: ${jsonPath}`)
  console.log(`   Modus: ${dryRun ? 'DRY-RUN (keine Änderungen)' : 'LIVE-IMPORT'}`)
  
  // Lade JSON
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8')
  const entries: DiariumEntry[] = JSON.parse(jsonContent)
  
  console.log(`   Gefundene Einträge: ${entries.length}`)
  
  // Finde den User: bjoerns zuerst, dann demo, dann erster User
  let user = await prisma.user.findFirst({ where: { username: 'bjoerns' } })
  if (!user) {
    user = await prisma.user.findFirst({ where: { username: 'demo' } })
  }
  if (!user) {
    user = await prisma.user.findFirst()
  }
  if (!user) {
    console.error('❌ Kein User gefunden. Bitte zuerst einen User anlegen.')
    process.exit(1)
  }
  console.log(`   User: ${user.username} (${user.id})`)
  
  // Hole den "daily_note" JournalEntryType
  let diaryType = await prisma.journalEntryType.findFirst({
    where: { code: 'daily_note' }
  })
  if (!diaryType) {
    console.error('❌ JournalEntryType "daily_note" nicht gefunden. Bitte zuerst das Schema initialisieren.')
    process.exit(1)
  }
  console.log(`   JournalEntryType: ${diaryType.name} (${diaryType.id})`)
  
  // Statistiken
  const stats = {
    timeBoxesCreated: 0,
    timeBoxesExisted: 0,
    dayEntriesCreated: 0,
    dayEntriesUpdated: 0,
    journalEntriesCreated: 0,
    journalEntriesSkipped: 0,
    taxonomiesCreated: 0,
    taggingsCreated: 0,
    contactsCreated: 0,
    interactionsCreated: 0,
    locationsCreated: 0,
    locationVisitsCreated: 0,
    measurementsCreated: 0,
    errors: 0
  }
  
  // Cache für Locations (basierend auf gerundeten Koordinaten)
  const locationCache = new Map<string, string>()
  
  // Lade existierende Locations
  const existingLocations = await prisma.location.findMany({
    where: { userId: user.id }
  })
  for (const loc of existingLocations) {
    if (loc.lat && loc.lng) {
      const key = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`
      locationCache.set(key, loc.id)
    }
  }
  
  // Hole MetricDefinition für Gewicht (body_weight aus Seed)
  let weightMetric = await prisma.metricDefinition.findFirst({
    where: { code: 'body_weight', userId: null }
  })
  if (!weightMetric) {
    weightMetric = await prisma.metricDefinition.findFirst({
      where: { code: 'body_weight', userId: user.id }
    })
  }
  if (!weightMetric) {
    console.log(`   ⚠️ MetricDefinition 'body_weight' nicht gefunden - Gewicht wird nicht importiert`)
  }
  
  let stepsMetric = await prisma.metricDefinition.findFirst({
    where: { code: 'steps', userId: null }
  })
  if (!stepsMetric) {
    stepsMetric = await prisma.metricDefinition.findFirst({
      where: { code: 'steps', userId: user.id }
    })
  }
  if (!stepsMetric && !dryRun) {
    stepsMetric = await prisma.metricDefinition.create({
      data: {
        userId: user.id,
        code: 'steps',
        name: 'Schritte',
        unit: 'Schritte',
        dataType: 'NUMERIC',
        category: 'fitness',
        icon: '👟'
      }
    })
    console.log(`   MetricDefinition 'steps' erstellt`)
  }
  
  // Cache für bereits erstellte Taxonomien und Kontakte
  const taxonomyCache = new Map<string, string>()
  const contactCache = new Map<string, string>()
  
  // Lade existierende Taxonomien
  const existingTaxonomies = await prisma.taxonomy.findMany({
    where: { userId: user.id, kind: TaxonomyKind.TAG }
  })
  for (const t of existingTaxonomies) {
    taxonomyCache.set(t.shortName.toLowerCase(), t.id)
  }
  
  // Lade existierende Kontakte
  const existingContacts = await prisma.contact.findMany({
    where: { userId: user.id }
  })
  for (const c of existingContacts) {
    contactCache.set(c.name.toLowerCase(), c.id)
  }
  
  console.log(`   Existierende Tags: ${taxonomyCache.size}`)
  console.log(`   Existierende Kontakte: ${contactCache.size}`)
  console.log('\n🔄 Starte Import...\n')
  
  // Gruppiere Einträge nach Tag
  const entriesByDay = new Map<string, DiariumEntry[]>()
  for (const entry of entries) {
    const localDate = getLocalDate(entry.date)
    if (!entriesByDay.has(localDate)) {
      entriesByDay.set(localDate, [])
    }
    entriesByDay.get(localDate)!.push(entry)
  }
  
  console.log(`   Tage mit Einträgen: ${entriesByDay.size}`)
  
  // Verarbeite jeden Tag
  let processed = 0
  for (const [localDate, dayEntries] of entriesByDay) {
    processed++
    if (processed % 50 === 0) {
      console.log(`   ... ${processed}/${entriesByDay.size} Tage verarbeitet`)
    }
    
    try {
      const { startAt, endAt } = getDayBounds(localDate)
      
      // 1. TimeBox erstellen oder finden
      let timeBox = await prisma.timeBox.findFirst({
        where: {
          userId: user.id,
          kind: TimeBoxKind.DAY,
          localDate: localDate
        }
      })
      
      if (!timeBox && !dryRun) {
        timeBox = await prisma.timeBox.create({
          data: {
            userId: user.id,
            kind: TimeBoxKind.DAY,
            startAt,
            endAt,
            localDate,
            timezone: 'Europe/Zurich'
          }
        })
        stats.timeBoxesCreated++
      } else if (timeBox) {
        stats.timeBoxesExisted++
      }
      
      // 2. DayEntry erstellen oder aktualisieren (nimm bestes Rating und Weather des Tages)
      const bestRating = dayEntries
        .map(e => convertRating(e.rating))
        .filter(r => r !== null)
        .sort((a, b) => (b ?? 0) - (a ?? 0))[0] ?? null
      
      const weatherEntry = dayEntries.find(e => e.weather)
      const weather = parseWeather(weatherEntry?.weather)
      
      if (timeBox) {
        let dayEntry = await prisma.dayEntry.findFirst({
          where: { timeBoxId: timeBox.id }
        })
        
        if (!dayEntry && !dryRun) {
          dayEntry = await prisma.dayEntry.create({
            data: {
              userId: user.id,
              timeBoxId: timeBox.id,
              dayRating: bestRating,
              weather: weather ?? Prisma.JsonNull
            }
          })
          stats.dayEntriesCreated++
        } else if (dayEntry && !dryRun) {
          // Update nur wenn neue Daten vorhanden
          if ((bestRating && !dayEntry.dayRating) || (weather && !dayEntry.weather)) {
            await prisma.dayEntry.update({
              where: { id: dayEntry.id },
              data: {
                dayRating: bestRating ?? dayEntry.dayRating,
                weather: weather ? weather : undefined
              }
            })
            stats.dayEntriesUpdated++
          }
        }
      }
      
      // 3. JournalEntries für jeden Eintrag des Tages erstellen
      for (const entry of dayEntries) {
        const content = htmlToText(entry.html)
        if (!content || content.length < 3) {
          stats.journalEntriesSkipped++
          continue
        }
        
        const title = entry.heading?.trim() || localDate
        
        // Prüfe auf Duplikat (gleicher Tag + gleicher Titel + ähnlicher Inhalt)
        if (timeBox) {
          const existingEntry = await prisma.journalEntry.findFirst({
            where: {
              userId: user.id,
              timeBoxId: timeBox.id,
              title: title,
              content: { startsWith: content.substring(0, 100) }
            }
          })
          
          if (existingEntry) {
            stats.journalEntriesSkipped++
            continue
          }
        }
        
        if (!dryRun && timeBox) {
          // Entity für JournalEntry erstellen
          const entity = await prisma.entity.create({
            data: {
              userId: user.id,
              type: 'JOURNAL_ENTRY'
            }
          })
          
          // JournalEntry erstellen
          const journalEntry = await prisma.journalEntry.create({
            data: {
              id: entity.id,
              userId: user.id,
              typeId: diaryType!.id,
              timeBoxId: timeBox.id,
              title,
              content,
              createdAt: new Date(entry.date)
            }
          })
          stats.journalEntriesCreated++
          
          // 4. Tags als Taxonomien + Taggings
          if (entry.tags && entry.tags.length > 0) {
            for (const tagName of entry.tags) {
              const tagKey = tagName.toLowerCase()
              let taxonomyId = taxonomyCache.get(tagKey)
              
              if (!taxonomyId) {
                const taxonomy = await prisma.taxonomy.create({
                  data: {
                    userId: user.id,
                    slug: slugify(tagName) + '-' + Date.now().toString(36).slice(-4),
                    shortName: tagName,
                    kind: TaxonomyKind.TAG,
                    origin: TaxonomyOrigin.IMPORT
                  }
                })
                taxonomyId = taxonomy.id
                taxonomyCache.set(tagKey, taxonomyId)
                stats.taxonomiesCreated++
              }
              
              // Tagging erstellen
              await prisma.tagging.create({
                data: {
                  taxonomyId,
                  entityId: entity.id,
                  userId: user.id,
                  source: TaggingSource.IMPORT
                }
              }).catch(() => {
                // Ignoriere Duplikate
              })
              stats.taggingsCreated++
            }
          }
          
          // 5. People als Kontakte + Interaction erstellen
          if (entry.people && entry.people.length > 0) {
            for (const personName of entry.people) {
              const personKey = personName.toLowerCase()
              let contactId = contactCache.get(personKey)
              
              if (!contactId) {
                const contact = await prisma.contact.create({
                  data: {
                    userId: user.id,
                    slug: slugify(personName) + '-' + Date.now().toString(36).slice(-4),
                    name: personName
                  }
                })
                contactId = contact.id
                contactCache.set(personKey, contactId)
                stats.contactsCreated++
              }
              
              // Interaction erstellen (GENERAL für Import)
              await prisma.interaction.create({
                data: {
                  userId: user.id,
                  contactId: contactId,
                  timeBoxId: timeBox.id,
                  kind: 'GENERAL',
                  notes: `Erwähnt in: ${title || localDate}`,
                  occurredAt: new Date(entry.date)
                }
              }).catch(() => {
                // Ignoriere Duplikate
              })
              stats.interactionsCreated++
            }
          }
          
          // 6. Location importieren und LocationVisit erstellen
          if (entry.location && entry.location.length === 2) {
            const [lat, lng] = entry.location
            const locationKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
            
            let locationId = locationCache.get(locationKey)
            
            if (!locationId) {
              const location = await prisma.location.create({
                data: {
                  userId: user.id,
                  slug: `loc-${locationKey.replace(/[.,]/g, '-')}-${Date.now().toString(36).slice(-4)}`,
                  name: `Import ${localDate}`,
                  lat,
                  lng
                }
              })
              locationId = location.id
              locationCache.set(locationKey, locationId)
              stats.locationsCreated++
            }
            
            // LocationVisit erstellen (verknüpft Location mit TimeBox und JournalEntry)
            await prisma.locationVisit.create({
              data: {
                userId: user.id,
                locationId: locationId,
                timeBoxId: timeBox.id,
                journalEntryId: journalEntry.id,
                arrivedAt: new Date(entry.date)
              }
            }).catch(() => {
              // Ignoriere Duplikate
            })
            stats.locationVisitsCreated++
          }
          
          // 7. Tracker-Daten importieren (Gewicht und Schritte)
          if (entry.tracker && entry.tracker.length > 0 && timeBox) {
            for (const trackerStr of entry.tracker) {
              const { type, value } = parseTrackerValue(trackerStr)
              
              if (type === 'weight' && value !== null && weightMetric) {
                // Prüfe ob Messung für diesen Tag bereits existiert
                const existingMeasurement = await prisma.measurement.findFirst({
                  where: {
                    userId: user.id,
                    metricId: weightMetric.id,
                    timeBoxId: timeBox.id
                  }
                })
                
                if (!existingMeasurement) {
                  await prisma.measurement.create({
                    data: {
                      userId: user.id,
                      metricId: weightMetric.id,
                      timeBoxId: timeBox.id,
                      valueNum: value,
                      source: MeasurementSource.IMPORT,
                      occurredAt: new Date(entry.date)
                    }
                  })
                  stats.measurementsCreated++
                }
              }
              
              if (type === 'steps' && value !== null && stepsMetric) {
                // Prüfe ob Messung für diesen Tag bereits existiert
                const existingMeasurement = await prisma.measurement.findFirst({
                  where: {
                    userId: user.id,
                    metricId: stepsMetric.id,
                    timeBoxId: timeBox.id
                  }
                })
                
                if (!existingMeasurement) {
                  await prisma.measurement.create({
                    data: {
                      userId: user.id,
                      metricId: stepsMetric.id,
                      timeBoxId: timeBox.id,
                      valueNum: value,
                      source: MeasurementSource.IMPORT,
                      occurredAt: new Date(entry.date)
                    }
                  })
                  stats.measurementsCreated++
                }
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Fehler bei ${localDate}:`, error)
      stats.errors++
    }
  }
  
  // Zusammenfassung
  console.log('\n' + '='.repeat(50))
  console.log('📊 IMPORT-ZUSAMMENFASSUNG')
  console.log('='.repeat(50))
  console.log(`   TimeBoxes erstellt:     ${stats.timeBoxesCreated}`)
  console.log(`   TimeBoxes existierten:  ${stats.timeBoxesExisted}`)
  console.log(`   DayEntries erstellt:    ${stats.dayEntriesCreated}`)
  console.log(`   DayEntries aktualisiert:${stats.dayEntriesUpdated}`)
  console.log(`   JournalEntries erstellt:${stats.journalEntriesCreated}`)
  console.log(`   JournalEntries übersp.: ${stats.journalEntriesSkipped}`)
  console.log(`   Tags erstellt:          ${stats.taxonomiesCreated}`)
  console.log(`   Taggings erstellt:      ${stats.taggingsCreated}`)
  console.log(`   Kontakte erstellt:      ${stats.contactsCreated}`)
  console.log(`   Interaktionen erstellt: ${stats.interactionsCreated}`)
  console.log(`   Locations erstellt:     ${stats.locationsCreated}`)
  console.log(`   Location-Besuche erst.: ${stats.locationVisitsCreated}`)
  console.log(`   Messungen erstellt:     ${stats.measurementsCreated}`)
  console.log(`   Fehler:                 ${stats.errors}`)
  console.log('='.repeat(50))
  
  if (dryRun) {
    console.log('\n⚠️  DRY-RUN: Keine Änderungen wurden vorgenommen.')
    console.log('   Führe den Befehl ohne --dry-run aus, um den Import durchzuführen.')
  } else {
    console.log('\n✅ Import abgeschlossen!')
  }
}

// Hauptprogramm
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Verwendung: npx ts-node scripts/import-diarium.ts <path-to-json> [--dry-run]')
    console.log('')
    console.log('Beispiel:')
    console.log('  npx ts-node scripts/import-diarium.ts uploads/temp/Diarium_2022-04-13_2024-12-25.json --dry-run')
    console.log('  npx ts-node scripts/import-diarium.ts uploads/temp/Diarium_2022-04-13_2024-12-25.json')
    process.exit(1)
  }
  
  const jsonPath = args[0]
  const dryRun = args.includes('--dry-run')
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Datei nicht gefunden: ${jsonPath}`)
    process.exit(1)
  }
  
  try {
    await importDiarium(jsonPath, dryRun)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
