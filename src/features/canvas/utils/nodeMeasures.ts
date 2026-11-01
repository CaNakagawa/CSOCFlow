import type { Size } from './mitreLayout'

/**
 * The size each card was last drawn at, reported by the canvas. It lives
 * outside the store on purpose: the layout only reads it when asked to pack
 * the cards, and nothing on screen has to redraw when a card is measured.
 */
export const measuredNodeSizes = new Map<string, Size>()
