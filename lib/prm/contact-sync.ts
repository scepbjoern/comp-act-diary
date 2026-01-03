import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { 
  fetchAllContacts, 
  fetchContactsIncremental, 
  GoogleContact,
  createGoogleContact,
  updateGoogleContact,
  deleteGoogleContact,
  getContactGroups
} from './google-people'
import { getSyncProviderStatus } from './google-auth'

// =============================================================================
// CONTACT SYNC SERVICE
// =============================================================================

export interface SyncStats {
  created: number
  updated: number
  deleted: number
  skipped: number
  errors: string[]
}

export interface SyncRunResult {
  success: boolean
  stats: SyncStats
  syncToken?: string
  error?: string
}

function toSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function ensureUniqueSlug(userId: string, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug
  let counter = 1
  
  while (true) {
    const existing = await prisma.contact.findFirst({
      where: {
        userId,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })
    
    if (!existing) return slug
    slug = `${baseSlug}-${counter}`
    counter++
  }
}

/**
 * Map Google Contact to local Contact data
 */
function mapGoogleToLocal(googleContact: GoogleContact) {
  return {
    name: googleContact.name || 'Unbekannt',
    givenName: googleContact.givenName || null,
    familyName: googleContact.familyName || null,
    nickname: googleContact.nickname || null,
    emailPrivate: googleContact.emailPrivate || null,
    emailWork: googleContact.emailWork || null,
    phonePrivate: googleContact.phonePrivate || null,
    phoneWork: googleContact.phoneWork || null,
    addressHome: googleContact.addressHome || null,
    addressWork: googleContact.addressWork || null,
    company: googleContact.company || null,
    jobTitle: googleContact.jobTitle || null,
    birthday: googleContact.birthday || null,
    notes: googleContact.notes || null,
    websiteUrl: googleContact.websiteUrl || null,
    socialUrls: googleContact.socialUrls && googleContact.socialUrls.length > 0 
      ? googleContact.socialUrls 
      : Prisma.JsonNull,
    photoUrl: googleContact.photoUrl || null,
    googleResourceName: googleContact.resourceName,
    googleEtag: googleContact.etag,
  }
}

// Cache for Google contact groups (populated once per sync run)
let googleGroupsCache: Map<string, string> | null = null

/**
 * Sync contact groups (labels) from Google as Taxonomies and Taggings
 */
async function syncContactGroupsForContact(
  userId: string,
  contactId: string,
  googleGroupResourceNames: string[]
): Promise<void> {
  // First, ensure Entity exists for this contact
  let entity = await prisma.entity.findUnique({ where: { id: contactId } })
  if (!entity) {
    entity = await prisma.entity.create({
      data: {
        id: contactId,
        userId,
        type: 'CONTACT',
      },
    })
  }

  // Load Google groups into cache if not already loaded
  if (!googleGroupsCache) {
    googleGroupsCache = new Map()
    try {
      const groups = await getContactGroups(userId)
      for (const group of groups) {
        googleGroupsCache.set(group.resourceName, group.name)
      }
    } catch (error) {
      console.error('Error fetching Google contact groups:', error)
    }
  }

  for (const groupResourceName of googleGroupResourceNames) {
    // Skip system groups like "myContacts"
    if (groupResourceName.includes('myContacts')) continue

    // Extract group ID from resource name (e.g., "contactGroups/abc123")
    const groupId = groupResourceName.split('/').pop() || groupResourceName
    
    // Get the real group name from cache
    const realGroupName = googleGroupsCache.get(groupResourceName) || `Gruppe ${groupId.slice(0, 8)}`

    // Find or create Taxonomy for this group
    let taxonomy = await prisma.taxonomy.findFirst({
      where: {
        userId,
        kind: 'CONTACT_GROUP',
        slug: `google-${groupId}`,
      },
    })

    if (!taxonomy) {
      taxonomy = await prisma.taxonomy.create({
        data: {
          userId,
          kind: 'CONTACT_GROUP',
          shortName: realGroupName,
          slug: `google-${groupId}`,
        },
      })
    } else if (taxonomy.shortName !== realGroupName) {
      // Update the name if it changed
      await prisma.taxonomy.update({
        where: { id: taxonomy.id },
        data: { shortName: realGroupName },
      })
    }

    // Create Tagging if it doesn't exist
    const existingTagging = await prisma.tagging.findFirst({
      where: {
        userId,
        taxonomyId: taxonomy.id,
        entityId: contactId,
      },
    })

    if (!existingTagging) {
      await prisma.tagging.create({
        data: {
          userId,
          taxonomyId: taxonomy.id,
          entityId: contactId,
        },
      })
    }
  }
}

/**
 * Clear the Google groups cache (call at start of sync)
 */
export function clearGoogleGroupsCache(): void {
  googleGroupsCache = null
}

/**
 * Map local Contact to Google Contact data
 */
function mapLocalToGoogle(contact: {
  name: string
  givenName?: string | null
  familyName?: string | null
  nickname?: string | null
  emailPrivate?: string | null
  emailWork?: string | null
  phonePrivate?: string | null
  phoneWork?: string | null
  addressHome?: string | null
  addressWork?: string | null
  company?: string | null
  jobTitle?: string | null
  birthday?: Date | null
  notes?: string | null
  websiteUrl?: string | null
  socialUrls?: unknown
}): Omit<GoogleContact, 'resourceName' | 'etag'> {
  return {
    name: contact.name,
    givenName: contact.givenName,
    familyName: contact.familyName,
    nickname: contact.nickname,
    emailPrivate: contact.emailPrivate,
    emailWork: contact.emailWork,
    phonePrivate: contact.phonePrivate,
    phoneWork: contact.phoneWork,
    addressHome: contact.addressHome,
    addressWork: contact.addressWork,
    company: contact.company,
    jobTitle: contact.jobTitle,
    birthday: contact.birthday,
    notes: contact.notes,
    websiteUrl: contact.websiteUrl,
    socialUrls: contact.socialUrls as Array<{ type: string; url: string }> | null,
  }
}

/**
 * Perform a full sync from Google to local database
 */
export async function performFullSync(userId: string): Promise<SyncRunResult> {
  const stats: SyncStats = { created: 0, updated: 0, deleted: 0, skipped: 0, errors: [] }
  
  // Create SyncRun record
  const provider = await prisma.syncProvider.findFirst({
    where: { userId, provider: 'GOOGLE_CONTACTS', isActive: true },
  })
  
  if (!provider) {
    return { success: false, stats, error: 'Google Contacts nicht verbunden' }
  }

  const syncRun = await prisma.syncRun.create({
    data: {
      providerId: provider.id,
      status: 'RUNNING',
    },
  })

  try {
    let pageToken: string | undefined
    let newSyncToken: string | undefined
    const processedResourceNames = new Set<string>()

    // Fetch all contacts with pagination
    do {
      const result = await fetchAllContacts(userId, pageToken)
      
      for (const googleContact of result.contacts) {
        processedResourceNames.add(googleContact.resourceName)
        
        try {
          // Check if contact exists locally
          const existingContact = await prisma.contact.findFirst({
            where: {
              userId,
              googleResourceName: googleContact.resourceName,
            },
          })

          if (existingContact) {
            // Update existing contact - preserve local photoUrl if it exists
            const updateData = mapGoogleToLocal(googleContact)
            
            // Don't overwrite local photo with Google photo
            // Only set photoUrl from Google if no local photo exists
            if (existingContact.photoUrl && !existingContact.photoUrl.startsWith('https://')) {
              // Local photo exists (not a Google URL), preserve it
              delete (updateData as Record<string, unknown>).photoUrl
            }
            
            await prisma.contact.update({
              where: { id: existingContact.id },
              data: updateData,
            })
            
            // Sync contact groups (labels) as taxonomies
            if (googleContact.contactGroups && googleContact.contactGroups.length > 0) {
              await syncContactGroupsForContact(userId, existingContact.id, googleContact.contactGroups)
            }
            
            stats.updated++
          } else {
            // Create new contact
            const slug = await ensureUniqueSlug(userId, toSlug(googleContact.name || 'kontakt'))
            const newContact = await prisma.contact.create({
              data: {
                userId,
                slug,
                ...mapGoogleToLocal(googleContact),
              },
            })
            
            // Sync contact groups (labels) as taxonomies
            if (googleContact.contactGroups && googleContact.contactGroups.length > 0) {
              await syncContactGroupsForContact(userId, newContact.id, googleContact.contactGroups)
            }
            
            stats.created++
          }
        } catch (error) {
          stats.errors.push(`Error processing ${googleContact.resourceName}: ${error}`)
        }
      }

      pageToken = result.nextPageToken
      if (result.nextSyncToken) {
        newSyncToken = result.nextSyncToken
      }
    } while (pageToken)

    // Update sync token
    if (newSyncToken) {
      await prisma.syncProvider.update({
        where: { id: provider.id },
        data: {
          syncToken: newSyncToken,
          lastSyncAt: new Date(),
        },
      })
    }

    // Update SyncRun
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'COMPLETED',
        finishedAt: new Date(),
        itemsProcessed: stats.created + stats.updated + stats.skipped,
        itemsCreated: stats.created,
        itemsUpdated: stats.updated,
        itemsSkipped: stats.skipped,
        errors: stats.errors.length > 0 ? stats.errors : undefined,
      },
    })

    return { success: true, stats, syncToken: newSyncToken }

  } catch (error) {
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errors: [String(error)],
      },
    })
    
    return { success: false, stats, error: String(error) }
  }
}

/**
 * Perform incremental sync using sync token
 */
export async function performIncrementalSync(userId: string): Promise<SyncRunResult> {
  const stats: SyncStats = { created: 0, updated: 0, deleted: 0, skipped: 0, errors: [] }
  
  const provider = await prisma.syncProvider.findFirst({
    where: { userId, provider: 'GOOGLE_CONTACTS', isActive: true },
  })
  
  if (!provider) {
    return { success: false, stats, error: 'Google Contacts nicht verbunden' }
  }

  // If no sync token, perform full sync
  if (!provider.syncToken) {
    return performFullSync(userId)
  }

  const syncRun = await prisma.syncRun.create({
    data: {
      providerId: provider.id,
      status: 'RUNNING',
    },
  })

  try {
    const result = await fetchContactsIncremental(userId, provider.syncToken)

    for (const googleContact of result.contacts) {
      try {
        const existingContact = await prisma.contact.findFirst({
          where: {
            userId,
            googleResourceName: googleContact.resourceName,
          },
        })

        if (googleContact.isDeleted) {
          // Contact was deleted in Google - we keep it locally but clear the sync reference
          if (existingContact) {
            await prisma.contact.update({
              where: { id: existingContact.id },
              data: {
                googleResourceName: null,
                googleEtag: null,
              },
            })
            stats.deleted++
          }
        } else if (existingContact) {
          // Update existing
          await prisma.contact.update({
            where: { id: existingContact.id },
            data: mapGoogleToLocal(googleContact),
          })
          stats.updated++
        } else {
          // Create new
          const slug = await ensureUniqueSlug(userId, toSlug(googleContact.name || 'kontakt'))
          await prisma.contact.create({
            data: {
              userId,
              slug,
              ...mapGoogleToLocal(googleContact),
            },
          })
          stats.created++
        }
      } catch (error) {
        stats.errors.push(`Error processing ${googleContact.resourceName}: ${error}`)
      }
    }

    // Update sync token
    if (result.nextSyncToken) {
      await prisma.syncProvider.update({
        where: { id: provider.id },
        data: {
          syncToken: result.nextSyncToken,
          lastSyncAt: new Date(),
        },
      })
    }

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'COMPLETED',
        finishedAt: new Date(),
        itemsProcessed: stats.created + stats.updated + stats.deleted + stats.skipped,
        itemsCreated: stats.created,
        itemsUpdated: stats.updated,
        itemsSkipped: stats.skipped,
        errors: stats.errors.length > 0 ? stats.errors : undefined,
      },
    })

    return { success: true, stats, syncToken: result.nextSyncToken }

  } catch (error) {
    // Handle expired sync token
    if (error instanceof Error && error.message === 'SYNC_TOKEN_EXPIRED') {
      await prisma.syncProvider.update({
        where: { id: provider.id },
        data: { syncToken: null },
      })
      
      await prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errors: ['Sync token expired, performing full sync'],
        },
      })
      
      // Perform full sync instead
      return performFullSync(userId)
    }

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errors: [String(error)],
      },
    })

    return { success: false, stats, error: String(error) }
  }
}

/**
 * Sync a single contact to Google (push local changes)
 */
export async function syncContactToGoogle(userId: string, contactId: string): Promise<{
  success: boolean
  resourceName?: string
  error?: string
}> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
  })

  if (!contact) {
    return { success: false, error: 'Kontakt nicht gefunden' }
  }

  try {
    if (contact.googleResourceName && contact.googleEtag) {
      // Update existing Google contact
      const updated = await updateGoogleContact(
        userId,
        contact.googleResourceName,
        contact.googleEtag,
        mapLocalToGoogle(contact)
      )

      await prisma.contact.update({
        where: { id: contactId },
        data: {
          googleEtag: updated.etag,
        },
      })

      return { success: true, resourceName: updated.resourceName }
    } else {
      // Create new Google contact
      const created = await createGoogleContact(userId, mapLocalToGoogle(contact))

      await prisma.contact.update({
        where: { id: contactId },
        data: {
          googleResourceName: created.resourceName,
          googleEtag: created.etag,
        },
      })

      return { success: true, resourceName: created.resourceName }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Delete contact from Google
 */
export async function deleteContactFromGoogle(userId: string, contactId: string): Promise<{
  success: boolean
  error?: string
}> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
  })

  if (!contact?.googleResourceName) {
    return { success: true } // Nothing to delete
  }

  try {
    await deleteGoogleContact(userId, contact.googleResourceName)
    
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        googleResourceName: null,
        googleEtag: null,
      },
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Perform automatic sync (checks if incremental is possible)
 */
export async function performSync(userId: string): Promise<SyncRunResult> {
  const status = await getSyncProviderStatus(userId)
  
  if (!status.isConnected) {
    return {
      success: false,
      stats: { created: 0, updated: 0, deleted: 0, skipped: 0, errors: [] },
      error: 'Google Contacts nicht verbunden',
    }
  }

  if (status.syncToken) {
    return performIncrementalSync(userId)
  }

  return performFullSync(userId)
}

/**
 * Get sync history for a user
 */
export async function getSyncHistory(userId: string, limit = 10): Promise<Array<{
  id: string
  startedAt: Date
  finishedAt: Date | null
  status: string
  itemsProcessed: number
  itemsCreated: number
  itemsUpdated: number
  errors: unknown
}>> {
  const provider = await prisma.syncProvider.findFirst({
    where: { userId, provider: 'GOOGLE_CONTACTS' },
  })

  if (!provider) return []

  const runs = await prisma.syncRun.findMany({
    where: { providerId: provider.id },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })

  return runs.map(run => ({
    id: run.id,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    status: run.status,
    itemsProcessed: run.itemsProcessed,
    itemsCreated: run.itemsCreated,
    itemsUpdated: run.itemsUpdated,
    errors: run.errors,
  }))
}
