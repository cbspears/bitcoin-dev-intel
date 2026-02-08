import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { trpc } from '../../lib/trpc'

type EventType = 'pr' | 'issue' | 'commit' | 'review' | 'pr_opened' | 'pr_merged' | 'pr_closed' | 'issue_opened' | 'issue_closed' | 'push'

const typeColors: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  pr: 'default',
  pr_opened: 'default',
  pr_merged: 'default',
  pr_closed: 'secondary',
  issue: 'destructive',
  issue_opened: 'destructive',
  issue_closed: 'secondary',
  commit: 'secondary',
  push: 'secondary',
  review: 'outline',
}

const typeLabels: Record<string, string> = {
  pr: 'PR',
  pr_opened: 'PR Opened',
  pr_merged: 'PR Merged',
  pr_closed: 'PR Closed',
  issue: 'Issue',
  issue_opened: 'Issue',
  issue_closed: 'Issue Closed',
  commit: 'Commit',
  push: 'Push',
  review: 'Review',
}

/**
 * Format a timestamp to a relative time string (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) {
    return 'just now'
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  } else {
    return date.toLocaleDateString()
  }
}

export function ActivityFeed() {
  const { data: activity, isLoading, error } = trpc.activity.recent.useQuery({
    limit: 10,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse h-16 bg-muted rounded-md" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Failed to load activity
        </CardContent>
      </Card>
    )
  }

  if (!activity || activity.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          No activity yet. Run a sync to fetch data.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activity.map((item: Record<string, unknown>) => {
          const eventType = (item.event_type as string) as EventType
          const badgeVariant = typeColors[eventType] || 'default'
          const label = typeLabels[eventType] || (item.event_type as string)
          const repoFullName = item.repo_owner && item.repo_name
            ? `${item.repo_owner}/${item.repo_name}`
            : 'Unknown repo'

          return (
            <div
              key={item.id as number}
              className="flex items-start gap-3 rounded-md border border-border p-3"
            >
              <Badge variant={badgeVariant}>
                {label}
              </Badge>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-tight">{item.title as string}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{repoFullName}</span>
                  {item.author && <span>by {item.author as string}</span>}
                  <span>{formatRelativeTime(item.event_timestamp as string)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
