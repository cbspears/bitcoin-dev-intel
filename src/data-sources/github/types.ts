/**
 * GitHub Data Source Types
 * TypeScript interfaces for GitHub API data structures
 */

// ============================================================================
// Core GitHub Entities
// ============================================================================

/**
 * GitHub user/contributor information
 */
export interface GitHubUser {
  id: number;
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  type: 'User' | 'Bot' | 'Organization';
}

/**
 * Repository information
 */
export interface Repository {
  id: number;
  name: string;
  fullName: string;
  owner: GitHubUser;
  description: string | null;
  htmlUrl: string;
  defaultBranch: string;
  language: string | null;
  forksCount: number;
  stargazersCount: number;
  watchersCount: number;
  openIssuesCount: number;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
}

/**
 * Pull request information
 */
export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  htmlUrl: string;
  user: GitHubUser;
  labels: Label[];
  assignees: GitHubUser[];
  reviewers: GitHubUser[];
  milestone: Milestone | null;
  draft: boolean;
  merged: boolean;
  mergedAt: string | null;
  mergedBy: GitHubUser | null;
  commits: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  // Repository context
  repository: {
    owner: string;
    name: string;
  };
}

/**
 * Issue information
 */
export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  stateReason: 'completed' | 'not_planned' | 'reopened' | null;
  htmlUrl: string;
  user: GitHubUser;
  labels: Label[];
  assignees: GitHubUser[];
  milestone: Milestone | null;
  comments: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  closedBy: GitHubUser | null;
  // Repository context
  repository: {
    owner: string;
    name: string;
  };
}

/**
 * Commit information
 */
export interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  htmlUrl: string;
  // GitHub user if linked
  authorUser: GitHubUser | null;
  committerUser: GitHubUser | null;
  // Stats (only available on detailed commit fetch)
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  // Files changed (only available on detailed commit fetch)
  files?: CommitFile[];
  // Repository context
  repository: {
    owner: string;
    name: string;
  };
}

/**
 * Contributor statistics
 */
export interface Contributor {
  user: GitHubUser;
  contributions: number;
  // Extended stats (when available)
  stats?: ContributorStats;
}

/**
 * Detailed contributor statistics
 */
export interface ContributorStats {
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  weeks: WeeklyStats[];
}

/**
 * Weekly contribution statistics
 */
export interface WeeklyStats {
  week: number; // Unix timestamp
  additions: number;
  deletions: number;
  commits: number;
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Issue/PR label
 */
export interface Label {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

/**
 * Milestone information
 */
export interface Milestone {
  id: number;
  number: number;
  title: string;
  description: string | null;
  state: 'open' | 'closed';
  dueOn: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

/**
 * File changed in a commit
 */
export interface CommitFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Tracked repository configuration
 */
export interface TrackedRepository {
  owner: string;
  name: string;
  displayName?: string;
  category?: 'core' | 'specs' | 'ecosystem';
}

/**
 * Default tracked repositories for Bitcoin development
 */
export const TRACKED_REPOSITORIES: TrackedRepository[] = [
  { owner: 'bitcoin', name: 'bitcoin', displayName: 'Bitcoin Core', category: 'core' },
  { owner: 'bitcoin', name: 'bips', displayName: 'BIPs', category: 'specs' },
  { owner: 'lightning', name: 'bolts', displayName: 'Lightning BOLTs', category: 'specs' },
  { owner: 'ElementsProject', name: 'elements', displayName: 'Elements', category: 'ecosystem' },
  { owner: 'rust-bitcoin', name: 'rust-bitcoin', displayName: 'Rust Bitcoin', category: 'ecosystem' },
];

/**
 * Pagination options for API requests
 */
export interface PaginationOptions {
  page?: number;
  perPage?: number;
}

/**
 * Date range filter for API requests
 */
export interface DateRangeFilter {
  since?: string; // ISO 8601 date string
  until?: string; // ISO 8601 date string
}

/**
 * Pull request filter options
 */
export interface PullRequestFilter extends PaginationOptions, DateRangeFilter {
  state?: 'open' | 'closed' | 'all';
  sort?: 'created' | 'updated' | 'popularity' | 'long-running';
  direction?: 'asc' | 'desc';
}

/**
 * Issue filter options
 */
export interface IssueFilter extends PaginationOptions, DateRangeFilter {
  state?: 'open' | 'closed' | 'all';
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
  labels?: string[];
}

/**
 * Commit filter options
 */
export interface CommitFilter extends PaginationOptions, DateRangeFilter {
  sha?: string; // Branch or commit SHA to start from
  path?: string; // Only commits containing this file path
  author?: string; // GitHub login or email
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

/**
 * GitHub API rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  used: number;
}

/**
 * Rate limit status for different API resources
 */
export interface RateLimitStatus {
  core: RateLimitInfo;
  search: RateLimitInfo;
  graphql: RateLimitInfo;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * GitHub API error response
 */
export interface GitHubApiError {
  status: number;
  message: string;
  documentationUrl?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
    message?: string;
  }>;
}

/**
 * Custom error class for GitHub API errors
 */
export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response?: GitHubApiError
  ) {
    super(message);
    this.name = 'GitHubError';
  }

  get isRateLimited(): boolean {
    return this.status === 403 && this.message.toLowerCase().includes('rate limit');
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}
