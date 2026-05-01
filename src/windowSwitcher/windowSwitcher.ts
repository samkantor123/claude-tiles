import { exec } from 'child_process';
import { WindowEntry } from '../types';

export function switchToWindow(entry: WindowEntry): void {
  const searchTerms = [entry.workspaceName];
  if (entry.remoteHost) searchTerms.push(entry.remoteHost);

  raiseWindowByTitle(searchTerms);
}

function raiseWindowByTitle(searchTerms: string[]): void {
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
    set currentPos to position of window 1
    set currentSize to size of window 1
    repeat with w in windows
      if ${conditions} then
        set position of w to currentPos
        set size of w to currentSize
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
      exec('open -a "Visual Studio Code"');
    }
  });
}

function escapeForShell(script: string): string {
  return "'" + script.replace(/'/g, "'\\''") + "'";
}
