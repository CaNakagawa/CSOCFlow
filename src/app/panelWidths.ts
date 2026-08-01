/** Side panel widths the analyst dragged, remembered between sessions. */

export const LIBRARY_WIDTH = { default: 260, min: 180, max: 560 }
export const RIGHT_PANEL_WIDTH = { default: 320, min: 240, max: 640 }

const STORAGE_KEY = 'csocflow.panelWidths'

interface PanelWidths {
  library: number
  rightPanel: number
}

export function getStoredPanelWidths(): PanelWidths {
  const fallback = { library: LIBRARY_WIDTH.default, rightPanel: RIGHT_PANEL_WIDTH.default }
  if (typeof window === 'undefined') return fallback

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return fallback
    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return fallback
    const { library, rightPanel } = parsed as Partial<PanelWidths>
    return {
      library: clamp(library, LIBRARY_WIDTH),
      rightPanel: clamp(rightPanel, RIGHT_PANEL_WIDTH),
    }
  } catch {
    // A corrupt entry is not worth failing a session over.
    return fallback
  }
}

export function storePanelWidths(widths: PanelWidths): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widths))
  } catch {
    // Private browsing and full quotas both land here; the width just resets.
  }
}

function clamp(value: unknown, bounds: { default: number; min: number; max: number }): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return bounds.default
  return Math.min(bounds.max, Math.max(bounds.min, value))
}
