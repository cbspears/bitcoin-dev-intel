import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { GitBranch, GitCommit, GitPullRequest, Star } from 'lucide-react'
import { trpc } from '../../lib/trpc'

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

export function RepoStats() {
  const { data: repos, isLoading, error } = trpc.repos.list.useQuery()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Repository Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse h-24 bg-muted rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Repository Stats</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Failed to load repositories
        </CardContent>
      </Card>
    )
  }

  if (!repos || repos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Repository Stats</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          No repositories yet. Run a sync to fetch data.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Repository Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {repos.map((repo: Record<string, unknown>) => (
            <div
              key={repo.full_name as string}
              className="rounded-md border border-border p-3"
            >
              <div className="mb-3 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm font-semibold">
                  {repo.full_name as string}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className="text-sm font-semibold">
                      {formatNumber((repo.stargazers_count as number) || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Stars</p>
                </div>
                <div className="rounded bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <GitPullRequest className="h-3 w-3 text-green-500" />
                    <span className="text-sm font-semibold">{(repo.open_prs_count as number) || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Open PRs</p>
                </div>
                <div className="rounded bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <GitBranch className="h-3 w-3 text-red-500" />
                    <span className="text-sm font-semibold">
                      {(repo.open_issues_count as number) || 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Issues</p>
                </div>
                <div className="rounded bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <GitCommit className="h-3 w-3 text-blue-500" />
                    <span className="text-sm font-semibold">
                      {(repo.commits_30d as number) || 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">30d Commits</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
