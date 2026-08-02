import type { CSSProperties } from 'react'

/**
 * Inline styling for the text on a connection.
 *
 * It has to be inline rather than in a stylesheet: exporting the canvas copies
 * the DOM without the stylesheet that styles the inside of an `<svg>`, so a
 * label dressed by a CSS class comes out in the SVG default — black text on the
 * dark canvas. Everything the label needs therefore travels on the element.
 *
 * For the same reason the label carries a halo instead of the backing box React
 * Flow draws by default: that box is sized from the text as measured on screen,
 * and an export that renders the text even slightly differently leaves the box
 * covering half the words.
 */
export function buildEdgeLabelStyle(readToken: (name: string) => string): CSSProperties {
  return {
    fill: readToken('--fg') || '#e2e8f0',
    stroke: readToken('--bg') || '#0b1220',
    strokeWidth: 3,
    strokeLinejoin: 'round',
    paintOrder: 'stroke',
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
    fontSize: 10,
    fontWeight: 500,
  }
}

/** Reads a design token off the document, for the real page. */
export function readCssToken(name: string): string {
  if (typeof window === 'undefined') return ''
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
