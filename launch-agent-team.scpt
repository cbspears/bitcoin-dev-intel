tell application "iTerm2"
    activate
    
    -- Create a new window
    create window with default profile
    
    tell current session of current window
        set name to "GitHub Agent"
        write text "cd ~/Documents/Main/domains/projects/Bitcoin\\ Dev\\ Intel && git checkout -b feat/github-integration 2>/dev/null || git checkout feat/github-integration && claude --prompt 'You are the GitHub Integration Agent. Your task: Build the GitHub data source integration in src/data-sources/github/. Create: 1) A GitHub API client with rate limiting 2) Functions to fetch repos, PRs, issues, and commits from bitcoin/bitcoin, bitcoin/bips, and related repos 3) TypeScript types for all GitHub data structures 4) A scheduled fetcher that polls for updates. Use the Octokit library. Commit your work frequently with clear messages. Read CLAUDE.md for architecture details.'"
        
        -- Split horizontally for second agent
        split horizontally with default profile
    end tell
    
    tell second session of current tab of current window
        set name to "BIP Tracker Agent"
        write text "cd ~/Documents/Main/domains/projects/Bitcoin\\ Dev\\ Intel && git checkout -b feat/bip-tracker 2>/dev/null || git checkout feat/bip-tracker && claude --prompt 'You are the BIP Tracker Agent. Your task: Build the BIP (Bitcoin Improvement Proposal) tracker in src/trackers/bip/. Create: 1) A BIP parser that extracts metadata from BIP markdown files 2) Status tracking (Draft, Proposed, Final, Replaced, etc.) 3) Types for BIP data (number, title, author, status, type, layer) 4) Functions to detect BIP updates and changes 5) A summary generator for recent BIP activity. Commit your work frequently with clear messages. Read CLAUDE.md for architecture details.'"
        
        -- Split horizontally for third agent
        split horizontally with default profile
    end tell
    
    tell third session of current tab of current window
        set name to "Dashboard Agent"
        write text "cd ~/Documents/Main/domains/projects/Bitcoin\\ Dev\\ Intel && git checkout -b feat/dashboard 2>/dev/null || git checkout feat/dashboard && claude --prompt 'You are the Dashboard Agent. Your task: Set up the frontend dashboard in src/dashboard/. Create: 1) Initialize Vite + React + TypeScript project 2) Set up Tailwind CSS and Shadcn/ui 3) Create the main layout with sidebar navigation 4) Build placeholder components for: ActivityFeed, BIPList, RepoStats, ContributorGraph 5) Create a responsive grid layout for the dashboard. Commit your work frequently with clear messages. Read CLAUDE.md for architecture details.'"
    end tell
    
end tell
