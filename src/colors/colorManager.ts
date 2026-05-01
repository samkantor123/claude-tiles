import * as vscode from 'vscode';
import { COLOR_KEYS, ColorKey, Manifest } from '../types';

const GLOBAL_STATE_KEY = 'claudeTiles.colorOverrides';

export class ColorManager {
  private overrides: Record<string, ColorKey> = {};

  constructor(private readonly globalState: vscode.Memento) {
    this.overrides = globalState.get<Record<string, ColorKey>>(GLOBAL_STATE_KEY, {});
  }

  getColor(windowId: string): ColorKey | undefined {
    return this.overrides[windowId];
  }

  async setColor(windowId: string, color: ColorKey): Promise<void> {
    this.overrides[windowId] = color;
    await this.globalState.update(GLOBAL_STATE_KEY, this.overrides);
  }

  autoAssign(windowId: string, manifest: Manifest): ColorKey {
    const existing = this.overrides[windowId];
    if (existing) return existing;

    const usedColors = new Set(
      Object.values(manifest.windows)
        .filter(w => w.windowId !== windowId)
        .map(w => w.colorKey)
    );

    const available = COLOR_KEYS.find(c => !usedColors.has(c));
    const color = available ?? COLOR_KEYS[Object.keys(manifest.windows).length % COLOR_KEYS.length];

    this.overrides[windowId] = color;
    this.globalState.update(GLOBAL_STATE_KEY, this.overrides);
    return color;
  }

  async pickColor(): Promise<ColorKey | undefined> {
    const items = COLOR_KEYS.map(key => ({
      label: `$(circle-filled) ${key}`,
      colorKey: key,
    }));

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: 'Choose a color for this window',
    });

    return picked?.colorKey;
  }
}
