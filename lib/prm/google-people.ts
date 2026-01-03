import { google, people_v1 } from 'googleapis'
import { getAuthenticatedClient } from './google-auth'

// =============================================================================
// GOOGLE PEOPLE SERVICE
// =============================================================================

const PERSON_FIELDS = [
  'names',
  'nicknames',
  'emailAddresses',
  'phoneNumbers',
  'addresses',
  'birthdays',
  'photos',
  'organizations',
  'biographies',
  'memberships',
  'urls',
  'metadata',
].join(',')

export interface GoogleContact {
  resourceName: string
  etag: string
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
  photoUrl?: string | null
  websiteUrl?: string | null
  socialUrls?: Array<{ type: string; url: string }> | null
  contactGroups?: string[] | null
  isDeleted?: boolean
}

export interface SyncResult {
  contacts: GoogleContact[]
  nextSyncToken?: string
  nextPageToken?: string
}

/**
 * Get People API client for a user
 */
async function getPeopleClient(userId: string): Promise<people_v1.People> {
  const auth = await getAuthenticatedClient(userId)
  return google.people({ version: 'v1', auth })
}

/**
 * Map Google Person to our GoogleContact format
 */
function mapGooglePerson(person: people_v1.Schema$Person): GoogleContact {
  const metadata = person.metadata
  const isDeleted = metadata?.deleted || false

  // Names
  const primaryName = person.names?.find(n => n.metadata?.primary) || person.names?.[0]
  const name = primaryName?.displayName || ''
  const givenName = primaryName?.givenName
  const familyName = primaryName?.familyName

  // Nickname
  const nickname = person.nicknames?.[0]?.value

  // Emails - find private and work
  const emails = person.emailAddresses || []
  const emailPrivate = emails.find(e => e.type?.toLowerCase() === 'home' || e.type?.toLowerCase() === 'private')?.value
    || emails.find(e => !e.type || e.type.toLowerCase() === 'other')?.value
  const emailWork = emails.find(e => e.type?.toLowerCase() === 'work')?.value

  // Phones - find private and work
  const phones = person.phoneNumbers || []
  const phonePrivate = phones.find(p => p.type?.toLowerCase() === 'home' || p.type?.toLowerCase() === 'mobile')?.value
    || phones.find(p => !p.type || p.type.toLowerCase() === 'other')?.value
  const phoneWork = phones.find(p => p.type?.toLowerCase() === 'work')?.value

  // Addresses - format as string
  const addresses = person.addresses || []
  const homeAddr = addresses.find(a => a.type?.toLowerCase() === 'home')
  const workAddr = addresses.find(a => a.type?.toLowerCase() === 'work')
  
  const formatAddress = (addr: people_v1.Schema$Address | undefined): string | undefined => {
    if (!addr) return undefined
    if (addr.formattedValue) return addr.formattedValue
    const parts = [addr.streetAddress, addr.postalCode, addr.city, addr.country].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : undefined
  }

  const addressHome = formatAddress(homeAddr) || formatAddress(addresses.find(a => !a.type))
  const addressWork = formatAddress(workAddr)

  // Organization
  const org = person.organizations?.find(o => o.metadata?.primary) || person.organizations?.[0]
  const company = org?.name
  const jobTitle = org?.title

  // Birthday
  let birthday: Date | undefined
  const bday = person.birthdays?.[0]?.date
  if (bday && bday.year && bday.month && bday.day) {
    birthday = new Date(bday.year, bday.month - 1, bday.day)
  }

  // Notes/Biography
  const notes = person.biographies?.[0]?.value

  // Photo
  const photoUrl = person.photos?.find(p => p.metadata?.primary)?.url || person.photos?.[0]?.url

  // URLs
  const urls = person.urls || []
  const websiteUrl = urls.find(u => u.type?.toLowerCase() === 'homepage' || u.type?.toLowerCase() === 'website')?.value
    || urls.find(u => !u.type)?.value
  
  const socialUrls = urls
    .filter(u => u.type && u.value && u.type.toLowerCase() !== 'homepage' && u.type.toLowerCase() !== 'website')
    .map(u => ({ type: u.type!.toLowerCase(), url: u.value! }))

  // Contact Groups (memberships)
  const contactGroups = person.memberships
    ?.filter(m => m.contactGroupMembership?.contactGroupResourceName)
    .map(m => m.contactGroupMembership!.contactGroupResourceName!) || []

  return {
    resourceName: person.resourceName!,
    etag: person.etag!,
    name,
    givenName,
    familyName,
    nickname,
    emailPrivate,
    emailWork,
    phonePrivate,
    phoneWork,
    addressHome,
    addressWork,
    company,
    jobTitle,
    birthday,
    notes,
    photoUrl,
    websiteUrl,
    socialUrls: socialUrls.length > 0 ? socialUrls : undefined,
    contactGroups: contactGroups.length > 0 ? contactGroups : undefined,
    isDeleted,
  }
}

/**
 * Fetch all contacts (full sync)
 */
export async function fetchAllContacts(
  userId: string,
  pageToken?: string
): Promise<SyncResult> {
  const people = await getPeopleClient(userId)
  
  const response = await people.people.connections.list({
    resourceName: 'people/me',
    personFields: PERSON_FIELDS,
    pageSize: 100,
    pageToken,
    requestSyncToken: true,
    sources: ['READ_SOURCE_TYPE_CONTACT'],
  })

  const contacts = (response.data.connections || []).map(mapGooglePerson)

  return {
    contacts,
    nextSyncToken: response.data.nextSyncToken || undefined,
    nextPageToken: response.data.nextPageToken || undefined,
  }
}

/**
 * Fetch contacts incrementally using sync token
 */
export async function fetchContactsIncremental(
  userId: string,
  syncToken: string
): Promise<SyncResult> {
  const people = await getPeopleClient(userId)

  try {
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      personFields: PERSON_FIELDS,
      pageSize: 100,
      syncToken,
      requestSyncToken: true,
      sources: ['READ_SOURCE_TYPE_CONTACT'],
    })

    const contacts = (response.data.connections || []).map(mapGooglePerson)

    return {
      contacts,
      nextSyncToken: response.data.nextSyncToken || undefined,
      nextPageToken: response.data.nextPageToken || undefined,
    }
  } catch (error: unknown) {
    // Handle expired sync token (HTTP 410)
    if (error && typeof error === 'object' && 'code' in error && error.code === 410) {
      throw new Error('SYNC_TOKEN_EXPIRED')
    }
    throw error
  }
}

/**
 * Get a single contact by resource name
 */
export async function getContact(
  userId: string,
  resourceName: string
): Promise<GoogleContact | null> {
  const people = await getPeopleClient(userId)

  try {
    const response = await people.people.get({
      resourceName,
      personFields: PERSON_FIELDS,
    })

    return mapGooglePerson(response.data)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
      return null
    }
    throw error
  }
}

/**
 * Create a new contact in Google
 */
export async function createGoogleContact(
  userId: string,
  contact: Omit<GoogleContact, 'resourceName' | 'etag'>
): Promise<GoogleContact> {
  const people = await getPeopleClient(userId)

  const person: people_v1.Schema$Person = {
    names: contact.name ? [{
      givenName: contact.givenName,
      familyName: contact.familyName,
      displayName: contact.name,
    }] : undefined,
    nicknames: contact.nickname ? [{ value: contact.nickname }] : undefined,
    emailAddresses: [
      contact.emailPrivate ? { value: contact.emailPrivate, type: 'home' } : null,
      contact.emailWork ? { value: contact.emailWork, type: 'work' } : null,
    ].filter(Boolean) as people_v1.Schema$EmailAddress[],
    phoneNumbers: [
      contact.phonePrivate ? { value: contact.phonePrivate, type: 'mobile' } : null,
      contact.phoneWork ? { value: contact.phoneWork, type: 'work' } : null,
    ].filter(Boolean) as people_v1.Schema$PhoneNumber[],
    addresses: [
      contact.addressHome ? { formattedValue: contact.addressHome, type: 'home' } : null,
      contact.addressWork ? { formattedValue: contact.addressWork, type: 'work' } : null,
    ].filter(Boolean) as people_v1.Schema$Address[],
    organizations: contact.company || contact.jobTitle ? [{
      name: contact.company,
      title: contact.jobTitle,
    }] : undefined,
    biographies: contact.notes ? [{ value: contact.notes, contentType: 'TEXT_PLAIN' }] : undefined,
    birthdays: contact.birthday ? [{
      date: {
        year: contact.birthday.getFullYear(),
        month: contact.birthday.getMonth() + 1,
        day: contact.birthday.getDate(),
      },
    }] : undefined,
    urls: [
      contact.websiteUrl ? { value: contact.websiteUrl, type: 'homepage' } : null,
      ...(contact.socialUrls || []).map(s => ({ value: s.url, type: s.type })),
    ].filter(Boolean) as people_v1.Schema$Url[],
  }

  const response = await people.people.createContact({
    requestBody: person,
    personFields: PERSON_FIELDS,
  })

  return mapGooglePerson(response.data)
}

/**
 * Update a contact in Google
 */
export async function updateGoogleContact(
  userId: string,
  resourceName: string,
  etag: string,
  contact: Partial<GoogleContact>
): Promise<GoogleContact> {
  const people = await getPeopleClient(userId)

  const updatePersonFields: string[] = []
  const person: people_v1.Schema$Person = { etag }

  if (contact.name !== undefined || contact.givenName !== undefined || contact.familyName !== undefined) {
    person.names = [{
      givenName: contact.givenName,
      familyName: contact.familyName,
      displayName: contact.name,
    }]
    updatePersonFields.push('names')
  }

  if (contact.nickname !== undefined) {
    person.nicknames = contact.nickname ? [{ value: contact.nickname }] : []
    updatePersonFields.push('nicknames')
  }

  if (contact.emailPrivate !== undefined || contact.emailWork !== undefined) {
    person.emailAddresses = [
      contact.emailPrivate ? { value: contact.emailPrivate, type: 'home' } : null,
      contact.emailWork ? { value: contact.emailWork, type: 'work' } : null,
    ].filter(Boolean) as people_v1.Schema$EmailAddress[]
    updatePersonFields.push('emailAddresses')
  }

  if (contact.phonePrivate !== undefined || contact.phoneWork !== undefined) {
    person.phoneNumbers = [
      contact.phonePrivate ? { value: contact.phonePrivate, type: 'mobile' } : null,
      contact.phoneWork ? { value: contact.phoneWork, type: 'work' } : null,
    ].filter(Boolean) as people_v1.Schema$PhoneNumber[]
    updatePersonFields.push('phoneNumbers')
  }

  if (contact.addressHome !== undefined || contact.addressWork !== undefined) {
    person.addresses = [
      contact.addressHome ? { formattedValue: contact.addressHome, type: 'home' } : null,
      contact.addressWork ? { formattedValue: contact.addressWork, type: 'work' } : null,
    ].filter(Boolean) as people_v1.Schema$Address[]
    updatePersonFields.push('addresses')
  }

  if (contact.company !== undefined || contact.jobTitle !== undefined) {
    person.organizations = [{
      name: contact.company,
      title: contact.jobTitle,
    }]
    updatePersonFields.push('organizations')
  }

  if (contact.notes !== undefined) {
    person.biographies = contact.notes ? [{ value: contact.notes, contentType: 'TEXT_PLAIN' }] : []
    updatePersonFields.push('biographies')
  }

  if (contact.birthday !== undefined) {
    person.birthdays = contact.birthday ? [{
      date: {
        year: contact.birthday.getFullYear(),
        month: contact.birthday.getMonth() + 1,
        day: contact.birthday.getDate(),
      },
    }] : []
    updatePersonFields.push('birthdays')
  }

  if (contact.websiteUrl !== undefined || contact.socialUrls !== undefined) {
    person.urls = [
      contact.websiteUrl ? { value: contact.websiteUrl, type: 'homepage' } : null,
      ...(contact.socialUrls || []).map(s => ({ value: s.url, type: s.type })),
    ].filter(Boolean) as people_v1.Schema$Url[]
    updatePersonFields.push('urls')
  }

  const response = await people.people.updateContact({
    resourceName,
    updatePersonFields: updatePersonFields.join(','),
    requestBody: person,
    personFields: PERSON_FIELDS,
  })

  return mapGooglePerson(response.data)
}

/**
 * Delete a contact in Google
 */
export async function deleteGoogleContact(
  userId: string,
  resourceName: string
): Promise<void> {
  const people = await getPeopleClient(userId)
  
  await people.people.deleteContact({
    resourceName,
  })
}

/**
 * Get all contact groups for a user
 */
export async function getContactGroups(
  userId: string
): Promise<Array<{ resourceName: string; name: string; memberCount: number }>> {
  const people = await getPeopleClient(userId)

  const response = await people.contactGroups.list({
    pageSize: 100,
  })

  return (response.data.contactGroups || [])
    .filter(g => g.groupType === 'USER_CONTACT_GROUP')
    .map(g => ({
      resourceName: g.resourceName!,
      name: g.name!,
      memberCount: g.memberCount || 0,
    }))
}
