/**
 * GitHub API Client
 * Wrapper around Octokit with rate limiting and error handling
 */

import { Octokit } from '@octokit/rest';
import type { RateLimitInfo, RateLimitStatus, GitHubApiError } from './types';
import { GitHubError } from './types';

// ============================================================================
// Client Configuration
// ============================================================================

export interface GitHubClientConfig {
  /** GitHub personal access token (optional, increases rate limits) */
  token?: string;
  /** Base URL for GitHub API (for GitHub Enterprise) */
  baseUrl?: string;
  /** User agent string for API requests */
  userAgent?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    /** Number of retries on failure */
    maxRetries?: number;
    /** Base delay between retries in ms */
    baseDelay?: number;
    /** Maximum delay between retries in ms */
    maxDelay?: number;
  };
}

const DEFAULT_CONFIG: Required<Omit<GitHubClientConfig, 'token' | 'baseUrl'>> = {
  userAgent: 'bitcoin-dev-intel/1.0.0',
  timeout: 30000,
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
  },
};

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * Simple rate limiter that tracks API usage and delays requests when needed
 */
class RateLimiter {
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private requestQueue: Array<() => void> = [];
  private processing = false;

  /**
   * Update rate limit info from API response headers
   */
  updateFromHeaders(resource: string, headers: Record<string, string | undefined>): void {
    const limit = parseInt(headers['x-ratelimit-limit'] || '60', 10);
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '60', 10);
    const reset = parseInt(headers['x-ratelimit-reset'] || '0', 10);
    const used = parseInt(headers['x-ratelimit-used'] || '0', 10);

    this.rateLimits.set(resource, { limit, remaining, reset, used });
  }

  /**
   * Get current rate limit info for a resource
   */
  getRateLimitInfo(resource: string): RateLimitInfo | undefined {
    return this.rateLimits.get(resource);
  }

  /**
   * Check if we should delay the next request
   */
  shouldDelay(resource: string): { delay: boolean; waitMs: number } {
    const info = this.rateLimits.get(resource);
    if (!info) return { delay: false, waitMs: 0 };

    // If we have remaining requests, no delay needed
    if (info.remaining > 0) return { delay: false, waitMs: 0 };

    // Calculate wait time until reset
    const now = Math.floor(Date.now() / 1000);
    const waitMs = Math.max(0, (info.reset - now) * 1000);

    return { delay: true, waitMs };
  }

  /**
   * Wait if rate limited
   */
  async waitIfNeeded(resource: string): Promise<void> {
    const { delay, waitMs } = this.shouldDelay(resource);
    if (delay && waitMs > 0) {
      console.log(`Rate limited on ${resource}. Waiting ${waitMs}ms until reset.`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
}

// ============================================================================
// GitHub Client
// ============================================================================

/**
 * GitHub API client with built-in rate limiting and error handling
 */
export class GitHubClient {
  private octokit: Octokit;
  private rateLimiter: RateLimiter;
  private config: Required<Omit<GitHubClientConfig, 'token' | 'baseUrl'>> &
    Pick<GitHubClientConfig, 'token' | 'baseUrl'>;

  constructor(config: GitHubClientConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      retry: { ...DEFAULT_CONFIG.retry, ...config.retry },
    };

    this.octokit = new Octokit({
      auth: this.config.token,
      baseUrl: this.config.baseUrl,
      userAgent: this.config.userAgent,
      request: {
        timeout: this.config.timeout,
      },
    });

    this.rateLimiter = new RateLimiter();
  }

  /**
   * Get the underlying Octokit instance for advanced usage
   */
  get raw(): Octokit {
    return this.octokit;
  }

  /**
   * Execute a request with rate limiting and retry logic
   */
  async request<T>(
    resource: string,
    fn: () => Promise<{ data: T; headers: Record<string, string | undefined> }>
  ): Promise<T> {
    const { maxRetries, baseDelay, maxDelay } = this.config.retry;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Wait if rate limited
        await this.rateLimiter.waitIfNeeded(resource);

        // Execute request
        const response = await fn();

        // Update rate limit info
        this.rateLimiter.updateFromHeaders(resource, response.headers);

        return response.data;
      } catch (error) {
        lastError = error as Error;

        // Handle rate limit errors
        if (this.isRateLimitError(error)) {
          const resetTime = this.extractResetTime(error);
          if (resetTime) {
            const waitMs = Math.max(0, (resetTime - Math.floor(Date.now() / 1000)) * 1000);
            console.log(`Rate limited. Waiting ${waitMs}ms before retry.`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            continue;
          }
        }

        // Handle retryable errors
        if (this.isRetryableError(error) && attempt < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          console.log(`Request failed. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Transform to GitHubError
        throw this.transformError(error);
      }
    }

    throw lastError || new Error('Request failed after maximum retries');
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      return status === 403 || status === 429;
    }
    return false;
  }

  /**
   * Extract reset time from rate limit error
   */
  private extractResetTime(error: unknown): number | undefined {
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { headers?: Record<string, string> } }).response;
      const resetHeader = response?.headers?.['x-ratelimit-reset'];
      if (resetHeader) {
        return parseInt(resetHeader, 10);
      }
    }
    return undefined;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      // Retry on server errors and rate limits
      return status >= 500 || status === 429 || status === 403;
    }
    return false;
  }

  /**
   * Transform Octokit error to GitHubError
   */
  private transformError(error: unknown): GitHubError {
    if (error instanceof GitHubError) {
      return error;
    }

    if (error && typeof error === 'object') {
      const err = error as { status?: number; message?: string; response?: { data?: GitHubApiError } };
      const status = err.status || 500;
      const message = err.message || 'Unknown GitHub API error';
      const response = err.response?.data;

      return new GitHubError(message, status, response);
    }

    return new GitHubError(String(error), 500);
  }

  // ===========================================================================
  // Repository Methods
  // ===========================================================================

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string) {
    return this.request('core', () =>
      this.octokit.repos.get({ owner, repo }) as Promise<{
        data: Awaited<ReturnType<typeof this.octokit.repos.get>>['data'];
        headers: Record<string, string | undefined>;
      }>
    );
  }

  /**
   * List repository pull requests
   */
  async listPullRequests(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      sort?: 'created' | 'updated' | 'popularity' | 'long-running';
      direction?: 'asc' | 'desc';
      page?: number;
      per_page?: number;
    } = {}
  ) {
    return this.request('core', () =>
      this.octokit.pulls.list({ owner, repo, ...options }) as Promise<{
        data: Awaited<ReturnType<typeof this.octokit.pulls.list>>['data'];
        headers: Record<string, string | undefined>;
      }>
    );
  }

  /**
   * Get a single pull request
   */
  async getPullRequest(owner: string, repo: string, pullNumber: number) {
    return this.request('core', () =>
      this.octokit.pulls.get({ owner, repo, pull_number: pullNumber }) as Promise<{
        data: Awaited<ReturnType<typeof this.octokit.pulls.get>>['data'];
        headers: Record<string, string | undefined>;
      }>
    );
  }

  /**
   * List repository issues
   */
  async listIssues(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      sort?: 'created' | 'updated' | 'comments';
      direction?: 'asc' | 'desc';
      since?: string;
      labels?: string;
      page?: number;
      per_page?: number;
    } = {}
  ) {
    return this.request('core', () =>
      this.octokit.issues.listForRepo({ owner, repo, ...options }) as Promise<{
        data: Awaited<ReturnType<typeof this.octokit.issues.listForRepo>>['data'];
        headers: Record<string, string | undefined>;
      }>
    );
  }

  /**
   * Get a single issue
   */
  async getIssue(owner: string, repo: string, issueNumber: number) {
    return this.request('core', () =>
      this.octokit.issues.get({ owner, repo, issue_number: issueNumber }) as Promise<{
        data: Awaited<ReturnType<typeof this.octokit.issues.get>>['data'];
        headers: Record<string, string | undefined>;
      }>
    );
  }

  /**
   * List repository commits
   */
  async listCommits(
    owner: string,
    repo: string,
    options: {
      sha?: string;
      path?: string;
      author?: string;
      since?: string;
      until?: string;
      page?: number;
      per_page?: number;
    } = {}
  ) {
    return this.request('core', () =>
      this.octokit.repos.listCommits({ owner, repo, ...options }) as Promise<{
        data: Awaited<ReturnType<typeof this.octokit.repos.listCommits>>['data'];
        headers: Record<string, string | undefined>;
      }>
    );
  }

  /**
   * Get a single commit
   */
  async getCommit(owner: string, repo: string, ref: string) {
    return this.request('core', () =>
      this.octokit.repos.getCommit({ owner, repo, ref }) as Promise<{
        data: Awaited<ReturnType<typeof this.octokit.repos.getCommit>>['data'];
        headers: Record<string, string | undefined>;
      }>
    );
  }

  /**
   * List repository contributors
   */
  async listContributors(
    owner: string,
    repo: string,
    options: { page?: number; per_page?: number; anon?: string } = {}
  ) {
    return this.request('core', () =>
      this.octokit.repos.listContributors({ owner, repo, ...options }) as Promise<{
        data: Awaited<ReturnType<typeof this.octokit.repos.listContributors>>['data'];
        headers: Record<string, string | undefined>;
      }>
    );
  }

  /**
   * Get contributor statistics
   */
  async getContributorStats(owner: string, repo: string) {
    return this.request('core', () =>
      this.octokit.repos.getContributorsStats({ owner, repo }) as Promise<{
        data: Awaited<ReturnType<typeof this.octokit.repos.getContributorsStats>>['data'];
        headers: Record<string, string | undefined>;
      }>
    );
  }

  // ===========================================================================
  // Rate Limit Methods
  // ===========================================================================

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(): Promise<RateLimitStatus> {
    const response = await this.octokit.rateLimit.get();
    const { resources } = response.data;

    return {
      core: {
        limit: resources.core.limit,
        remaining: resources.core.remaining,
        reset: resources.core.reset,
        used: resources.core.used,
      },
      search: {
        limit: resources.search.limit,
        remaining: resources.search.remaining,
        reset: resources.search.reset,
        used: resources.search.used,
      },
      graphql: {
        limit: resources.graphql.limit,
        remaining: resources.graphql.remaining,
        reset: resources.graphql.reset,
        used: resources.graphql.used,
      },
    };
  }

  /**
   * Get cached rate limit info for a resource
   */
  getCachedRateLimitInfo(resource: string): RateLimitInfo | undefined {
    return this.rateLimiter.getRateLimitInfo(resource);
  }

  // ===========================================================================
  // File Content Methods
  // ===========================================================================

  /**
   * Get contents of a file from a repository
   */
  async getFileContents(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<{ content: string; sha: string; path: string }> {
    const response = await this.request('core', () =>
      this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      }) as Promise<{
        data: { content?: string; sha: string; path: string; encoding?: string };
        headers: Record<string, string | undefined>;
      }>
    );

    const data = response as { content?: string; sha: string; path: string; encoding?: string };

    if (!data.content) {
      throw new GitHubError('File content not available', 400);
    }

    // GitHub returns base64 encoded content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    return {
      content,
      sha: data.sha,
      path: data.path,
    };
  }

  /**
   * List contents of a directory in a repository
   */
  async listDirectoryContents(
    owner: string,
    repo: string,
    path: string = ''
  ): Promise<Array<{ name: string; path: string; type: 'file' | 'dir'; sha: string }>> {
    const response = await this.request('core', () =>
      this.octokit.repos.getContent({
        owner,
        repo,
        path,
      }) as Promise<{
        data: Array<{ name: string; path: string; type: string; sha: string }>;
        headers: Record<string, string | undefined>;
      }>
    );

    const items = response as Array<{ name: string; path: string; type: string; sha: string }>;

    return items.map(item => ({
      name: item.name,
      path: item.path,
      type: item.type as 'file' | 'dir',
      sha: item.sha,
    }));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a GitHub client instance
 */
export function createGitHubClient(config?: GitHubClientConfig): GitHubClient {
  return new GitHubClient(config);
}

/**
 * Create a GitHub client from environment variables
 */
export function createGitHubClientFromEnv(): GitHubClient {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const baseUrl = process.env.GITHUB_API_URL;

  return createGitHubClient({ token, baseUrl });
}
