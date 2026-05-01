# Claude Tiles

**Color-coded window manager for Claude Code power users.**

You're 8 windows deep. Each one SSH'd to a different machine, a different PR, a different vibe. You `Cmd+Tab` and see: *Visual Studio Code — Visual Studio Code — Visual Studio Code — Visual Studio Code.*

Claude Tiles fixes this.

```
┌─ CLAUDE TILES ───────────────────────────────────┐
│ 🔵 oauth-flow — PR #142 "Add OAuth"             │  ← you are here
│ 🟢 bug-fix-nav — PR #87 "Fix sidebar crash"     │  ← click to switch
│ 🟡 spike/caching — no PR yet                    │
│ 🔴 hotfix/prod-db — PR #201 "Fix migration"     │
│ 🟣 main — reviewing PRs                         │
│ ⚫ personal/dotfiles — no PR                     │
└──────────────────────────────────────────────────┘
```

Every VS Code window. Color-coded. One click to switch. Branch, PR, remote host — auto-detected.

## Why

If you're using Claude Code across multiple repos, multiple PRs, multiple SSH sessions — you know the pain. Window titles are useless. Mission Control is a wall of identical blue rectangles. You lose 5 minutes just *finding* the right window.

Claude Tiles gives you a sidebar in every window showing *all* your windows. Like a color-coded notebook for your dev contexts.

## Features

- **See everything** — sidebar shows all open VS Code windows across your machine
- **Color-coded** — 8 colors, auto-assigned or manually picked. Spot your hotfix at a glance.
- **Auto-detected context** — git branch, PR title/number, remote SSH host, workspace name
- **One-click switching** — click a tile to bring that window to the foreground
- **Status bar** — colored indicator at the bottom of every window so you always know where you are
- **Activity tracking** — sorted by recency; stale windows fade out
- **Custom labels** — right-click to name a tile "reviewing PRs" or "DO NOT TOUCH"
- **Works with Remote-SSH** — built for multi-machine workflows

## Install

```bash
# From source
git clone https://github.com/samkantor123/claude-tiles
cd claude-tiles
npm install && npm run build
npx @vscode/vsce package --allow-missing-repository --allow-star-activation
code --install-extension claude-tiles-0.1.0.vsix
```

Then reload VS Code. Look for the tiles icon in the Activity Bar.

## How it works

Each VS Code window writes its state (branch, PR, host, activity timestamp) to a shared JSON manifest file. All windows watch the file for changes. No server, no network, no account — just file-based IPC through VS Code's `globalStorageUri`.

The extension runs as `extensionKind: "ui"` so it stays on your local machine even when connected to remote hosts via SSH.

## Commands

| Command | What it does |
|---------|-------------|
| `Claude Tiles: Assign Color` | Pick a color for any tile |
| `Claude Tiles: Set Label` | Add a custom description |
| `Claude Tiles: Copy Branch Name` | Copy the branch to clipboard |
| `Claude Tiles: Open PR in Browser` | Opens the PR on GitHub |
| `Claude Tiles: Refresh` | Force refresh the tile list |

## For the vibe coders

This was built for the workflow where you have Claude Code running in 6 different windows, each on a different feature branch, each SSH'd to a different dev environment, and you need to keep track of which window is which without losing your mind.

If that's you, you're home.

## Contributing

PRs welcome. This is early — rough edges exist. If you hit a bug or have an idea, open an issue.

## License

MIT
