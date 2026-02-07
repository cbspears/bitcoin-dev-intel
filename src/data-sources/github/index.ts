/**
 * GitHub Data Source Module
 *
 * This module provides a complete solution for fetching Bitcoin development
 * activity from GitHub repositories including:
 *
 * - bitcoin/bitcoin (Bitcoin Core)
 * - bitcoin/bips (Bitcoin Improvement Proposals)
 * - lightning/bolts (Lightning Network Specifications)
 * - And other tracked repositories
 *
 * @example
 * ```typescript
 * import { createFetcher, createGitHubClient } from './data-sources/github';
 *
 * // Create a client with authentication for higher rate limits
 * const client = createGitHubClient({ token: process.env.GITHUB_TOKEN });
 * const fetcher = createFetcher(client);
 *
 * // Fetch recent pull requests across all tracked repos
 * const prs = await fetcher.fetchRecentPullRequests({ perPage: 20 });
 *
 * // Fetch Bitcoin Core specific data
 * const coreRepo = await fetcher.fetchRepository('bitcoin', 'bitcoin');
 * const coreIssues = await fetcher.fetchIssues('bitcoin', 'bitcoin', { state: 'open' });
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Core entities
  GitHubUser,
  Repository,
  PullRequest,
  Issue,
  Commit,
  Contributor,
  ContributorStats,
  WeeklyStats,

  // Supporting types
  Label,
  Milestone,
  CommitFile,

  // Configuration types
  TrackedRepository,
  PaginationOptions,
  DateRangeFilter,
  PullRequestFilter,
  IssueFilter,
  CommitFilter,

  // Rate limiting types
  RateLimitInfo,
  RateLimitStatus,

  // Error types
  GitHubApiError,
} from './types';

export { GitHubError, TRACKED_REPOSITORIES } from './types';

// ============================================================================
// Client
// ============================================================================

export type { GitHubClientConfig } from './client';

export {
  GitHubClient,
  createGitHubClient,
  createGitHubClientFromEnv,
} from './client';

// ============================================================================
// Fetcher
// ============================================================================

export {
  GitHubFetcher,
  createFetcher,
  createBitcoinCoreFetcher,
  createBIPsFetcher,
  createBOLTsFetcher,
} from './fetcher';
