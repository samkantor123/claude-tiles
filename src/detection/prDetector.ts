import * as vscode from 'vscode';
import { exec } from 'child_process';

export interface PrInfo {
  title: string;
  number: number;
}

export function detectPr(): Promise<PrInfo | null> {
  return new Promise((resolve) => {
    // PR detection only works for local workspaces where we can run `gh`
    if (vscode.env.remoteName) {
      resolve(null);
      return;
    }

    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!cwd) {
      resolve(null);
      return;
    }

    exec(
      'gh pr view --json title,number 2>/dev/null',
      { cwd, timeout: 5000 },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        try {
          const data = JSON.parse(stdout);
          resolve({ title: data.title, number: data.number });
        } catch {
          resolve(null);
        }
      }
    );
  });
}
