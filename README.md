# Claude Tiles

**Color-coded window manager for VS Code power users.**

You're 8 windows deep. Each one SSH'd to a different machine, a different PR, a different vibe. You `Cmd+Tab` and see: *Visual Studio Code — Visual Studio Code — Visual Studio Code — Visual Studio Code.*

Claude Tiles fixes this.

```
┌─ Tiles ──────────────────────────────────────────┐
│ ● oauth-flow — PR #142 "Add OAuth"              │  ← you are here
│ ● bug-fix-nav — PR #87 "Fix sidebar crash"      │  ← click to switch
│ ● spike/caching — no PR yet                     │
│ ● hotfix/prod-db — PR #201 "Fix migration"      │
│ ● main — reviewing PRs                          │
└──────────────────────────────────────────────────┘
```

A sidebar in every VS Code window showing **all** your open windows. Color-coded, auto-detected, one-click switching.

## Features

- **See everything** — sidebar shows all open VS Code windows across your machine
- **Color-coded** — 8 soft pastel colors, auto-assigned or manually picked by clicking the dot
- **Auto-detected context** — git branch, PR title/number, remote SSH host, workspace name
- **One-click switching** — click a tile to bring that window to the foreground, snapped to the same position and size
- **Inline editing** — click a tile's name to rename it directly; click the branch to copy it to clipboard
- **Title bar coloring** — each window's title bar, status bar, and activity bar tint to match its tile color
- **Activity tracking** — tiles sorted by recency with a live "Active" badge on the current window
- **Works with Remote-SSH** — detects remote hostnames and reads git state across the SSH boundary

## Platform Support

| Platform | Window switching | All other features |
|----------|------------------|--------------------|
| **macOS** | Full support (AppleScript) | Full support |
| **Linux** | Not yet supported | Full support |
| **Windows** | Not yet supported | Full support |

Window switching uses macOS AppleScript to locate and raise VS Code windows by title. On Linux and Windows, the sidebar, color-coding, branch/PR detection, and all other features work — but clicking a tile to switch windows is not yet implemented. Contributions for `wmctrl`/`xdotool` (Linux) or COM automation (Windows) are welcome.

## Install

### From source

```bash
git clone https://github.com/samkantor123/claude-tiles
cd claude-tiles
npm install
npm run build
npx @vscode/vsce package
code --install-extension claude-tiles-0.1.0.vsix
```

Reload VS Code (`Cmd+Shift+P` → "Developer: Reload Window"). Look for the **Tiles** icon in the Activity Bar.

### From VSIX release

Download the latest `.vsix` from [Releases](https://github.com/samkantor123/claude-tiles/releases), then:

```bash
code --install-extension claude-tiles-0.1.0.vsix
```

## How It Works

Each VS Code window writes its state (branch, PR, host, color, activity timestamp) to a shared JSON manifest file via VS Code's `globalStorageUri`. All windows watch the file for changes using `fs.watch`. No server, no network, no account — purely local file-based IPC.

The extension declares `extensionKind: "ui"` so it always runs on your local machine, even when connected to remote hosts via SSH. Git branch detection uses `vscode.workspace.fs` which transparently crosses the Remote-SSH boundary.

Stale windows are automatically pruned via heartbeat TTL and PID liveness checks.

## Usage

| Action | How |
|--------|-----|
| Switch to a window | Click any non-active tile |
| Change a tile's color | Click the colored dot |
| Rename a tile | Click the tile's name, type, press Enter |
| Copy branch name | Click the branch value |
| Open PR in browser | Click the PR row |
| Set label via command palette | `Cmd+Shift+P` → "Claude Tiles: Set Label" |

## Requirements

- VS Code 1.85+
- macOS for window switching (see [Platform Support](#platform-support))
- `gh` CLI (optional, for PR detection — install via `brew install gh`)
- Accessibility permissions for VS Code (macOS will prompt on first window switch)

## Contributing

PRs welcome — especially for Linux/Windows window switching. Open an issue if you hit a bug or have an idea.

## License

MIT
