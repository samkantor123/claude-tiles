import * as vscode from 'vscode';
import { ManifestManager } from '../manifest/manifestManager';
import { WindowTreeItem } from './windowTreeItem';

export class WindowTreeProvider implements vscode.TreeDataProvider<WindowTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<WindowTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private readonly manifestManager: ManifestManager,
    private readonly currentWindowId: string
  ) {
    manifestManager.onDidChange(() => this._onDidChangeTreeData.fire(undefined));
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: WindowTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): WindowTreeItem[] {
    const manifest = this.manifestManager.getManifest();
    const entries = Object.values(manifest.windows);

    return entries
      .sort((a, b) => {
        // Current window first, then by last activity descending
        const aIsCurrent = a.windowId === this.currentWindowId ? 0 : 1;
        const bIsCurrent = b.windowId === this.currentWindowId ? 0 : 1;
        if (aIsCurrent !== bIsCurrent) return aIsCurrent - bIsCurrent;
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      })
      .map(entry => new WindowTreeItem(entry, entry.windowId === this.currentWindowId));
  }
}
