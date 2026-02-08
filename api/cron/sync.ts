/**
 * Cron Sync Endpoint
 * Vercel serverless function for scheduled sync operations
 *
 * This endpoint is triggered hourly by Vercel Cron to:
 * - Sync BIPs from the bitcoin/bips repository
 * - Sync repository statistics from tracked GitHub repos
 * - Sync recent activity (PRs, issues, commits)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BIPSyncService } from '../../src/services/bip-sync';
import { RepoSyncService } from '../../src/services/repo-sync';

// =============================================================================
// Types
// =============================================================================

interface SyncResult {
  success: boolean;
  results?: {
    bips: {
      processed: number;
      inserted: number;
      updated: number;
      failed: number;
    };
    repos: {
      processed: number;
      updated: number;
      failed: number;
    };
    activity: {
      newPRs: number;
      newIssues: number;
      newCommits: number;
    };
  };
  error?: string;
  timestamp: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized cron request - invalid or missing authorization');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  console.log('Starting scheduled sync...');
  const startTime = Date.now();

  try {
    // Initialize sync services
    const bipSync = new BIPSyncService();
    const repoSync = new RepoSyncService();

    // Run syncs in parallel for efficiency
    const [bipResult, repoResult] = await Promise.all([
      bipSync.syncAll(),
      repoSync.syncAll({ syncActivity: true, activityLimit: 20 }),
    ]);

    const duration = Date.now() - startTime;
    console.log(`Sync completed in ${duration}ms`);

    const result: SyncResult = {
      success: true,
      results: {
        bips: {
          processed: bipResult.processed,
          inserted: bipResult.inserted,
          updated: bipResult.updated,
          failed: bipResult.failed,
        },
        repos: {
          processed: repoResult.processed,
          updated: repoResult.updated,
          failed: repoResult.failed,
        },
        activity: {
          newPRs: repoResult.newPRs,
          newIssues: repoResult.newIssues,
          newCommits: repoResult.newCommits,
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Log summary
    console.log('Sync results:', JSON.stringify(result.results, null, 2));

    res.status(200).json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Sync failed after ${duration}ms:`, error);

    const result: SyncResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(result);
  }
}
