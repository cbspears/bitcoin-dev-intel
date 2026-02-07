#!/bin/bash

PROJECT_DIR="$HOME/Documents/Main/domains/projects/Bitcoin Dev Intel"

# GitHub Agent command
CMD1="cd '$PROJECT_DIR' && git checkout feat/github-integration && claude -p 'You are the GitHub Integration Agent. Build src/data-sources/github/: Octokit client, fetch bitcoin/bitcoin and bitcoin/bips data, TypeScript interfaces. Read CLAUDE.md. Commit often.'"

# BIP Tracker Agent command  
CMD2="cd '$PROJECT_DIR' && git checkout feat/bip-tracker && claude -p 'You are the BIP Tracker Agent. Build src/trackers/bip/: BIP parser, status tracking, TypeScript types. Read CLAUDE.md. Commit often.'"

# Dashboard Agent command
CMD3="cd '$PROJECT_DIR' && git checkout feat/dashboard && claude -p 'You are the Dashboard Agent. Build src/dashboard/: Vite+React+TS, Tailwind+Shadcn, sidebar layout, placeholder components. Read CLAUDE.md. Commit often.'"

osascript - "$CMD1" "$CMD2" "$CMD3" <<'APPLESCRIPT'
on run argv
    set cmd1 to item 1 of argv
    set cmd2 to item 2 of argv
    set cmd3 to item 3 of argv
    
    tell application "iTerm"
        activate
        
        tell current window
            -- First pane (top)
            tell current session
                write text cmd1
            end tell
            
            -- Split for second pane
            tell current session
                set session2 to (split horizontally with same profile)
            end tell
            
            tell session2
                write text cmd2
            end tell
            
            -- Split for third pane
            tell session2
                set session3 to (split horizontally with same profile)
            end tell
            
            tell session3
                write text cmd3
            end tell
        end tell
    end tell
end run
APPLESCRIPT
