import * as vscode from 'vscode';
import { ManifestManager } from '../manifest/manifestManager';
import { WindowEntry } from '../types';

export const COLOR_MAP: Record<string, string> = {
  blue: '#7eb8da',
  green: '#8bbf9f',
  purple: '#b4a7d6',
  cyan: '#82c4c3',
  pink: '#d4a0b9',
  orange: '#d4b08c',
  yellow: '#c9c08f',
  red: '#c9908f',
};

export class TilesWebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly manifestManager: ManifestManager,
    private readonly currentWindowId: string,
  ) {
    manifestManager.onDidChange(() => this.refresh());
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.onDidReceiveMessage((msg) => {
      switch (msg.type) {
        case 'switchWindow':
          vscode.commands.executeCommand('claudeTiles.switchWindow', msg.entry);
          break;
        case 'assignColor':
          vscode.commands.executeCommand('claudeTiles.assignColorById', msg.windowId);
          break;
        case 'setLabel':
          if (msg.label !== undefined) {
            vscode.commands.executeCommand('claudeTiles.setLabelDirectly', msg.windowId, msg.label);
          } else {
            vscode.commands.executeCommand('claudeTiles.setLabelById', msg.windowId);
          }
          break;
        case 'copyBranch':
          if (msg.branch) {
            vscode.env.clipboard.writeText(msg.branch);
            vscode.window.showInformationMessage(`Copied: ${msg.branch}`);
          }
          break;
        case 'openPr':
          vscode.commands.executeCommand('claudeTiles.openPrById', msg.windowId);
          break;
      }
    });

    this.refresh();
  }

  refresh(): void {
    if (!this.view) return;
    const manifest = this.manifestManager.getManifest();
    const entries = Object.values(manifest.windows).sort((a, b) => {
      const aIsCurrent = a.windowId === this.currentWindowId ? 0 : 1;
      const bIsCurrent = b.windowId === this.currentWindowId ? 0 : 1;
      if (aIsCurrent !== bIsCurrent) return aIsCurrent - bIsCurrent;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
    this.view.webview.html = this.getHtml(entries);
  }

  private getHtml(entries: WindowEntry[]): string {
    const tilesHtml = entries.map(entry => this.renderTile(entry)).join('');
    const count = entries.length;

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root {
    --mono: var(--vscode-editor-font-family, 'SF Mono', 'Fira Code', 'Cascadia Code', monospace);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: transparent;
    color: var(--vscode-foreground);
    padding: 6px 8px;
    -webkit-font-smoothing: antialiased;
  }

  /* ── header ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 4px 10px;
    opacity: 0.5;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .count {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 10px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 700;
  }

  /* ── tile card ── */
  .tile {
    position: relative;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid rgba(255,255,255,0.04);
    background: rgba(255,255,255,0.03);
  }
  .tile:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.08);
  }
  .tile:active { transform: scale(0.985); }

  /* ── current tile ── */
  .tile.current {
    background: rgba(255,255,255,0.07);
    border-color: color-mix(in srgb, var(--tile-color) 55%, transparent);
    box-shadow: inset 4px 0 0 var(--tile-color);
  }

  /* ── row 1: dot + name + status ── */
  .tile-row-1 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .tile-dot {
    width: 12px; height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--tile-color);
    box-shadow: 0 0 6px color-mix(in srgb, var(--tile-color) 50%, transparent);
  }
  .tile.current .tile-dot {
    width: 13px; height: 13px;
    box-shadow: 0 0 12px color-mix(in srgb, var(--tile-color) 70%, transparent);
  }
  .tile-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }
  .tile.current .tile-name {
    color: var(--tile-color);
  }
  .live-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--tile-color);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .live-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--tile-color);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.2; }
  }
  .tile-time {
    flex-shrink: 0;
    font-size: 11px;
    opacity: 0.45;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  /* ── info rows ── */
  .tile-info {
    padding-left: 22px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .info-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 12.5px;
    line-height: 1.45;
    min-width: 0;
    color: var(--vscode-foreground);
    opacity: 0.7;
  }
  .info-label {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.45;
    width: 48px;
  }
  .info-value {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }
  .info-value.mono {
    font-family: var(--mono);
    font-size: 12px;
  }
  .info-value.pr {
    color: var(--tile-color);
    font-weight: 600;
    opacity: 1;
  }

  /* ── clickable dot for color ── */
  .tile-dot {
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .tile-dot:hover {
    transform: scale(1.4);
    box-shadow: 0 0 14px color-mix(in srgb, var(--tile-color) 80%, transparent);
  }

  /* ── clickable name for editing ── */
  .tile-name {
    cursor: text;
    border-radius: 4px;
    padding: 1px 4px;
    margin: -1px -4px;
    transition: background 0.1s ease;
  }
  .tile-name:hover {
    background: rgba(255,255,255,0.06);
  }

  /* ── inline edit input ── */
  .tile-name-input {
    font-size: 15px;
    font-weight: 700;
    font-family: inherit;
    color: var(--tile-color);
    background: rgba(255,255,255,0.08);
    border: 1px solid color-mix(in srgb, var(--tile-color) 50%, transparent);
    border-radius: 5px;
    padding: 2px 6px;
    margin: -3px -6px;
    outline: none;
    width: calc(100% + 12px);
    box-sizing: border-box;
  }

  /* ── branch copy on click ── */
  .info-value.mono.copyable {
    cursor: pointer;
    border-radius: 3px;
    padding: 0 3px;
    margin: 0 -3px;
    transition: background 0.1s ease;
  }
  .info-value.mono.copyable:hover {
    background: rgba(255,255,255,0.08);
  }

  /* ── clickable PR ── */
  .info-value.clickable-pr {
    cursor: pointer;
    border-radius: 3px;
    padding: 0 3px;
    margin: 0 -3px;
    transition: background 0.1s ease;
  }
  .info-value.clickable-pr:hover {
    background: rgba(255,255,255,0.08);
  }

  /* ── empty state ── */
  .empty {
    text-align: center;
    padding: 40px 16px;
    opacity: 0.35;
    font-size: 13px;
    line-height: 1.7;
  }
</style>
</head>
<body>
  <div class="header">
    <span>Sessions</span>
    <span class="count">${count}</span>
  </div>
  ${tilesHtml || '<div class="empty">No active tiles yet.<br>Open a folder to get started.</div>'}
  <script>
    const vscode = acquireVsCodeApi();

    document.addEventListener('click', (e) => {
      const el = e.target;

      // Click dot → change color
      if (el.closest('[data-action="color"]')) {
        e.stopPropagation();
        const tile = el.closest('.tile');
        vscode.postMessage({ type: 'assignColor', windowId: tile.dataset.windowId });
        return;
      }

      // Click name → inline edit
      if (el.closest('[data-action="label"]') && !el.classList.contains('tile-name-input')) {
        e.stopPropagation();
        const nameEl = el.closest('[data-action="label"]');
        const tile = nameEl.closest('.tile');
        const current = nameEl.textContent;
        const input = document.createElement('input');
        input.className = 'tile-name-input';
        input.value = current;
        nameEl.replaceWith(input);
        input.focus();
        input.select();

        const commit = () => {
          const val = input.value.trim();
          if (val && val !== current) {
            vscode.postMessage({ type: 'setLabel', windowId: tile.dataset.windowId, label: val });
          }
          const span = document.createElement('div');
          span.className = 'tile-name';
          span.dataset.action = 'label';
          span.textContent = val || current;
          input.replaceWith(span);
        };

        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
          if (ev.key === 'Escape') { input.value = current; input.blur(); }
        });
        return;
      }

      // Click branch → copy
      if (el.closest('.copyable')) {
        e.stopPropagation();
        const tile = el.closest('.tile');
        vscode.postMessage({ type: 'copyBranch', branch: tile.dataset.branch });
        return;
      }

      // Click PR → open
      if (el.closest('.clickable-pr')) {
        e.stopPropagation();
        const tile = el.closest('.tile');
        vscode.postMessage({ type: 'openPr', windowId: tile.dataset.windowId });
        return;
      }

      // Click tile → switch window
      const tile = el.closest('.tile');
      if (tile && !tile.classList.contains('current')) {
        const d = tile.dataset.entry;
        if (d) vscode.postMessage({ type: 'switchWindow', entry: JSON.parse(d) });
      }
    });
  </script>
</body>
</html>`;
  }

  private renderTile(entry: WindowEntry): string {
    const isCurrent = entry.windowId === this.currentWindowId;
    const color = COLOR_MAP[entry.colorKey] || COLOR_MAP.blue;
    const entryJson = escapeAttr(JSON.stringify(entry));

    // Name: prefer user label, then branch, then workspace
    const name = entry.userLabel || entry.branch || entry.workspaceName;

    // Info rows — only show what we have, no duplicates, no truncation unless truly needed
    const rows: string[] = [];

    if (entry.branch) {
      rows.push(infoRow('branch', `<span class="info-value mono copyable">${esc(entry.branch)}</span>`));
    }
    if (entry.prTitle) {
      rows.push(infoRow('pr', `<span class="info-value pr clickable-pr">#${entry.prNumber} ${esc(entry.prTitle)}</span>`));
    }
    if (entry.remoteHost) {
      rows.push(infoRow('host', `<span class="info-value mono">${esc(entry.remoteHost)}</span>`));
    }
    if (entry.workspaceName && entry.workspaceName !== entry.branch) {
      rows.push(infoRow('folder', `<span class="info-value">${esc(entry.workspaceName)}</span>`));
    }

    // Live badge for current, relative time for others
    const timeBadge = isCurrent
      ? `<span class="live-badge"><span class="live-dot"></span>Active</span>`
      : `<span class="tile-time">${formatRelativeTime(entry.lastActivity)}</span>`;

    return `
      <div class="tile ${isCurrent ? 'current' : ''}"
           style="--tile-color: ${color}"
           data-window-id="${escapeAttr(entry.windowId)}"
           data-branch="${escapeAttr(entry.branch)}"
           data-entry="${entryJson}">
        <div class="tile-row-1">
          <div class="tile-dot" data-action="color"></div>
          <div class="tile-name" data-action="label">${esc(name)}</div>
          ${timeBadge}
        </div>
        ${rows.length ? `<div class="tile-info">${rows.join('')}</div>` : ''}
      </div>`;
  }
}

function infoRow(label: string, valueHtml: string): string {
  return `<div class="info-row"><span class="info-label">${label}</span>${valueHtml}</div>`;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
