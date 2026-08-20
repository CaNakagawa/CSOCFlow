const STORAGE_KEY = 'csocflow.pen'

/** Thicknesses offered for the pen, in canvas units. */
export const STROKE_WIDTHS = [1, 3, 6, 10] as const

export interface PenSettings {
  color: string
  width: number
}

export const DEFAULT_PEN: PenSettings = { color: '#f59e0b', width: 3 }

/** The pen the analyst last drew with, so it survives a reload. */
export function getStoredPen(): PenSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PEN
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PEN
    const { color, width } = parsed as Partial<PenSettings>
    return {
      color: typeof color === 'string' ? color : DEFAULT_PEN.color,
      width: typeof width === 'number' ? width : DEFAULT_PEN.width,
    }
  } catch {
    return DEFAULT_PEN
  }
}

export function storePen(pen: PenSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pen))
  } catch {
    // A browser refusing storage is not a reason to stop drawing.
  }
}
