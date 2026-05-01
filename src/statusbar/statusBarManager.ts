import * as vscode from 'vscode';
import { WindowEntry } from '../types';

export class StatusBarManager {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'contextManager.refresh';
  }

  update(entry: WindowEntry): void {
    const label = entry.userLabel || entry.branch || entry.workspaceName;
    this.item.text = `$(circle-filled) ${label}`;
    this.item.color = new vscode.ThemeColor(`contextManager.${entry.colorKey}`);

    const tooltipParts = [`Context Manager: ${label}`];
    if (entry.branch) tooltipParts.push(`Branch: ${entry.branch}`);
    if (entry.prTitle) tooltipParts.push(`PR #${entry.prNumber}: ${entry.prTitle}`);
    if (entry.remoteHost) tooltipParts.push(`Host: ${entry.remoteHost}`);
    this.item.tooltip = tooltipParts.join('\n');

    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
