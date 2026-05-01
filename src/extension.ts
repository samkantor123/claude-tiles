import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { ManifestManager } from './manifest/manifestManager';
import { detectBranch } from './detection/branchDetector';
import { detectRemoteHost } from './detection/remoteHostDetector';
import { detectPr } from './detection/prDetector';
import { TilesWebviewProvider } from './webview/tilesWebviewProvider';
import { ColorManager } from './colors/colorManager';
import { StatusBarManager } from './statusbar/statusBarManager';
import { registerCommands } from './commands/commands';
import { applyTitleBarColor, applyWindowTitle } from './titleBar/titleBarColorizer';
import { WindowEntry } from './types';

let manifestManager: ManifestManager;
let currentWindowId: string;

const ACTIVITY_THROTTLE_MS = 10_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const DETECTION_REFRESH_MS = 60_000;

export async function activate(context: vscode.ExtensionContext) {
  currentWindowId = context.workspaceState.get<string>('claudeTiles.windowId') ?? '';
  if (!currentWindowId) {
    currentWindowId = crypto.randomUUID();
    await context.workspaceState.update('claudeTiles.windowId', currentWindowId);
  }

  const storageDir = context.globalStorageUri.fsPath;
  manifestManager = new ManifestManager(storageDir);
  await manifestManager.initialize();
  context.subscriptions.push({ dispose: () => manifestManager.dispose() });

  const colorManager = new ColorManager(context.globalState);
  const assignedColor = colorManager.autoAssign(currentWindowId, manifestManager.getManifest());

  const [branch, prInfo] = await Promise.all([detectBranch(), detectPr()]);
  const remoteHost = detectRemoteHost();
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const now = new Date().toISOString();

  const entry: WindowEntry = {
    windowId: currentWindowId,
    pid: process.pid,
    workspaceUri: workspaceFolder?.uri.toString() ?? '',
    workspaceName: workspaceFolder?.name ?? 'Untitled',
    branch,
    remoteHost,
    prTitle: prInfo?.title ?? null,
    prNumber: prInfo?.number ?? null,
    lastActivity: now,
    lastHeartbeat: now,
    colorKey: assignedColor,
    userLabel: manifestManager.getWindow(currentWindowId)?.userLabel ?? '',
  };

  manifestManager.updateWindow(currentWindowId, entry);

  // Color the title bar and set a clear window title
  applyTitleBarColor(assignedColor);
  applyWindowTitle(branch, remoteHost);

  // Webview sidebar
  const webviewProvider = new TilesWebviewProvider(
    context.extensionUri,
    manifestManager,
    currentWindowId,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('claudeTiles.windowList', webviewProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // Status bar
  const statusBar = new StatusBarManager();
  statusBar.update(entry);
  context.subscriptions.push(statusBar);

  // Commands
  registerCommands(context, manifestManager, webviewProvider, colorManager, currentWindowId);

  // Activity tracking
  let lastActivityWrite = 0;
  function trackActivity() {
    const now = Date.now();
    if (now - lastActivityWrite < ACTIVITY_THROTTLE_MS) return;
    lastActivityWrite = now;
    manifestManager.updateWindowFields(currentWindowId, {
      lastActivity: new Date().toISOString(),
    });
  }

  context.subscriptions.push(
    vscode.window.onDidChangeWindowState(e => { if (e.focused) trackActivity(); }),
    vscode.workspace.onDidChangeTextDocument(() => trackActivity()),
    vscode.workspace.onDidSaveTextDocument(() => trackActivity()),
  );

  // Heartbeat
  const heartbeatTimer = setInterval(() => {
    manifestManager.updateWindowFields(currentWindowId, {
      lastHeartbeat: new Date().toISOString(),
    });
  }, HEARTBEAT_INTERVAL_MS);
  context.subscriptions.push({ dispose: () => clearInterval(heartbeatTimer) });

  // Periodic re-detection
  const detectionTimer = setInterval(async () => {
    const [newBranch, newPr] = await Promise.all([detectBranch(), detectPr()]);
    const fields: Partial<WindowEntry> = {};
    if (newBranch !== entry.branch) {
      entry.branch = newBranch;
      fields.branch = newBranch;
    }
    if (newPr?.number !== entry.prNumber) {
      entry.prTitle = newPr?.title ?? null;
      entry.prNumber = newPr?.number ?? null;
      fields.prTitle = entry.prTitle;
      fields.prNumber = entry.prNumber;
    }
    if (Object.keys(fields).length > 0) {
      manifestManager.updateWindowFields(currentWindowId, fields);
      statusBar.update(entry);
      if (fields.branch !== undefined) {
        applyWindowTitle(entry.branch, entry.remoteHost);
      }
    }
  }, DETECTION_REFRESH_MS);
  context.subscriptions.push({ dispose: () => clearInterval(detectionTimer) });

  manifestManager.onDidChange(() => {
    const updated = manifestManager.getWindow(currentWindowId);
    if (updated) {
      Object.assign(entry, updated);
      statusBar.update(entry);
    }
  });
}

export function deactivate() {
  if (manifestManager && currentWindowId) {
    manifestManager.removeWindow(currentWindowId);
  }
}
