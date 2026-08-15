import type { TranslationKey } from '../../../shared/i18n'

/**
 * The colours an analyst can put on an element by hand.
 *
 * Deliberately few and far apart: the point is telling a dozen elements apart
 * across a crowded canvas, which near neighbours on the colour wheel cannot do.
 */
export const NODE_PALETTE: { value: string; labelKey: TranslationKey }[] = [
  { value: '#ef4444', labelKey: 'colour.red' },
  { value: '#f97316', labelKey: 'colour.orange' },
  { value: '#facc15', labelKey: 'colour.yellow' },
  { value: '#22c55e', labelKey: 'colour.green' },
  { value: '#14b8a6', labelKey: 'colour.teal' },
  { value: '#3b82f6', labelKey: 'colour.blue' },
  { value: '#a855f7', labelKey: 'colour.purple' },
  { value: '#94a3b8', labelKey: 'colour.grey' },
]

/**
 * The style a hand-picked colour puts on an element: a strong edge and a wash
 * faint enough to keep the text readable in either theme.
 */
export function nodeColorStyle(color: string | undefined): {
  borderColor?: string
  background?: string
} {
  if (!color) return {}
  return {
    borderColor: color,
    background: `color-mix(in srgb, ${color} 14%, var(--node-bg))`,
  }
}
