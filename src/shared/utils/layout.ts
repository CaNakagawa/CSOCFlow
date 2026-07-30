export function nextGridPosition(nodeCount: number): { x: number; y: number } {
  const column = nodeCount % 5
  const row = Math.floor(nodeCount / 5)
  return { x: 80 + column * 200, y: 80 + row * 140 }
}
