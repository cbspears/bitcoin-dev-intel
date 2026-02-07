import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { GitBranch, GitCommit, GitPullRequest, Star } from 'lucide-react'

interface RepoStat {
  name: string
  fullName: string
  stars: number
  openPRs: number
  openIssues: number
  commits30d: number
}

const mockRepos: RepoStat[] = [
  {
    name: 'bitcoin',
    fullName: 'bitcoin/bitcoin',
    stars: 78200,
    openPRs: 342,
    openIssues: 789,
    commits30d: 156,
  },
  {
    name: 'bips',
    fullName: 'bitcoin/bips',
    stars: 9400,
    openPRs: 45,
    openIssues: 123,
    commits30d: 23,
  },
  {
    name: 'rust-bitcoin',
    fullName: 'rust-bitcoin/rust-bitcoin',
    stars: 1900,
    openPRs: 28,
    openIssues: 67,
    commits30d: 89,
  },
]

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

export function RepoStats() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Repository Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockRepos.map((repo) => (
            <div
              key={repo.fullName}
              className="rounded-md border border-border p-3"
            >
              <div className="mb-3 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm font-semibold">
                  {repo.fullName}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className="text-sm font-semibold">
                      {formatNumber(repo.stars)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Stars</p>
                </div>
                <div className="rounded bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <GitPullRequest className="h-3 w-3 text-green-500" />
                    <span className="text-sm font-semibold">{repo.openPRs}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Open PRs</p>
                </div>
                <div className="rounded bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <GitBranch className="h-3 w-3 text-red-500" />
                    <span className="text-sm font-semibold">
                      {repo.openIssues}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Issues</p>
                </div>
                <div className="rounded bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <GitCommit className="h-3 w-3 text-blue-500" />
                    <span className="text-sm font-semibold">
                      {repo.commits30d}
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
