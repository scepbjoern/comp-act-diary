/**
 * JournalEntryAccessService
 * Handles cross-user journal entry sharing: access checks, grants, and auto-sharing.
 */

import { PrismaClient, JournalEntryAccessRole } from '@prisma/client'
import { getPrisma } from '@/lib/core/prisma'
import { logger } from '@/lib/core/logger'
import type { SharingDefaults } from '@/lib/validators/journalEntryAccess'

// =============================================================================
// TYPES
// =============================================================================

export interface AccessCheckResult {
  canRead: boolean
  canEdit: boolean
  canDelete: boolean
  isOwner: boolean
  accessRole: JournalEntryAccessRole | null
}

export interface SharedEntryInfo {
  id: string
  title: string | null
  content: string
  occurredAt: Date | null
  typeCode: string
  typeName: string
  ownerUserId: string
  ownerName: string | null
  accessRole: JournalEntryAccessRole
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class JournalEntryAccessService {
  private prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || getPrisma()
  }

  // ---------------------------------------------------------------------------
  // ACCESS CHECKS
  // ---------------------------------------------------------------------------

  /**
   * Get the access role for a user on a specific entry.
   * Returns null if no access granted (and not owner).
   */
  async getAccessRole(
    entryId: string,
    userId: string
  ): Promise<JournalEntryAccessRole | null> {
    const access = await this.prisma.journalEntryAccess.findUnique({
      where: {
        journalEntryId_userId: {
          journalEntryId: entryId,
          userId,
        },
      },
    })
    return access?.role ?? null
  }

  /**
   * Check all access permissions for a user on an entry.
   * Owner has full access, otherwise based on granted role.
   */
  async checkAccess(entryId: string, userId: string): Promise<AccessCheckResult> {
    // First check if user is owner
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id: entryId },
      select: { userId: true },
    })

    if (!entry) {
      return {
        canRead: false,
        canEdit: false,
        canDelete: false,
        isOwner: false,
        accessRole: null,
      }
    }

    const isOwner = entry.userId === userId
    if (isOwner) {
      return {
        canRead: true,
        canEdit: true,
        canDelete: true,
        isOwner: true,
        accessRole: null,
      }
    }

    // Check granted access
    const accessRole = await this.getAccessRole(entryId, userId)
    if (!accessRole) {
      return {
        canRead: false,
        canEdit: false,
        canDelete: false,
        isOwner: false,
        accessRole: null,
      }
    }

    return {
      canRead: true,
      canEdit: accessRole === 'EDITOR',
      canDelete: accessRole === 'EDITOR',
      isOwner: false,
      accessRole,
    }
  }

  /**
   * Quick check if user can read an entry.
   */
  async canRead(entryId: string, userId: string): Promise<boolean> {
    const result = await this.checkAccess(entryId, userId)
    return result.canRead
  }

  /**
   * Quick check if user can edit an entry.
   */
  async canEdit(entryId: string, userId: string): Promise<boolean> {
    const result = await this.checkAccess(entryId, userId)
    return result.canEdit
  }

  /**
   * Quick check if user can delete an entry.
   */
  async canDelete(entryId: string, userId: string): Promise<boolean> {
    const result = await this.checkAccess(entryId, userId)
    return result.canDelete
  }

  // ---------------------------------------------------------------------------
  // GRANT / REVOKE ACCESS
  // ---------------------------------------------------------------------------

  /**
   * Grant access to an entry for a target user.
   * Caller must be owner or editor of the entry.
   */
  async grantAccess(
    entryId: string,
    targetUserId: string,
    role: JournalEntryAccessRole,
    grantedByUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify granter has permission
      const granterAccess = await this.checkAccess(entryId, grantedByUserId)
      if (!granterAccess.isOwner && granterAccess.accessRole !== 'EDITOR') {
        return { success: false, error: 'Keine Berechtigung zum Freigeben' }
      }

      // Cannot grant access to self
      const entry = await this.prisma.journalEntry.findUnique({
        where: { id: entryId },
        select: { userId: true },
      })
      if (entry?.userId === targetUserId) {
        return { success: false, error: 'Kann nicht an Owner freigeben' }
      }

      // Upsert access grant
      await this.prisma.journalEntryAccess.upsert({
        where: {
          journalEntryId_userId: {
            journalEntryId: entryId,
            userId: targetUserId,
          },
        },
        create: {
          journalEntryId: entryId,
          userId: targetUserId,
          role,
          grantedByUserId,
        },
        update: {
          role,
          grantedByUserId,
        },
      })

      logger.info(
        { entryId, targetUserId, role, grantedByUserId },
        'Access granted to journal entry'
      )

      return { success: true }
    } catch (error) {
      logger.error({ error, entryId, targetUserId }, 'Failed to grant access')
      return { success: false, error: 'Fehler beim Freigeben' }
    }
  }

  /**
   * Revoke access from a user.
   * Caller must be owner or editor.
   */
  async revokeAccess(
    entryId: string,
    targetUserId: string,
    revokedByUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify revoker has permission
      const revokerAccess = await this.checkAccess(entryId, revokedByUserId)
      if (!revokerAccess.isOwner && revokerAccess.accessRole !== 'EDITOR') {
        return { success: false, error: 'Keine Berechtigung zum Entfernen' }
      }

      await this.prisma.journalEntryAccess.deleteMany({
        where: {
          journalEntryId: entryId,
          userId: targetUserId,
        },
      })

      logger.info(
        { entryId, targetUserId, revokedByUserId },
        'Access revoked from journal entry'
      )

      return { success: true }
    } catch (error) {
      logger.error({ error, entryId, targetUserId }, 'Failed to revoke access')
      return { success: false, error: 'Fehler beim Entfernen der Freigabe' }
    }
  }

  /**
   * Update access role for an existing grant.
   */
  async updateAccessRole(
    entryId: string,
    targetUserId: string,
    newRole: JournalEntryAccessRole,
    updatedByUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updaterAccess = await this.checkAccess(entryId, updatedByUserId)
      if (!updaterAccess.isOwner && updaterAccess.accessRole !== 'EDITOR') {
        return { success: false, error: 'Keine Berechtigung zum Ändern' }
      }

      await this.prisma.journalEntryAccess.update({
        where: {
          journalEntryId_userId: {
            journalEntryId: entryId,
            userId: targetUserId,
          },
        },
        data: {
          role: newRole,
          grantedByUserId: updatedByUserId,
        },
      })

      return { success: true }
    } catch (error) {
      logger.error({ error, entryId, targetUserId }, 'Failed to update access role')
      return { success: false, error: 'Fehler beim Ändern der Rolle' }
    }
  }

  // ---------------------------------------------------------------------------
  // LIST ACCESS GRANTS
  // ---------------------------------------------------------------------------

  /**
   * List all users who have access to an entry.
   */
  async listAccessGrants(entryId: string) {
    const grants = await this.prisma.journalEntryAccess.findMany({
      where: { journalEntryId: entryId },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, username: true },
        },
        grantedBy: {
          select: { id: true, displayName: true, username: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return grants.map((g) => ({
      id: g.id,
      userId: g.userId,
      username: g.user.username,
      userName: g.user.displayName || g.user.username,
      role: g.role,
      grantedByUserId: g.grantedByUserId,
      grantedByName: g.grantedBy?.displayName || g.grantedBy?.username || null,
      createdAt: g.createdAt,
    }))
  }

  // ---------------------------------------------------------------------------
  // SHARED ENTRIES (for recipient)
  // ---------------------------------------------------------------------------

  /**
   * List entries shared with a user, optionally filtered by date range.
   */
  async listSharedEntries(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<SharedEntryInfo[]> {
    // Build date filter for occurredAt
    const dateFilter = dateFrom || dateTo
      ? {
          occurredAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}

    const accessGrants = await this.prisma.journalEntryAccess.findMany({
      where: {
        userId,
        journalEntry: {
          deletedAt: null,
          ...dateFilter,
        },
      },
      include: {
        journalEntry: {
          include: {
            type: true,
            user: {
              select: { id: true, displayName: true, username: true },
            },
          },
        },
      },
      orderBy: { journalEntry: { occurredAt: 'desc' } },
    })

    return accessGrants.map((g) => ({
      id: g.journalEntry.id,
      title: g.journalEntry.title,
      content: g.journalEntry.content,
      occurredAt: g.journalEntry.occurredAt,
      typeCode: g.journalEntry.type.code,
      typeName: g.journalEntry.type.name,
      ownerUserId: g.journalEntry.userId,
      ownerName: g.journalEntry.user.displayName || g.journalEntry.user.username,
      accessRole: g.role,
    }))
  }

  /**
   * Get shared entries for a specific day (by occurredAt in date range).
   */
  async getSharedEntriesForDay(userId: string, dateStr: string): Promise<SharedEntryInfo[]> {
    const [year, month, day] = dateStr.split('-').map(Number)
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0)
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

    return this.listSharedEntries(userId, startOfDay, endOfDay)
  }

  /**
   * Get distinct dates (YYYY-MM-DD) with shared entries for a month range.
   * Used by calendar widget to show days with shared entries.
   */
  async getSharedEntryDatesForMonth(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
    const accessGrants = await this.prisma.journalEntryAccess.findMany({
      where: {
        userId,
        journalEntry: {
          deletedAt: null,
          occurredAt: {
            gte: startDate,
            lt: endDate,
          },
        },
      },
      include: {
        journalEntry: {
          select: { occurredAt: true },
        },
      },
    })

    // Extract unique dates in YYYY-MM-DD format
    const dates = new Set<string>()
    for (const grant of accessGrants) {
      if (grant.journalEntry.occurredAt) {
        const d = grant.journalEntry.occurredAt
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        dates.add(`${y}-${m}-${day}`)
      }
    }

    return Array.from(dates).sort()
  }

  // ---------------------------------------------------------------------------
  // AUTO-SHARING ON CREATE
  // ---------------------------------------------------------------------------

  /**
   * Get sharing defaults from user settings.
   */
  async getSharingDefaults(userId: string): Promise<SharingDefaults | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    })

    if (!user?.settings || typeof user.settings !== 'object') {
      return null
    }

    const settings = user.settings as Record<string, unknown>
    return (settings.sharingDefaults as SharingDefaults) || null
  }

  /**
   * Resolve which users should receive auto-share for a new entry.
   * Note: Only type-specific rules trigger auto-share.
   * The defaultShareUserId is only for prefilling the share modal, not auto-sharing.
   */
  async resolveShareDefaults(
    userId: string,
    entryTypeId: string
  ): Promise<Array<{ userId: string; role: JournalEntryAccessRole }>> {
    const defaults = await this.getSharingDefaults(userId)
    if (!defaults) return []

    const result: Array<{ userId: string; role: JournalEntryAccessRole }> = []

    // Only type-specific auto-share rules trigger automatic sharing
    const typeRule = defaults.autoShareByType?.find(
      (r) => r.journalEntryTypeId === entryTypeId
    )

    if (typeRule) {
      result.push({
        userId: typeRule.shareWithUserId,
        role: typeRule.role,
      })
    }
    // Note: defaultShareUserId is NOT used for auto-sharing - only for prefilling the share modal

    return result
  }

  /**
   * Apply default sharing rules when a new entry is created.
   */
  async applyDefaultSharingOnCreate(
    entryId: string,
    creatorUserId: string,
    entryTypeId: string
  ): Promise<void> {
    const shareTargets = await this.resolveShareDefaults(creatorUserId, entryTypeId)

    for (const target of shareTargets) {
      // Skip if target is creator
      if (target.userId === creatorUserId) continue

      // Ensure recipient's JournalEntryType exists (for custom types)
      await this.ensureRecipientEntryTypeExists(entryTypeId, creatorUserId, target.userId)

      await this.grantAccess(entryId, target.userId, target.role, creatorUserId)
    }
  }

  // ---------------------------------------------------------------------------
  // ENTRY TYPE REPLICATION
  // ---------------------------------------------------------------------------

  /**
   * Ensure the recipient has a matching JournalEntryType when sharing
   * an entry with a user-specific type.
   */
  async ensureRecipientEntryTypeExists(
    typeId: string,
    ownerUserId: string,
    recipientUserId: string
  ): Promise<void> {
    const sourceType = await this.prisma.journalEntryType.findUnique({
      where: { id: typeId },
    })

    // Only replicate user-specific types (not system types)
    if (!sourceType || sourceType.userId === null) return

    // Check if recipient already has a type with the same code
    const existingType = await this.prisma.journalEntryType.findFirst({
      where: {
        userId: recipientUserId,
        code: sourceType.code,
      },
    })

    if (existingType) return // Already exists

    // Create the type for recipient (without defaultTemplateId)
    await this.prisma.journalEntryType.create({
      data: {
        userId: recipientUserId,
        code: sourceType.code,
        name: sourceType.name,
        description: sourceType.description,
        icon: sourceType.icon,
        sortOrder: sourceType.sortOrder,
      },
    })

    logger.info(
      { typeCode: sourceType.code, recipientUserId },
      'Replicated JournalEntryType for share recipient'
    )
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let serviceInstance: JournalEntryAccessService | null = null

export function getJournalEntryAccessService(): JournalEntryAccessService {
  if (!serviceInstance) {
    serviceInstance = new JournalEntryAccessService()
  }
  return serviceInstance
}
