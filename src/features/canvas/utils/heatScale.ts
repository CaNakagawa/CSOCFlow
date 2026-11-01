/**
 * The colour scale an ATT&CK Navigator layer paints its scored cells with.
 *
 * The Navigator never writes those colours into the file: it writes the score
 * and the gradient, and works the colour out when it draws. A layer built
 * from scores therefore arrives with every colour blank, so this does the
 * same arithmetic: the colours sit evenly across the range from `min` to
 * `max`, and a score lands between its two neighbours, mixed channel by
 * channel.
 */
export interface HeatScale {
  /** Two or more colours, as #rrggbb, lowest score first. */
  colors: string[]
  min: number
  max: number
}

/** What the Navigator itself starts a new layer with. */
export const DEFAULT_HEAT_COLORS = ['#ff6666', '#ffe766', '#8ec843']

type Rgb = [number, number, number]

/** Reads #rgb, #rrggbb or #rrggbbaa; the Navigator writes the last, and the alpha means nothing here. */
function parseHex(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, '')
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex.length === 6 || hex.length === 8
        ? hex.slice(0, 6)
        : null
  if (!full || !/^[0-9a-fA-F]{6}$/.test(full)) return null
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

/** A scale from what a layer's `gradient` block says, or null when it cannot be used. */
export function parseHeatScale(gradient: unknown): HeatScale | null {
  if (typeof gradient !== 'object' || gradient === null) return null
  const { colors, minValue, maxValue } = gradient as {
    colors?: unknown
    minValue?: unknown
    maxValue?: unknown
  }
  if (!Array.isArray(colors) || typeof minValue !== 'number' || typeof maxValue !== 'number') {
    return null
  }
  const parsed = colors
    .filter((c): c is string => typeof c === 'string')
    .map((c) => parseHex(c))
    .filter((c): c is Rgb => c !== null)
  if (parsed.length < 2 || maxValue < minValue) return null
  return { colors: parsed.map(toHex), min: minValue, max: maxValue }
}

/** The colour of a score on the scale, as #rrggbb. */
export function heatColor(score: number, scale: HeatScale): string {
  const grey: Rgb = [128, 128, 128]
  const stops = scale.colors.map((c) => parseHex(c) ?? grey)
  const span = scale.max - scale.min
  // One score and nothing to compare it with: the strongest colour says "present".
  if (span <= 0) return toHex(stops[stops.length - 1])
  const position = Math.min(1, Math.max(0, (score - scale.min) / span)) * (stops.length - 1)
  const lower = Math.min(stops.length - 2, Math.floor(position))
  const mix = position - lower
  const a = stops[lower]
  const b = stops[lower + 1]
  return toHex([a[0] + (b[0] - a[0]) * mix, a[1] + (b[1] - a[1]) * mix, a[2] + (b[2] - a[2]) * mix])
}

/** A CSS gradient for the legend bar. */
export function heatGradientCss(scale: HeatScale): string {
  return `linear-gradient(to right, ${scale.colors.join(', ')})`
}
