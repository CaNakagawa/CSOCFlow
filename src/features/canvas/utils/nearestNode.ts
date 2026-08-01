import type { InvestigationNode } from '../../../shared/types/investigation'
import type { HandleId } from '../../../shared/types/handles'

/** The handle a connection should land on when arriving from a given side. */
export const OPPOSITE_HANDLE: Record<HandleId, HandleId> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

interface Delta {
  along: number
  across: number
}

/** Distance along the handle's axis, and sideways drift from it. */
function deltaFor(handle: HandleId, dx: number, dy: number): Delta {
  switch (handle) {
    case 'right':
      return { along: dx, across: Math.abs(dy) }
    case 'left':
      return { along: -dx, across: Math.abs(dy) }
    case 'bottom':
      return { along: dy, across: Math.abs(dx) }
    case 'top':
      return { along: -dy, across: Math.abs(dx) }
  }
}

/**
 * Finds the node a connection point should reach for, given the side it sits on.
 *
 * Candidates must lie on that side at all (`along > 0`). Those inside a 45°
 * cone win first, so double-clicking the right handle prefers something
 * genuinely to the right over something far up and slightly right. Only if the
 * cone is empty does it fall back to the whole half-plane, so the gesture still
 * does something rather than silently failing.
 */
export function findNearestNodeInDirection(
  nodes: InvestigationNode[],
  fromNodeId: string,
  handle: HandleId,
): InvestigationNode | null {
  const origin = nodes.find((n) => n.id === fromNodeId)
  if (!origin) return null

  const inCone: { node: InvestigationNode; distance: number }[] = []
  const inHalfPlane: { node: InvestigationNode; distance: number }[] = []

  for (const node of nodes) {
    if (node.id === fromNodeId) continue

    const dx = node.position.x - origin.position.x
    const dy = node.position.y - origin.position.y
    const { along, across } = deltaFor(handle, dx, dy)
    if (along <= 0) continue

    const candidate = { node, distance: Math.hypot(dx, dy) }
    inHalfPlane.push(candidate)
    if (along >= across) inCone.push(candidate)
  }

  const pool = inCone.length > 0 ? inCone : inHalfPlane
  if (pool.length === 0) return null

  return pool.reduce((best, current) => (current.distance < best.distance ? current : best)).node
}
