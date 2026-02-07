import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

interface BIP {
  number: number
  title: string
  status: 'draft' | 'proposed' | 'final' | 'active' | 'replaced'
  layer: string
  author: string
}

const mockBIPs: BIP[] = [
  {
    number: 340,
    title: 'Schnorr Signatures for secp256k1',
    status: 'final',
    layer: 'Applications',
    author: 'Pieter Wuille',
  },
  {
    number: 341,
    title: 'Taproot: SegWit version 1 spending rules',
    status: 'final',
    layer: 'Consensus (soft fork)',
    author: 'Pieter Wuille',
  },
  {
    number: 347,
    title: 'OP_CAT',
    status: 'draft',
    layer: 'Consensus (soft fork)',
    author: 'Ethan Heilman',
  },
  {
    number: 119,
    title: 'CHECKTEMPLATEVERIFY',
    status: 'draft',
    layer: 'Consensus (soft fork)',
    author: 'Jeremy Rubin',
  },
]

const statusVariants: Record<BIP['status'], 'default' | 'secondary' | 'success' | 'warning' | 'outline'> = {
  draft: 'warning',
  proposed: 'secondary',
  final: 'success',
  active: 'success',
  replaced: 'outline',
}

export function BIPList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notable BIPs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockBIPs.map((bip) => (
            <div
              key={bip.number}
              className="flex items-center justify-between rounded-md border border-border p-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-primary">
                    BIP-{bip.number}
                  </span>
                  <Badge variant={statusVariants[bip.status]}>
                    {bip.status}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{bip.title}</p>
                <p className="text-xs text-muted-foreground">
                  {bip.layer} - {bip.author}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
