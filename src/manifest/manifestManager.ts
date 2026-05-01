import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Manifest, WindowEntry } from '../types';

const MANIFEST_FILENAME = 'claude-tiles-manifest.json';
const HEARTBEAT_INTERVAL_MS = 15_000;
const STALE_TTL_MS = 45_000;
const WATCH_DEBOUNCE_MS = 200;

export class ManifestManager {
  private manifestPath: string;
  private cachedManifest: Manifest = { version: 1, windows: {} };
  private watcher: fs.FSWatcher | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private disposed = false;
  private writing = false;

  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly storageDir: string) {
    this.manifestPath = path.join(storageDir, MANIFEST_FILENAME);
  }

  async initialize(): Promise<void> {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    this.cachedManifest = this.readFromDisk();
    this.startWatching();
    this.startHeartbeat();
  }

  getManifest(): Manifest {
    return this.cachedManifest;
  }

  getWindow(windowId: string): WindowEntry | undefined {
    return this.cachedManifest.windows[windowId];
  }

  /** Read-modify-write: always reads fresh from disk before writing */
  updateWindow(windowId: string, entry: WindowEntry): void {
    const manifest = this.readFromDisk();
    manifest.windows[windowId] = entry;
    this.writeToDisk(manifest);
    this.cachedManifest = manifest;
    this._onDidChange.fire();
  }

  /** Read-modify-write: always reads fresh from disk before writing */
  updateWindowFields(windowId: string, fields: Partial<WindowEntry>): void {
    const manifest = this.readFromDisk();
    const existing = manifest.windows[windowId];
    if (!existing) return;
    Object.assign(existing, fields);
    this.writeToDisk(manifest);
    this.cachedManifest = manifest;
    this._onDidChange.fire();
  }

  /** Read-modify-write: always reads fresh from disk before writing */
  removeWindow(windowId: string): void {
    const manifest = this.readFromDisk();
    delete manifest.windows[windowId];
    this.writeToDisk(manifest);
    this.cachedManifest = manifest;
    this._onDidChange.fire();
  }

  dispose(): void {
    this.disposed = true;
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this._onDidChange.dispose();
  }

  private readFromDisk(): Manifest {
    try {
      if (fs.existsSync(this.manifestPath)) {
        const raw = fs.readFileSync(this.manifestPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed?.version === 1 && parsed.windows) {
          return parsed;
        }
      }
    } catch {
      // Corrupted or mid-write — return last known good
    }
    return { version: 1, windows: { ...this.cachedManifest.windows } };
  }

  private writeToDisk(manifest: Manifest): void {
    try {
      this.writing = true;
      const tmpPath = this.manifestPath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.manifestPath);
    } catch (err) {
      console.error('Claude Tiles: failed to write manifest', err);
    } finally {
      // Small delay before allowing watch events to process our own write
      setTimeout(() => { this.writing = false; }, 50);
    }
  }

  private pruneStaleEntries(manifest: Manifest): boolean {
    const now = Date.now();
    let changed = false;
    for (const [id, entry] of Object.entries(manifest.windows)) {
      const heartbeatAge = now - new Date(entry.lastHeartbeat).getTime();
      if (heartbeatAge > STALE_TTL_MS && !this.isProcessAlive(entry.pid)) {
        delete manifest.windows[id];
        changed = true;
      }
    }
    return changed;
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private startWatching(): void {
    try {
      // Ensure file exists before watching
      if (!fs.existsSync(this.manifestPath)) {
        this.writeToDisk(this.cachedManifest);
      }
      this.watcher = fs.watch(this.manifestPath, () => {
        if (this.disposed || this.writing) return;
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          const manifest = this.readFromDisk();
          this.cachedManifest = manifest;
          this._onDidChange.fire();
        }, WATCH_DEBOUNCE_MS);
      });
    } catch {
      // Polling via heartbeat will cover this
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.disposed) return;
      // Re-read from disk, prune dead entries, update cache
      const manifest = this.readFromDisk();
      const pruned = this.pruneStaleEntries(manifest);
      if (pruned) {
        this.writeToDisk(manifest);
      }
      this.cachedManifest = manifest;
      this._onDidChange.fire();
    }, HEARTBEAT_INTERVAL_MS);
  }
}
