# Bitcoin Dev Intel

A dashboard for tracking Bitcoin development activity across GitHub repositories, BIPs, and developer discussions.

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **UI Components**: Shadcn/ui + Tailwind CSS
- **Data Layer**: tRPC + Zod for type-safe API
- **Database**: Postgres via Neon/Supabase + Drizzle ORM

### Project Structure
```
src/
├── agents/           # Agent coordination and orchestration
├── data-sources/     # GitHub API, mailing list scrapers
│   └── github/       # GitHub integration (repos, PRs, issues)
├── trackers/         # BIP tracker, release tracker
│   └── bip/          # Bitcoin Improvement Proposals
└── dashboard/        # Frontend dashboard
    ├── components/   # UI components
    └── layouts/      # Page layouts
```

## Key Repositories to Track
- bitcoin/bitcoin (Core)
- bitcoin/bips (BIPs)
- lightning/bolts (Lightning specs)
- ElementsProject/elements
- rust-bitcoin/rust-bitcoin

## Agent Team Coordination
When working with multiple agents, use feature branches:
- `feat/github-integration` - GitHub data source
- `feat/bip-tracker` - BIP tracking
- `feat/dashboard` - Frontend layout

Commit frequently with clear messages for context handoff.
