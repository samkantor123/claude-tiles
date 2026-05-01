import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { ManifestManager } from './manifest/manifestManager';
import { detectBranch } from './detection/branchDetector';
import { detectRemoteHost } from './detection/remoteHostDetector';
import { detectPr } from './detection/prDetector';
import { WindowTreeProvider } from './tree/windowTreeProvider';
import { ColorManager } from './colors/colorManager';
import { StatusBarManager } from './statusbar/statusBarManager';
import { registerCommands } from './commands/commands';
import { WindowEntry } from './types';

let manifestManager: ManifestManager;
let currentWindowId: string;

const ACTIVITY_THROTTLE_MS = 10_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const DETECTION_REFRESH_MS = 60_000;

export async function activate(context: vscode.ExtensionContext) {
  // Generate or retrieve a stable window ID for this workspace
  currentWindowId = context.workspaceState.get<string>('contextManager.windowId') ?? '';
  if (!currentWindowId) {
    currentWindowId = crypto.randomUUID();
    await context.workspaceState.update('contextManager.windowId', currentWindowId);
  }

  // Initialize manifest manager with globalStorage path
  const storageDir = context.globalStorageUri.fsPath;
  manifestManager = new ManifestManager(storageDir);
  await manifestManager.initialize();
  context.subscriptions.push({ dispose: () => manifestManager.dispose() });

  // Color manager
  const colorManager = new ColorManager(context.globalState);
  const assignedColor = colorManager.autoAssign(currentWindowId, manifestManager.getManifest());

  // Detect initial context
  const [branch, prInfo] = await Promise.all([detectBranch(), detectPr()]);
  const remoteHost = detectRemoteHost();
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const now = new Date().toISOString();

  const entry: WindowEntry = {
    windowId: currentWindowId,
    pid: process.pid,
    workspaceUri: workspaceFolder?.uri.toString() ?? '',
    workspaceName: workspaceFolder?.name ?? 'Untitled',
    branch: branch,
    remoteHost: remoteHost,
    prTitle: prInfo?.title ?? null,
    prNumber: prInfo?.number ?? null,
    lastActivity: now,
    lastHeartbeat: now,
    colorKey: assignedColor,
    userLabel: manifestManager.getWindow(currentWindowId)?.userLabel ?? '',
  };

  manifestManager.updateWindow(currentWindowId, entry);

  // TreeView
  const treeProvider = new WindowTreeProvider(manifestManager, currentWindowId);
  const treeView = vscode.window.createTreeView('contextManager.windowList', {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });
  context.subscriptions.push(treeView);

  // Update badge count
  function updateBadge() {
    const count = Object.keys(manifestManager.getManifest().windows).length;
    treeView.badge = count > 1 ? { value: count, tooltip: `${count} active windows` } : undefined;
  }
  manifestManager.onDidChange(updateBadge);
  updateBadge();

  // Status bar
  const statusBar = new StatusBarManager();
  statusBar.update(entry);
  context.subscriptions.push(statusBar);

  // Register commands
  registerCommands(context, manifestManager, treeProvider, colorManager, currentWindowId);

  // Activity tracking — throttled
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
    vscode.window.onDidChangeWindowState(e => {
      if (e.focused) trackActivity();
    }),
    vscode.workspace.onDidChangeTextDocument(() => trackActivity()),
    vscode.workspace.onDidSaveTextDocument(() => trackActivity()),
  );

  // Heartbeat — keep this window alive in the manifest
  const heartbeatTimer = setInterval(() => {
    manifestManager.updateWindowFields(currentWindowId, {
      lastHeartbeat: new Date().toISOString(),
    });
  }, HEARTBEAT_INTERVAL_MS);
  context.subscriptions.push({ dispose: () => clearInterval(heartbeatTimer) });

  // Periodic re-detection of branch/PR (handles checkouts, new PRs)
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
    }
  }, DETECTION_REFRESH_MS);
  context.subscriptions.push({ dispose: () => clearInterval(detectionTimer) });

  // Update status bar when manifest changes (e.g., color changed from another window)
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
