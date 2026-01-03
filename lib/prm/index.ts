// PRM (Personal Relationship Management) Services
// Domain-specific business logic for contacts, sync, and Google integration

// Contact service
export * from './contact'

// Contact sync service
export * from './contact-sync'

// Google services - explicit exports to avoid naming conflicts
export { 
  getAuthorizationUrl,
  exchangeCodeForTokens,
  storeTokens,
  getSyncProviderStatus,
  disconnectGoogleContacts,
  getAuthenticatedClient,
  getValidTokens,
  refreshAccessToken,
  isTokenExpired,
} from './google-auth'

export { 
  fetchAllContacts as fetchGoogleContacts,
  fetchContactsIncremental as fetchGoogleContactsIncremental,
  createGoogleContact,
  updateGoogleContact,
  deleteGoogleContact,
  getContactGroups as getGoogleContactGroups,
  type GoogleContact,
} from './google-people'
