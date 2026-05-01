import * as vscode from 'vscode';
import { exec } from 'child_process';
import { ManifestManager } from '../manifest/manifestManager';
import { TilesWebviewProvider } from '../webview/tilesWebviewProvider';
import { ColorManager } from '../colors/colorManager';
import { switchToWindow } from '../windowSwitcher/windowSwitcher';
import { applyTitleBarColor } from '../titleBar/titleBarColorizer';
import { WindowEntry } from '../types';

export function registerCommands(
  context: vscode.ExtensionContext,
  manifestManager: ManifestManager,
  webviewProvider: TilesWebviewProvider,
  colorManager: ColorManager,
  currentWindowId?: string,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeTiles.switchWindow', (entry: WindowEntry) => {
      switchToWindow(entry);
    }),

    vscode.commands.registerCommand('claudeTiles.assignColorById', async (windowId: string) => {
      const entry = manifestManager.getWindow(windowId);
      if (!entry) return;

      const color = await colorManager.pickColor();
      if (!color) return;

      await colorManager.setColor(windowId, color);
      manifestManager.updateWindowFields(windowId, { colorKey: color });
      if (windowId === currentWindowId) {
        applyTitleBarColor(color);
      }
      webviewProvider.refresh();
    }),

    vscode.commands.registerCommand('claudeTiles.setLabelById', async (windowId: string) => {
      const entry = manifestManager.getWindow(windowId);
      if (!entry) return;

      const label = await vscode.window.showInputBox({
        prompt: 'Set a label for this tile',
        value: entry.userLabel,
        placeHolder: 'e.g., "reviewing PRs", "hotfix for prod"',
      });
      if (label === undefined) return;

      manifestManager.updateWindowFields(windowId, { userLabel: label });
      webviewProvider.refresh();
    }),

    vscode.commands.registerCommand('claudeTiles.refresh', () => {
      webviewProvider.refresh();
    }),

    vscode.commands.registerCommand('claudeTiles.openPrById', (windowId: string) => {
      const entry = manifestManager.getWindow(windowId);
      if (!entry?.prNumber) return;
      const cwd = entry.workspaceUri.startsWith('file://')
        ? entry.workspaceUri.replace('file://', '')
        : undefined;
      if (cwd) {
        exec(`gh pr view ${entry.prNumber} --web`, { cwd });
      }
    }),
  );
}
