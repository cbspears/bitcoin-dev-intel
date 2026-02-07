import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

interface ActivityItem {
  id: string
  type: 'pr' | 'issue' | 'commit' | 'review'
  title: string
  repo: string
  author: string
  timestamp: string
}

const mockActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'pr',
    title: 'Add support for Taproot descriptors',
    repo: 'bitcoin/bitcoin',
    author: 'sipa',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    type: 'issue',
    title: 'Memory usage spike during IBD',
    repo: 'bitcoin/bitcoin',
    author: 'laanwj',
    timestamp: '4 hours ago',
  },
  {
    id: '3',
    type: 'commit',
    title: 'refactor: Simplify wallet loading',
    repo: 'bitcoin/bitcoin',
    author: 'achow101',
    timestamp: '6 hours ago',
  },
  {
    id: '4',
    type: 'review',
    title: 'Review: BIP-347 implementation',
    repo: 'bitcoin/bips',
    author: 'instagibbs',
    timestamp: '8 hours ago',
  },
]

const typeColors: Record<ActivityItem['type'], string> = {
  pr: 'default',
  issue: 'destructive',
  commit: 'secondary',
  review: 'outline',
}

const typeLabels: Record<ActivityItem['type'], string> = {
  pr: 'PR',
  issue: 'Issue',
  commit: 'Commit',
  review: 'Review',
}

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockActivity.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-md border border-border p-3"
          >
            <Badge variant={typeColors[item.type] as 'default' | 'destructive' | 'secondary' | 'outline'}>
              {typeLabels[item.type]}
            </Badge>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-tight">{item.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{item.repo}</span>
                <span>by {item.author}</span>
                <span>{item.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
