import { exec } from 'child_process';
import { WindowEntry } from '../types';

export function switchToWindow(entry: WindowEntry): void {
  // Use AppleScript to find and raise the window by matching its title
  // VS Code window titles contain the workspace folder name
  const searchTerms = [entry.workspaceName];
  if (entry.remoteHost) searchTerms.push(entry.remoteHost);

  raiseWindowByTitle(searchTerms);
}

function raiseWindowByTitle(searchTerms: string[]): void {
  // Build AppleScript conditions — window title must contain all search terms
  const conditions = searchTerms
    .map(term => {
      const escaped = term.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `name of w contains "${escaped}"`;
    })
    .join(' and ');

  const script = `
tell application "Visual Studio Code"
  activate
end tell
delay 0.1
tell application "System Events"
  tell process "Code"
    set frontmost to true
    repeat with w in windows
      if ${conditions} then
        perform action "AXRaise" of w
        return "switched"
      end if
    end repeat
  end tell
end tell
return "not found"
`;

  exec(`osascript -e ${escapeForShell(script)}`, (err, stdout) => {
    if (err || stdout.trim() === 'not found') {
      // Last resort: just activate VS Code (brings some window forward)
      exec('open -a "Visual Studio Code"');
    }
  });
}

function escapeForShell(script: string): string {
  return "'" + script.replace(/'/g, "'\\''") + "'";
}
