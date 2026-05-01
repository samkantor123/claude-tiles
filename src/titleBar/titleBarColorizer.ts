import * as vscode from 'vscode';
import { ColorKey } from '../types';
import { COLOR_MAP } from '../webview/tilesWebviewProvider';

export async function applyTitleBarColor(colorKey: ColorKey): Promise<void> {
  const hex = COLOR_MAP[colorKey] || COLOR_MAP.blue;
  const config = vscode.workspace.getConfiguration('workbench');
  const existing = config.get<Record<string, string>>('colorCustomizations') || {};

  const updated = {
    ...existing,
    'titleBar.activeBackground': blendWithDark(hex, 0.65),
    'titleBar.activeForeground': '#ffffff',
    'titleBar.inactiveBackground': blendWithDark(hex, 0.3),
    'titleBar.inactiveForeground': '#bbbbbb',
    'titleBar.border': blendWithDark(hex, 0.8),
    'activityBar.background': blendWithDark(hex, 0.12),
    'statusBar.background': blendWithDark(hex, 0.4),
    'statusBar.foreground': '#ffffffdd',
  };

  await config.update('colorCustomizations', updated, vscode.ConfigurationTarget.Workspace);
}

export async function applyWindowTitle(branch: string, remoteHost: string | null): Promise<void> {
  const config = vscode.workspace.getConfiguration('window');

  // e.g.  "investigate_survey_flow  ·  dev2422"
  // or    "main  ·  my-project"
  const parts: string[] = [];

  if (branch) {
    parts.push(branch);
  }

  parts.push('${rootName}');

  await config.update('title', parts.join('  ·  '), vscode.ConfigurationTarget.Workspace);
}

function blendWithDark(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const bg = 0x1e;
  const blend = (c: number) => Math.round(c * alpha + bg * (1 - alpha));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(blend(r))}${toHex(blend(g))}${toHex(blend(b))}`;
}
