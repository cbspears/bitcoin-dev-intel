/**
 * GitHub Data Fetcher
 * High-level functions to fetch and transform data from Bitcoin-related repositories
 */

import { GitHubClient, createGitHubClientFromEnv } from './client';
import type {
  Repository,
  PullRequest,
  Issue,
  Commit,
  Contributor,
  GitHubUser,
  Label,
  Milestone,
  CommitFile,
  TrackedRepository,
  PullRequestFilter,
  IssueFilter,
  CommitFilter,
  PaginationOptions,
} from './types';
import { TRACKED_REPOSITORIES } from './types';

// ============================================================================
// Type Transformers
// ============================================================================

/**
 * Transform GitHub API user to our GitHubUser type
 */
function transformUser(user: {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  type: string;
} | null): GitHubUser | null {
  if (!user) return null;
  return {
    id: user.id,
    login: user.login,
    avatarUrl: user.avatar_url,
    htmlUrl: user.html_url,
    type: user.type as 'User' | 'Bot' | 'Organization',
  };
}

/**
 * Transform GitHub API label to our Label type
 */
function transformLabel(label: {
  id: number;
  name: string;
  color: string;
  description: string | null;
}): Label {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
    description: label.description,
  };
}

/**
 * Transform GitHub API milestone to our Milestone type
 */
function transformMilestone(milestone: {
  id: number;
  number: number;
  title: string;
  description: string | null;
  state: string;
  due_on: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
} | null): Milestone | null {
  if (!milestone) return null;
  return {
    id: milestone.id,
    number: milestone.number,
    title: milestone.title,
    description: milestone.description,
    state: milestone.state as 'open' | 'closed',
    dueOn: milestone.due_on,
    createdAt: milestone.created_at,
    updatedAt: milestone.updated_at,
    closedAt: milestone.closed_at,
  };
}

// ============================================================================
// Fetcher Class
// ============================================================================

/**
 * High-level data fetcher for Bitcoin development repositories
 */
export class GitHubFetcher {
  private client: GitHubClient;
  private trackedRepos: TrackedRepository[];

  constructor(client?: GitHubClient, trackedRepos?: TrackedRepository[]) {
    this.client = client || createGitHubClientFromEnv();
    this.trackedRepos = trackedRepos || TRACKED_REPOSITORIES;
  }

  // ===========================================================================
  // Repository Methods
  // ===========================================================================

  /**
   * Fetch repository information
   */
  async fetchRepository(owner: string, repo: string): Promise<Repository> {
    const data = await this.client.getRepository(owner, repo);

    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      owner: transformUser(data.owner)!,
      description: data.description,
      htmlUrl: data.html_url,
      defaultBranch: data.default_branch,
      language: data.language,
      forksCount: data.forks_count,
      stargazersCount: data.stargazers_count,
      watchersCount: data.watchers_count,
      openIssuesCount: data.open_issues_count,
      topics: data.topics || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at,
    };
  }

  /**
   * Fetch all tracked repositories
   */
  async fetchTrackedRepositories(): Promise<Repository[]> {
    const results = await Promise.all(
      this.trackedRepos.map(({ owner, name }) =>
        this.fetchRepository(owner, name).catch(err => {
          console.error(`Failed to fetch ${owner}/${name}:`, err.message);
          return null;
        })
      )
    );

    return results.filter((r): r is Repository => r !== null);
  }

  // ===========================================================================
  // Pull Request Methods
  // ===========================================================================

  /**
   * Fetch pull requests for a repository
   */
  async fetchPullRequests(
    owner: string,
    repo: string,
    filter: PullRequestFilter = {}
  ): Promise<PullRequest[]> {
    const { page = 1, perPage = 30, state = 'open', sort = 'updated', direction = 'desc' } = filter;

    const data = await this.client.listPullRequests(owner, repo, {
      state,
      sort,
      direction,
      page,
      per_page: perPage,
    });

    return data.map(pr => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state as 'open' | 'closed',
      htmlUrl: pr.html_url,
      user: transformUser(pr.user)!,
      labels: pr.labels.map(l => transformLabel(l as any)),
      assignees: pr.assignees?.map(a => transformUser(a)!).filter(Boolean) || [],
      reviewers: pr.requested_reviewers?.map(r => transformUser(r as any)!).filter(Boolean) || [],
      milestone: transformMilestone(pr.milestone as any),
      draft: pr.draft || false,
      merged: false, // Not available in list response
      mergedAt: null,
      mergedBy: null,
      commits: 0, // Not available in list response
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      closedAt: pr.closed_at,
      repository: { owner, name: repo },
    }));
  }

  /**
   * Fetch a single pull request with full details
   */
  async fetchPullRequest(owner: string, repo: string, number: number): Promise<PullRequest> {
    const pr = await this.client.getPullRequest(owner, repo, number);

    return {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state as 'open' | 'closed',
      htmlUrl: pr.html_url,
      user: transformUser(pr.user)!,
      labels: pr.labels.map(l => transformLabel(l as any)),
      assignees: pr.assignees?.map(a => transformUser(a)!).filter(Boolean) || [],
      reviewers: pr.requested_reviewers?.map(r => transformUser(r as any)!).filter(Boolean) || [],
      milestone: transformMilestone(pr.milestone as any),
      draft: pr.draft || false,
      merged: pr.merged,
      mergedAt: pr.merged_at,
      mergedBy: transformMilestone(pr.merged_by as any) as any,
      commits: pr.commits,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      closedAt: pr.closed_at,
      repository: { owner, name: repo },
    };
  }

  /**
   * Fetch recent pull requests across all tracked repositories
   */
  async fetchRecentPullRequests(
    options: PaginationOptions & { state?: 'open' | 'closed' | 'all' } = {}
  ): Promise<PullRequest[]> {
    const { page = 1, perPage = 10, state = 'open' } = options;

    const allPRs = await Promise.all(
      this.trackedRepos.map(({ owner, name }) =>
        this.fetchPullRequests(owner, name, { page, perPage, state }).catch(err => {
          console.error(`Failed to fetch PRs from ${owner}/${name}:`, err.message);
          return [] as PullRequest[];
        })
      )
    );

    // Flatten and sort by updated date
    return allPRs
      .flat()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  // ===========================================================================
  // Issue Methods
  // ===========================================================================

  /**
   * Fetch issues for a repository (excludes pull requests)
   */
  async fetchIssues(owner: string, repo: string, filter: IssueFilter = {}): Promise<Issue[]> {
    const {
      page = 1,
      perPage = 30,
      state = 'open',
      sort = 'updated',
      direction = 'desc',
      since,
      labels,
    } = filter;

    const data = await this.client.listIssues(owner, repo, {
      state,
      sort,
      direction,
      page,
      per_page: perPage,
      since,
      labels: labels?.join(','),
    });

    // Filter out pull requests (they appear in issues API)
    const issuesOnly = data.filter(issue => !issue.pull_request);

    return issuesOnly.map(issue => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state as 'open' | 'closed',
      stateReason: (issue.state_reason as Issue['stateReason']) || null,
      htmlUrl: issue.html_url,
      user: transformUser(issue.user)!,
      labels: issue.labels.map(l =>
        typeof l === 'string' ? { id: 0, name: l, color: '', description: null } : transformLabel(l as any)
      ),
      assignees: issue.assignees?.map(a => transformUser(a)!).filter(Boolean) || [],
      milestone: transformMilestone(issue.milestone as any),
      comments: issue.comments,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      closedBy: null, // Not available in list response
      repository: { owner, name: repo },
    }));
  }

  /**
   * Fetch a single issue with full details
   */
  async fetchIssue(owner: string, repo: string, number: number): Promise<Issue> {
    const issue = await this.client.getIssue(owner, repo, number);

    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state as 'open' | 'closed',
      stateReason: (issue.state_reason as Issue['stateReason']) || null,
      htmlUrl: issue.html_url,
      user: transformUser(issue.user)!,
      labels: issue.labels.map(l =>
        typeof l === 'string' ? { id: 0, name: l, color: '', description: null } : transformLabel(l as any)
      ),
      assignees: issue.assignees?.map(a => transformUser(a)!).filter(Boolean) || [],
      milestone: transformMilestone(issue.milestone as any),
      comments: issue.comments,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      closedBy: transformUser(issue.closed_by as any),
      repository: { owner, name: repo },
    };
  }

  /**
   * Fetch recent issues across all tracked repositories
   */
  async fetchRecentIssues(
    options: PaginationOptions & { state?: 'open' | 'closed' | 'all' } = {}
  ): Promise<Issue[]> {
    const { page = 1, perPage = 10, state = 'open' } = options;

    const allIssues = await Promise.all(
      this.trackedRepos.map(({ owner, name }) =>
        this.fetchIssues(owner, name, { page, perPage, state }).catch(err => {
          console.error(`Failed to fetch issues from ${owner}/${name}:`, err.message);
          return [] as Issue[];
        })
      )
    );

    // Flatten and sort by updated date
    return allIssues
      .flat()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  // ===========================================================================
  // Commit Methods
  // ===========================================================================

  /**
   * Fetch commits for a repository
   */
  async fetchCommits(owner: string, repo: string, filter: CommitFilter = {}): Promise<Commit[]> {
    const { page = 1, perPage = 30, sha, path, author, since, until } = filter;

    const data = await this.client.listCommits(owner, repo, {
      sha,
      path,
      author,
      since,
      until,
      page,
      per_page: perPage,
    });

    return data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author?.name || 'Unknown',
        email: commit.commit.author?.email || '',
        date: commit.commit.author?.date || '',
      },
      committer: {
        name: commit.commit.committer?.name || 'Unknown',
        email: commit.commit.committer?.email || '',
        date: commit.commit.committer?.date || '',
      },
      htmlUrl: commit.html_url,
      authorUser: transformUser(commit.author as any),
      committerUser: transformUser(commit.committer as any),
      repository: { owner, name: repo },
    }));
  }

  /**
   * Fetch a single commit with full details
   */
  async fetchCommit(owner: string, repo: string, ref: string): Promise<Commit> {
    const commit = await this.client.getCommit(owner, repo, ref);

    return {
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author?.name || 'Unknown',
        email: commit.commit.author?.email || '',
        date: commit.commit.author?.date || '',
      },
      committer: {
        name: commit.commit.committer?.name || 'Unknown',
        email: commit.commit.committer?.email || '',
        date: commit.commit.committer?.date || '',
      },
      htmlUrl: commit.html_url,
      authorUser: transformUser(commit.author as any),
      committerUser: transformUser(commit.committer as any),
      stats: commit.stats
        ? {
            additions: commit.stats.additions || 0,
            deletions: commit.stats.deletions || 0,
            total: commit.stats.total || 0,
          }
        : undefined,
      files: commit.files?.map(f => ({
        filename: f.filename || '',
        status: f.status as CommitFile['status'],
        additions: f.additions || 0,
        deletions: f.deletions || 0,
        changes: f.changes || 0,
        patch: f.patch,
      })),
      repository: { owner, name: repo },
    };
  }

  /**
   * Fetch recent commits across all tracked repositories
   */
  async fetchRecentCommits(options: PaginationOptions & { since?: string } = {}): Promise<Commit[]> {
    const { page = 1, perPage = 10, since } = options;

    const allCommits = await Promise.all(
      this.trackedRepos.map(({ owner, name }) =>
        this.fetchCommits(owner, name, { page, perPage, since }).catch(err => {
          console.error(`Failed to fetch commits from ${owner}/${name}:`, err.message);
          return [] as Commit[];
        })
      )
    );

    // Flatten and sort by date
    return allCommits
      .flat()
      .sort((a, b) => new Date(b.author.date).getTime() - new Date(a.author.date).getTime());
  }

  // ===========================================================================
  // Contributor Methods
  // ===========================================================================

  /**
   * Fetch contributors for a repository
   */
  async fetchContributors(
    owner: string,
    repo: string,
    options: PaginationOptions = {}
  ): Promise<Contributor[]> {
    const { page = 1, perPage = 30 } = options;

    const data = await this.client.listContributors(owner, repo, {
      page,
      per_page: perPage,
    });

    return data
      .filter(c => c.type !== 'Anonymous')
      .map(c => ({
        user: {
          id: c.id!,
          login: c.login!,
          avatarUrl: c.avatar_url!,
          htmlUrl: c.html_url!,
          type: c.type as 'User' | 'Bot' | 'Organization',
        },
        contributions: c.contributions,
      }));
  }

  /**
   * Fetch top contributors across all tracked repositories
   */
  async fetchTopContributors(options: PaginationOptions = {}): Promise<Contributor[]> {
    const { perPage = 10 } = options;

    const allContributors = await Promise.all(
      this.trackedRepos.map(({ owner, name }) =>
        this.fetchContributors(owner, name, { perPage: 100 }).catch(err => {
          console.error(`Failed to fetch contributors from ${owner}/${name}:`, err.message);
          return [] as Contributor[];
        })
      )
    );

    // Aggregate contributions by user
    const contributorMap = new Map<string, Contributor>();

    for (const contributors of allContributors) {
      for (const contributor of contributors) {
        const existing = contributorMap.get(contributor.user.login);
        if (existing) {
          existing.contributions += contributor.contributions;
        } else {
          contributorMap.set(contributor.user.login, { ...contributor });
        }
      }
    }

    // Sort by total contributions and return top N
    return Array.from(contributorMap.values())
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, perPage);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a fetcher instance
 */
export function createFetcher(client?: GitHubClient): GitHubFetcher {
  return new GitHubFetcher(client);
}

/**
 * Create a fetcher for Bitcoin Core only
 */
export function createBitcoinCoreFetcher(client?: GitHubClient): GitHubFetcher {
  return new GitHubFetcher(client, [
    { owner: 'bitcoin', name: 'bitcoin', displayName: 'Bitcoin Core', category: 'core' },
  ]);
}

/**
 * Create a fetcher for BIPs only
 */
export function createBIPsFetcher(client?: GitHubClient): GitHubFetcher {
  return new GitHubFetcher(client, [
    { owner: 'bitcoin', name: 'bips', displayName: 'BIPs', category: 'specs' },
  ]);
}

/**
 * Create a fetcher for Lightning BOLTs only
 */
export function createBOLTsFetcher(client?: GitHubClient): GitHubFetcher {
  return new GitHubFetcher(client, [
    { owner: 'lightning', name: 'bolts', displayName: 'Lightning BOLTs', category: 'specs' },
  ]);
}
