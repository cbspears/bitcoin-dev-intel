import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { trpc, createTRPCClient, createQueryClient } from '../lib/trpc'
import { MainLayout } from './layouts/MainLayout'
import { ActivityFeed } from './components/ActivityFeed'
import { BIPList } from './components/BIPList'
import { RepoStats } from './components/RepoStats'

function DashboardHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Track Bitcoin development activity across repositories, BIPs, and discussions.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityFeed />
        <div className="space-y-6">
          <RepoStats />
          <BIPList />
        </div>
      </div>
    </div>
  )
}

function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">
          Recent development activity across tracked repositories.
        </p>
      </div>
      <ActivityFeed />
    </div>
  )
}

function BIPsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">BIPs</h1>
        <p className="text-muted-foreground">
          Bitcoin Improvement Proposals tracker.
        </p>
      </div>
      <BIPList />
    </div>
  )
}

function ReposPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
        <p className="text-muted-foreground">
          Statistics for tracked Bitcoin repositories.
        </p>
      </div>
      <RepoStats />
    </div>
  )
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your Bitcoin Dev Intel dashboard.
        </p>
      </div>
      <div className="rounded-md border border-border p-6">
        <p className="text-muted-foreground">Settings page coming soon...</p>
      </div>
    </div>
  )
}

export default function App() {
  const [queryClient] = useState(() => createQueryClient())
  const [trpcClient] = useState(() => createTRPCClient())

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <MainLayout>
            <Routes>
              <Route path="/" element={<DashboardHome />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/bips" element={<BIPsPage />} />
              <Route path="/repos" element={<ReposPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </MainLayout>
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
