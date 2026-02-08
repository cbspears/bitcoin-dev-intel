import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { trpc } from '../../lib/trpc'

type BIPStatus = 'Draft' | 'Proposed' | 'Final' | 'Active' | 'Replaced' | 'Withdrawn' | 'Deferred' | 'Rejected'

const statusVariants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'outline'> = {
  Draft: 'warning',
  Proposed: 'secondary',
  Final: 'success',
  Active: 'success',
  Replaced: 'outline',
  Withdrawn: 'outline',
  Deferred: 'secondary',
  Rejected: 'outline',
}

export function BIPList() {
  const { data: bipList, isLoading, error } = trpc.bips.list.useQuery({
    limit: 10,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notable BIPs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-muted rounded-md" />
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
          <CardTitle className="text-lg">Notable BIPs</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Failed to load BIPs
        </CardContent>
      </Card>
    )
  }

  if (!bipList || bipList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notable BIPs</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          No BIPs yet. Run a sync to fetch data.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notable BIPs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bipList.map((bip) => {
            const status = bip.status as BIPStatus
            const badgeVariant = statusVariants[status] || 'default'
            // Get the first author's name, or fallback
            const authors = bip.authors as Array<{ name: string; email?: string }> | null
            const authorName = authors && authors.length > 0 ? authors[0].name : 'Unknown'

            return (
              <div
                key={bip.number}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-primary">
                      BIP-{bip.number}
                    </span>
                    <Badge variant={badgeVariant}>
                      {bip.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{bip.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {bip.layer || bip.type} - {authorName}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
