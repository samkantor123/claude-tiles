import * as vscode from 'vscode';

export function detectRemoteHost(): string | null {
  if (!vscode.env.remoteName) return null;

  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return vscode.env.remoteName;

  const uri = folder.uri.toString();
  const match = uri.match(/ssh-remote[%+]2[Bb]([^/]+)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  return vscode.env.remoteName;
}
