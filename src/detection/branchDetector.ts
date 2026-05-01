import * as vscode from 'vscode';

export async function detectBranch(): Promise<string> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) return '';

  const gitHeadUri = vscode.Uri.joinPath(folders[0].uri, '.git', 'HEAD');
  try {
    const data = await vscode.workspace.fs.readFile(gitHeadUri);
    const content = Buffer.from(data).toString('utf8').trim();
    const match = content.match(/^ref: refs\/heads\/(.+)$/);
    return match ? match[1] : content.substring(0, 8);
  } catch {
    return '';
  }
}
