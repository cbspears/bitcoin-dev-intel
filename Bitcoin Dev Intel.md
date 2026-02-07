# Bitcoin Dev Intel

#project #bitcoin-tech #blockspace #agent-swarms

**Status:** 🟡 Setup Phase  
**Type:** Web Application + Research Tool  
**Stack:** Next.js, TypeScript, Tailwind CSS  
**Repo:** [GitHub](https://github.com/YOUR_USERNAME/bitcoin-dev-intel) *(update with actual URL)*

## Overview

The Bloomberg Terminal for Bitcoin Development. A real-time intelligence dashboard that aggregates and displays activity across every major Bitcoin development channel — built by [[Blockspace]] as both an internal newsroom tool and eventually a public-facing product.

## Data Sources

- **Bitcoin Core GitHub** — PRs, issues, commits from [bitcoin/bitcoin](https://github.com/bitcoin/bitcoin)
- **Bitcoin Dev Mailing List** — Threads from bitcoin-dev and lightning-dev
- **BIP Tracker** — Proposal statuses, authors, activation timelines
- **Bitcoin Optech** — Newsletters, blog posts, topic summaries
- **Bitcoin Inquisition** — Experimental soft fork deployments on signet
- **IRC Channels** — #bitcoin-core-dev, #bitcoin-core-pr-reviews, #bitcoin-wizards, #lightning-dev, #bitcoin-signet
- **Testnets** — Testnet4, default Signet, Inquisition Signet, Mutinynet
- **Social Feeds** — Twitter/X developer lists, Nostr relays

## Agent Team Architecture

This project is being built using Claude Code Agent Teams — multiple AI agents working in parallel on different modules:

| Agent | Responsibility |
|-------|---------------|
| 🎯 Team Lead | Orchestration, task board, synthesis |
| 🐙 GitHub Agent | bitcoin/bitcoin API integration |
| 📧 Mailing List Agent | List archive scraper |
| 📋 BIP Agent | BIP repo parser |
| 📰 Optech Agent | Newsletter fetcher |
| 💬 IRC Agent | Log scraper + meeting summaries |
| 🧪 Inquisition Agent | Signet experiment tracker |
| 🌐 Social Agent | Twitter/Nostr feed monitor |
| 🔧 Testnet Agent | Testnet status monitoring |

## Implementation Phases

### Phase 1: Foundation ← Current
- [x] Design dashboard prototype
- [ ] Install Claude Code
- [ ] Create GitHub repo
- [ ] Set up CLAUDE.md
- [ ] Initialize Next.js project
- [ ] Enable agent teams

### Phase 2: Agent Development
- [ ] GitHub Agent: Bitcoin Core API integration
- [ ] Mailing List Agent: Archive scraper
- [ ] BIP Agent: BIP repo parser
- [ ] IRC Agent: Log scraper
- [ ] Optech Agent: Newsletter fetcher
- [ ] Social Agent: Twitter/Nostr monitor
- [ ] Testnet Agent: Status tracker
- [ ] Inquisition Agent: Experiment tracker

### Phase 3: Dashboard & Deploy
- [ ] Next.js frontend with real-time data
- [ ] API backend aggregating all sources
- [ ] Scheduled data refresh pipelines
- [ ] Search and filtering
- [ ] Deploy to Vercel
- [ ] Blockspace branding

## Related
- [[OPNEXT 2026]] — Conference where this could be demoed
- [[Vibe Code Projects]] — Other coding projects
