/**
 * Repository Sync Service
 * Fetches repository stats and activity from tracked GitHub repositories
 */

import { eq } from 'drizzle-orm';
import { db } from '../lib/supabase';
import { repositories, activityEvents, syncLogs } from '../db/schema';
import {
  createGitHubClientFromEnv,
  GitHubClient,
  GitHubFetcher,
  TRACKED_REPOSITORIES,
} from '../data-sources/github';
import type { TrackedRepository } from '../data-sources/github';

// =============================================================================
// Types
// =============================================================================

export interface RepoSyncResult {
  processed: number;
  updated: number;
  failed: number;
  newPRs: number;
  newIssues: number;
  newCommits: number;
  errors: Array<{ repo: string; error: string }>;
}

export interface RepoSyncOptions {
  /** Only sync specific repositories */
  repositories?: TrackedRepository[];
  /** Sync activity (PRs, issues, commits) in addition to repo stats */
  syncActivity?: boolean;
  /** How many recent items to fetch per category */
  activityLimit?: number;
  /** Only fetch activity since this date */
  since?: string;
}

// =============================================================================
// Repository Sync Service
// =============================================================================

export class RepoSyncService {
  private client: GitHubClient;
  private fetcher: GitHubFetcher;
  private trackedRepos: TrackedRepository[];

  constructor(client?: GitHubClient, trackedRepos?: TrackedRepository[]) {
    this.client = client || createGitHubClientFromEnv();
    this.trackedRepos = trackedRepos || TRACKED_REPOSITORIES;
    this.fetcher = new GitHubFetcher(this.client, this.trackedRepos);
  }

  /**
   * Count commits in the last 30 days for a repository
   */
  private async countRecentCommits(owner: string, repo: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const commits = await this.fetcher.fetchCommits(owner, repo, {
        since: thirtyDaysAgo.toISOString(),
        perPage: 100, // Get up to 100 commits for count
      });
      return commits.length;
    } catch (error) {
      console.error(`Failed to count commits for ${owner}/${repo}:`, error);
      return 0;
    }
  }

  /**
   * Count open PRs for a repository
   */
  private async countOpenPRs(owner: string, repo: string): Promise<number> {
    try {
      const prs = await this.fetcher.fetchPullRequests(owner, repo, {
        state: 'open',
        perPage: 100,
      });
      return prs.length;
    } catch (error) {
      console.error(`Failed to count PRs for ${owner}/${repo}:`, error);
      return 0;
    }
  }

  /**
   * Sync a single repository's stats to the database
   */
  private async syncRepositoryStats(tracked: TrackedRepository): Promise<boolean> {
    const { owner, name } = tracked;

    try {
      const repoData = await this.fetcher.fetchRepository(owner, name);
      const commits30d = await this.countRecentCommits(owner, name);
      const openPRsCount = await this.countOpenPRs(owner, name);

      const now = new Date();
      const repoRecord = {
        githubId: repoData.id,
        owner: repoData.owner.login,
        name: repoData.name,
        fullName: repoData.fullName,
        description: repoData.description,
        stargazersCount: repoData.stargazersCount,
        forksCount: repoData.forksCount,
        openIssuesCount: repoData.openIssuesCount,
        openPRsCount,
        commits30d,
        topics: repoData.topics,
        lastSyncedAt: now,
        updatedAt: now,
      };

      // Check if repo exists
      const existing = await db
        .select()
        .from(repositories)
        .where(eq(repositories.githubId, repoData.id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(repositories)
          .set(repoRecord)
          .where(eq(repositories.githubId, repoData.id));
      } else {
        await db.insert(repositories).values({
          ...repoRecord,
          createdAt: now,
        });
      }

      return true;
    } catch (error) {
      console.error(`Failed to sync repository ${owner}/${name}:`, error);
      throw error;
    }
  }

  /**
   * Create activity events for PRs
   */
  private async syncPRActivity(
    owner: string,
    repo: string,
    limit: number,
    since?: string
  ): Promise<number> {
    let created = 0;

    try {
      const prs = await this.fetcher.fetchPullRequests(owner, repo, {
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        perPage: limit,
      });

      // Filter by since date if provided
      const filteredPRs = since
        ? prs.filter(pr => new Date(pr.updatedAt) >= new Date(since))
        : prs;

      for (const pr of filteredPRs) {
        // Check if event already exists (by github_id)
        const existing = await db
          .select()
          .from(activityEvents)
          .where(eq(activityEvents.githubId, pr.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(activityEvents).values({
            eventType: 'pr',
            title: pr.title,
            description: pr.body?.slice(0, 500) || null,
            repoOwner: owner,
            repoName: repo,
            author: pr.user.login,
            authorAvatarUrl: pr.user.avatarUrl,
            htmlUrl: pr.htmlUrl,
            githubId: pr.id,
            metadata: {
              number: pr.number,
              state: pr.state,
              draft: pr.draft,
              merged: pr.merged,
              labels: pr.labels.map(l => l.name),
            },
            eventTimestamp: new Date(pr.createdAt),
            createdAt: new Date(),
          });
          created++;
        }
      }
    } catch (error) {
      console.error(`Failed to sync PR activity for ${owner}/${repo}:`, error);
    }

    return created;
  }

  /**
   * Create activity events for issues
   */
  private async syncIssueActivity(
    owner: string,
    repo: string,
    limit: number,
    since?: string
  ): Promise<number> {
    let created = 0;

    try {
      const issues = await this.fetcher.fetchIssues(owner, repo, {
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        perPage: limit,
      });

      // Filter by since date if provided
      const filteredIssues = since
        ? issues.filter(issue => new Date(issue.updatedAt) >= new Date(since))
        : issues;

      for (const issue of filteredIssues) {
        // Check if event already exists (by github_id)
        const existing = await db
          .select()
          .from(activityEvents)
          .where(eq(activityEvents.githubId, issue.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(activityEvents).values({
            eventType: 'issue',
            title: issue.title,
            description: issue.body?.slice(0, 500) || null,
            repoOwner: owner,
            repoName: repo,
            author: issue.user.login,
            authorAvatarUrl: issue.user.avatarUrl,
            htmlUrl: issue.htmlUrl,
            githubId: issue.id,
            metadata: {
              number: issue.number,
              state: issue.state,
              stateReason: issue.stateReason,
              labels: issue.labels.map(l => l.name),
              comments: issue.comments,
            },
            eventTimestamp: new Date(issue.createdAt),
            createdAt: new Date(),
          });
          created++;
        }
      }
    } catch (error) {
      console.error(`Failed to sync issue activity for ${owner}/${repo}:`, error);
    }

    return created;
  }

  /**
   * Create activity events for commits
   */
  private async syncCommitActivity(
    owner: string,
    repo: string,
    limit: number,
    since?: string
  ): Promise<number> {
    let created = 0;

    try {
      const commits = await this.fetcher.fetchCommits(owner, repo, {
        since,
        perPage: limit,
      });

      for (const commit of commits) {
        // Use SHA as unique identifier - construct a numeric ID from hash
        const commitIdHash = parseInt(commit.sha.slice(0, 8), 16);

        // Check if event already exists
        const existing = await db
          .select()
          .from(activityEvents)
          .where(eq(activityEvents.githubId, commitIdHash))
          .limit(1);

        if (existing.length === 0) {
          // Get first line of commit message as title
          const firstLine = commit.message.split('\n')[0] || commit.message;
          const title = firstLine.slice(0, 200);

          await db.insert(activityEvents).values({
            eventType: 'commit',
            title,
            description: commit.message.length > 200 ? commit.message.slice(0, 500) : null,
            repoOwner: owner,
            repoName: repo,
            author: commit.authorUser?.login || commit.author.name,
            authorAvatarUrl: commit.authorUser?.avatarUrl || null,
            htmlUrl: commit.htmlUrl,
            githubId: commitIdHash,
            metadata: {
              sha: commit.sha,
              authorEmail: commit.author.email,
              stats: commit.stats,
            },
            eventTimestamp: new Date(commit.author.date),
            createdAt: new Date(),
          });
          created++;
        }
      }
    } catch (error) {
      console.error(`Failed to sync commit activity for ${owner}/${repo}:`, error);
    }

    return created;
  }

  /**
   * Sync all tracked repositories
   */
  async syncAll(options: RepoSyncOptions = {}): Promise<RepoSyncResult> {
    const {
      repositories: reposToSync = this.trackedRepos,
      syncActivity = true,
      activityLimit = 20,
      since,
    } = options;

    const result: RepoSyncResult = {
      processed: 0,
      updated: 0,
      failed: 0,
      newPRs: 0,
      newIssues: 0,
      newCommits: 0,
      errors: [],
    };

    // Create sync log entry
    const [syncLog] = await db
      .insert(syncLogs)
      .values({
        syncType: 'repos',
        status: 'started',
        startedAt: new Date(),
        metadata: { syncActivity, activityLimit, since, repoCount: reposToSync.length },
      })
      .returning();

    try {
      for (const tracked of reposToSync) {
        result.processed++;
        const repoFullName = `${tracked.owner}/${tracked.name}`;

        try {
          // Sync repository stats
          await this.syncRepositoryStats(tracked);
          result.updated++;

          // Sync activity if enabled
          if (syncActivity) {
            result.newPRs += await this.syncPRActivity(
              tracked.owner,
              tracked.name,
              activityLimit,
              since
            );
            result.newIssues += await this.syncIssueActivity(
              tracked.owner,
              tracked.name,
              activityLimit,
              since
            );
            result.newCommits += await this.syncCommitActivity(
              tracked.owner,
              tracked.name,
              activityLimit,
              since
            );
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            repo: repoFullName,
            error: error instanceof Error ? error.message : String(error),
          });
          console.error(`Failed to sync ${repoFullName}:`, error);
          // Continue with next repository
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
   * Sync a specific repository by owner/name
   */
  async syncRepository(owner: string, name: string, options?: Omit<RepoSyncOptions, 'repositories'>): Promise<RepoSyncResult> {
    return this.syncAll({
      ...options,
      repositories: [{ owner, name }],
    });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a repository sync service instance
 */
export function createRepoSyncService(client?: GitHubClient): RepoSyncService {
  return new RepoSyncService(client);
}
