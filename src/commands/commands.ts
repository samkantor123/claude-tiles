import * as vscode from 'vscode';
import { ManifestManager } from '../manifest/manifestManager';
import { WindowTreeProvider } from '../tree/windowTreeProvider';
import { WindowTreeItem } from '../tree/windowTreeItem';
import { ColorManager } from '../colors/colorManager';
import { switchToWindow } from '../windowSwitcher/windowSwitcher';
import { WindowEntry } from '../types';

export function registerCommands(
  context: vscode.ExtensionContext,
  manifestManager: ManifestManager,
  treeProvider: WindowTreeProvider,
  colorManager: ColorManager,
  currentWindowId: string
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeTiles.switchWindow', (entry: WindowEntry) => {
      switchToWindow(entry);
    }),

    vscode.commands.registerCommand('claudeTiles.assignColor', async (item: WindowTreeItem) => {
      const entry = item?.entry;
      if (!entry) return;

      const color = await colorManager.pickColor();
      if (!color) return;

      await colorManager.setColor(entry.windowId, color);
      manifestManager.updateWindowFields(entry.windowId, { colorKey: color });
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('claudeTiles.setLabel', async (item: WindowTreeItem) => {
      const entry = item?.entry;
      if (!entry) return;

      const label = await vscode.window.showInputBox({
        prompt: 'Set a label for this window',
        value: entry.userLabel,
        placeHolder: 'e.g., "reviewing PRs", "hotfix for prod"',
      });
      if (label === undefined) return;

      manifestManager.updateWindowFields(entry.windowId, { userLabel: label });
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('claudeTiles.refresh', () => {
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('claudeTiles.copyBranch', async (item: WindowTreeItem) => {
      const branch = item?.entry?.branch;
      if (branch) {
        await vscode.env.clipboard.writeText(branch);
        vscode.window.showInformationMessage(`Copied: ${branch}`);
      }
    }),

    vscode.commands.registerCommand('claudeTiles.openPr', (item: WindowTreeItem) => {
      const entry = item?.entry;
      if (!entry?.prNumber) return;
      // Best effort — open GitHub PR in browser via gh CLI
      const { exec } = require('child_process');
      const cwd = entry.workspaceUri.startsWith('file://') ?
        entry.workspaceUri.replace('file://', '') : undefined;
      if (cwd) {
        exec(`gh pr view ${entry.prNumber} --web`, { cwd });
      }
    })
  );
}
