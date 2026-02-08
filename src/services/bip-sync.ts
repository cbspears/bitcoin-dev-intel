/**
 * BIP Sync Service
 * Fetches BIPs from bitcoin/bips repository and syncs to database
 */

import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../lib/supabase';
import { bips, activityEvents, syncLogs } from '../db/schema';
import { createGitHubClientFromEnv, GitHubClient } from '../data-sources/github';
import { parseBIPFromContent } from '../trackers/bip';
import type { BIP } from '../trackers/bip';

// =============================================================================
// Types
// =============================================================================

export interface BIPSyncResult {
  processed: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ path: string; error: string }>;
}

export interface BIPSyncOptions {
  /** Force re-sync even if content hasn't changed */
  force?: boolean;
  /** Only sync specific BIP numbers */
  bipNumbers?: number[];
}

// =============================================================================
// BIP Sync Service
// =============================================================================

export class BIPSyncService {
  private client: GitHubClient;
  private readonly owner = 'bitcoin';
  private readonly repo = 'bips';

  constructor(client?: GitHubClient) {
    this.client = client || createGitHubClientFromEnv();
  }

  /**
   * Generate SHA-256 hash of content for change detection
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if BIP file matches expected pattern (bip-XXXX.mediawiki)
   */
  private isBIPFile(filename: string): boolean {
    return /^bip-\d{4}\.mediawiki$/.test(filename);
  }

  /**
   * Extract BIP number from filename
   */
  private extractBIPNumber(filename: string): number | null {
    const match = filename.match(/^bip-(\d{4})\.mediawiki$/);
    return match && match[1] ? parseInt(match[1], 10) : null;
  }

  /**
   * Sync a single BIP file to the database
   */
  private async syncBIP(
    path: string,
    content: string,
    contentHash: string,
    existingBip: typeof bips.$inferSelect | null,
    force: boolean
  ): Promise<{ action: 'inserted' | 'updated' | 'skipped'; statusChanged: boolean; oldStatus?: string }> {
    const parseResult = parseBIPFromContent(content, path);

    if (!parseResult.success || !parseResult.bip) {
      throw new Error(`Failed to parse BIP: ${parseResult.errors.join(', ')}`);
    }

    const parsedBip: BIP = parseResult.bip;

    // Check if content has changed
    if (existingBip && existingBip.contentHash === contentHash && !force) {
      return { action: 'skipped', statusChanged: false };
    }

    const now = new Date();
    const bipData = {
      number: parsedBip.number,
      title: parsedBip.title,
      authors: parsedBip.authors,
      status: parsedBip.status,
      type: parsedBip.type,
      layer: parsedBip.layer || null,
      created: parsedBip.created,
      requires: parsedBip.requires || [],
      replaces: parsedBip.replaces || [],
      replacedBy: parsedBip.replacedBy || null,
      contentHash,
      lastSyncedAt: now,
      updatedAt: now,
    };

    if (existingBip) {
      const statusChanged = existingBip.status !== parsedBip.status;
      const oldStatus = existingBip.status;

      await db
        .update(bips)
        .set(bipData)
        .where(eq(bips.number, parsedBip.number));

      return { action: 'updated', statusChanged, oldStatus };
    } else {
      await db.insert(bips).values({
        ...bipData,
        createdAt: now,
      });

      return { action: 'inserted', statusChanged: false };
    }
  }

  /**
   * Create an activity event for a BIP change
   */
  private async createBIPActivityEvent(
    bip: BIP,
    eventType: 'new' | 'status_change',
    oldStatus?: string
  ): Promise<void> {
    const now = new Date();

    let title: string;
    let description: string;

    if (eventType === 'new') {
      title = `New BIP: BIP-${bip.number} - ${bip.title}`;
      description = `A new Bitcoin Improvement Proposal has been added: ${bip.title}. Status: ${bip.status}, Type: ${bip.type}`;
    } else {
      title = `BIP-${bip.number} status changed: ${oldStatus} -> ${bip.status}`;
      description = `BIP-${bip.number} "${bip.title}" status has changed from ${oldStatus} to ${bip.status}`;
    }

    await db.insert(activityEvents).values({
      eventType: 'bip_change',
      title,
      description,
      repoOwner: this.owner,
      repoName: this.repo,
      author: bip.authors[0]?.name || 'Unknown',
      htmlUrl: `https://github.com/${this.owner}/${this.repo}/blob/master/bip-${String(bip.number).padStart(4, '0')}.mediawiki`,
      bipNumber: bip.number,
      metadata: {
        status: bip.status,
        type: bip.type,
        layer: bip.layer,
        changeType: eventType,
        oldStatus,
      },
      eventTimestamp: now,
      createdAt: now,
    });
  }

  /**
   * Sync all BIPs from the repository
   */
  async syncAll(options: BIPSyncOptions = {}): Promise<BIPSyncResult> {
    const { force = false, bipNumbers } = options;
    const result: BIPSyncResult = {
      processed: 0,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    // Create sync log entry
    const [syncLog] = await db
      .insert(syncLogs)
      .values({
        syncType: 'bips',
        status: 'started',
        startedAt: new Date(),
        metadata: { force, bipNumbers },
      })
      .returning();

    try {
      // List all files in the bips repository root
      const files = await this.client.listDirectoryContents(this.owner, this.repo, '');

      // Filter for BIP files
      const bipFiles = files.filter(f => f.type === 'file' && this.isBIPFile(f.name));

      // If specific BIP numbers requested, filter further
      const filesToSync = bipNumbers
        ? bipFiles.filter(f => {
            const num = this.extractBIPNumber(f.name);
            return num !== null && bipNumbers.includes(num);
          })
        : bipFiles;

      // Fetch existing BIPs from database for comparison
      const existingBips = await db.select().from(bips);
      const existingBipMap = new Map(existingBips.map(b => [b.number, b]));

      // Process each BIP file
      for (const file of filesToSync) {
        result.processed++;

        try {
          // Fetch file content
          const { content } = await this.client.getFileContents(
            this.owner,
            this.repo,
            file.path
          );

          const contentHash = this.hashContent(content);
          const bipNumber = this.extractBIPNumber(file.name);
          const existingBip = bipNumber !== null ? existingBipMap.get(bipNumber) || null : null;

          const { action, statusChanged, oldStatus } = await this.syncBIP(
            file.path,
            content,
            contentHash,
            existingBip,
            force
          );

          if (action === 'inserted') {
            result.inserted++;

            // Parse again to get BIP details for activity event
            const parseResult = parseBIPFromContent(content, file.path);
            if (parseResult.success && parseResult.bip) {
              await this.createBIPActivityEvent(parseResult.bip, 'new');
            }
          } else if (action === 'updated') {
            result.updated++;

            // If status changed, create activity event
            if (statusChanged) {
              const parseResult = parseBIPFromContent(content, file.path);
              if (parseResult.success && parseResult.bip) {
                await this.createBIPActivityEvent(parseResult.bip, 'status_change', oldStatus);
              }
            }
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            path: file.path,
            error: error instanceof Error ? error.message : String(error),
          });
          console.error(`Failed to sync ${file.path}:`, error);
        }
      }

      // Update sync log with success
      if (syncLog) {
        await db
          .update(syncLogs)
          .set({
            status: 'completed',
            completedAt: new Date(),
            itemsProcessed: result.processed,
            itemsFailed: result.failed,
            metadata: { ...options, result },
          })
          .where(eq(syncLogs.id, syncLog.id));
      }
    } catch (error) {
      // Update sync log with failure
      if (syncLog) {
        await db
          .update(syncLogs)
          .set({
            status: 'failed',
            completedAt: new Date(),
            itemsProcessed: result.processed,
            itemsFailed: result.failed,
            errorMessage: error instanceof Error ? error.message : String(error),
          })
          .where(eq(syncLogs.id, syncLog.id));
      }

      throw error;
    }

    return result;
  }

  /**
   * Sync a specific BIP by number
   */
  async syncBIPByNumber(bipNumber: number): Promise<BIPSyncResult> {
    return this.syncAll({ bipNumbers: [bipNumber] });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a BIP sync service instance
 */
export function createBIPSyncService(client?: GitHubClient): BIPSyncService {
  return new BIPSyncService(client);
}
