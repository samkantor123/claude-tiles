export const COLOR_KEYS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink'] as const;
export type ColorKey = typeof COLOR_KEYS[number];

export interface WindowEntry {
  windowId: string;
  pid: number;
  workspaceUri: string;
  workspaceName: string;
  branch: string;
  remoteHost: string | null;
  prTitle: string | null;
  prNumber: number | null;
  lastActivity: string;
  lastHeartbeat: string;
  colorKey: ColorKey;
  userLabel: string;
}

export interface Manifest {
  version: 1;
  windows: Record<string, WindowEntry>;
}
