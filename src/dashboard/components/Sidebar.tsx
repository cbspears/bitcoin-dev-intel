import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Activity,
  FileText,
  GitBranch,
  Home,
  Settings,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'BIPs', href: '/bips', icon: FileText },
  { name: 'Repositories', href: '/repos', icon: GitBranch },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="h-8 w-8 rounded-md bg-bitcoin-orange" />
        <span className="text-lg font-semibold">Bitcoin Dev Intel</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-md bg-secondary/50 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">
            Tracking 5 repositories
          </span>
        </div>
      </div>
    </aside>
  )
}
