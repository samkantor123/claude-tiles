import * as vscode from 'vscode';
import { WindowEntry } from '../types';

export class WindowTreeItem extends vscode.TreeItem {
  constructor(
    public readonly entry: WindowEntry,
    public readonly isCurrent: boolean
  ) {
    const label = entry.userLabel || entry.branch || entry.workspaceName;
    super(label, vscode.TreeItemCollapsibleState.None);

    const descParts: string[] = [];
    if (entry.prTitle) {
      descParts.push(`PR #${entry.prNumber}`);
    }
    if (entry.remoteHost) {
      descParts.push(entry.remoteHost);
    }
    descParts.push(formatRelativeTime(entry.lastActivity));
    this.description = descParts.join(' · ');

    this.tooltip = this.buildTooltip();

    this.iconPath = new vscode.ThemeIcon(
      'circle-filled',
      new vscode.ThemeColor(`claudeTiles.${entry.colorKey}`)
    );

    if (!isCurrent) {
      this.command = {
        command: 'claudeTiles.switchWindow',
        title: 'Switch to Window',
        arguments: [entry],
      };
    }

    const ctxParts = [isCurrent ? 'currentWindow' : 'otherWindow'];
    if (entry.prNumber) ctxParts.push('hasPr');
    this.contextValue = ctxParts.join(',');
  }

  private buildTooltip(): vscode.MarkdownString {
    const lines: string[] = [];
    const label = this.entry.userLabel || this.entry.branch || this.entry.workspaceName;
    lines.push(`**${label}**`);
    if (this.entry.branch) lines.push(`Branch: \`${this.entry.branch}\``);
    if (this.entry.prTitle) lines.push(`PR: ${this.entry.prTitle} (#${this.entry.prNumber})`);
    lines.push(`Workspace: ${this.entry.workspaceName}`);
    if (this.entry.remoteHost) lines.push(`Host: ${this.entry.remoteHost}`);
    lines.push(`Last active: ${new Date(this.entry.lastActivity).toLocaleTimeString()}`);
    if (this.isCurrent) lines.push(`*(current window)*`);
    return new vscode.MarkdownString(lines.join('\n\n'));
  }
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
