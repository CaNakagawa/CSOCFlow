/** Turns the points of a freehand stroke into an SVG path. */
export function strokePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  // A single tap still has to leave a dot, hence the zero-length segment.
  if (rest.length === 0) return `M ${first.x} ${first.y} L ${first.x} ${first.y}`
  return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(' ')
}
