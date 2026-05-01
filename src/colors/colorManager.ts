import * as vscode from 'vscode';
import { COLOR_KEYS, ColorKey, Manifest } from '../types';

const MANUAL_OVERRIDES_KEY = 'claudeTiles.manualColors';

export class ColorManager {
  // Only stores colors the user explicitly picked via the color picker
  private manualOverrides: Record<string, ColorKey> = {};

  constructor(private readonly globalState: vscode.Memento) {
    const saved = globalState.get<Record<string, ColorKey>>(MANUAL_OVERRIDES_KEY, {});
    for (const [id, color] of Object.entries(saved)) {
      if ((COLOR_KEYS as readonly string[]).includes(color)) {
        this.manualOverrides[id] = color;
      }
    }
  }

  async setColor(windowId: string, color: ColorKey): Promise<void> {
    this.manualOverrides[windowId] = color;
    await this.globalState.update(MANUAL_OVERRIDES_KEY, this.manualOverrides);
  }

  autoAssign(windowId: string, manifest: Manifest): ColorKey {
    // Only respect colors the user manually chose
    const manual = this.manualOverrides[windowId];
    if (manual) return manual;

    // Collect colors in use by other live windows
    const usedColors = new Set(
      Object.values(manifest.windows)
        .filter(w => w.windowId !== windowId)
        .map(w => w.colorKey)
    );

    // Pick the first unused color
    const available = COLOR_KEYS.find(c => !usedColors.has(c));
    return available ?? COLOR_KEYS[Object.keys(manifest.windows).length % COLOR_KEYS.length];
  }

  async pickColor(): Promise<ColorKey | undefined> {
    const items = COLOR_KEYS.map(key => ({
      label: `$(circle-filled) ${key}`,
      colorKey: key,
    }));

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: 'Choose a color for this tile',
    });

    return picked?.colorKey;
  }
}
