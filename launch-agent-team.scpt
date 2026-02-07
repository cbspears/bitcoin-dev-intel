tell application "iTerm2"
    activate
    
    create window with default profile
    
    tell current window
        tell current session
            set name to "GitHub Agent"
            write text "cd ~/Documents/Main/domains/projects/Bitcoin\\ Dev\\ Intel && git checkout feat/github-integration"
            write text "claude -p 'You are the GitHub Integration Agent. Build the GitHub data source in src/data-sources/github/. Create: 1) GitHub API client with Octokit and rate limiting 2) Functions to fetch repos, PRs, issues from bitcoin/bitcoin and bitcoin/bips 3) TypeScript interfaces for GitHub data. Commit frequently. Read CLAUDE.md first.'"
        end tell
        
        tell current session
            split vertically with default profile
        end tell
        
        tell second session
            set name to "BIP Tracker Agent"
            write text "cd ~/Documents/Main/domains/projects/Bitcoin\\ Dev\\ Intel && git checkout feat/bip-tracker"
            write text "claude -p 'You are the BIP Tracker Agent. Build the BIP tracker in src/trackers/bip/. Create: 1) BIP parser for markdown files 2) Status tracking (Draft, Proposed, Final) 3) TypeScript types for BIP metadata 4) Change detection functions. Commit frequently. Read CLAUDE.md first.'"
        end tell
        
        tell second session
            split vertically with default profile
        end tell
        
        tell third session
            set name to "Dashboard Agent"  
            write text "cd ~/Documents/Main/domains/projects/Bitcoin\\ Dev\\ Intel && git checkout feat/dashboard"
            write text "claude -p 'You are the Dashboard Agent. Set up frontend in src/dashboard/. Create: 1) Vite + React + TypeScript project 2) Tailwind CSS + Shadcn/ui setup 3) Main layout with sidebar 4) Placeholder components: ActivityFeed, BIPList, RepoStats. Commit frequently. Read CLAUDE.md first.'"
        end tell
    end tell
end tell
