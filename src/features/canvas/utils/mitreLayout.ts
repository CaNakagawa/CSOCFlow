import type { InvestigationNode } from '../../../shared/types/investigation'
import type { MitreTactic, MitreTechnique } from '../../../shared/types/knowledge'

export const COLUMN_WIDTH = 240
export const TACTIC_ROW_Y = 0
export const TECHNIQUE_START_Y = 150
export const ROW_HEIGHT = 110
/** Gap between the bottom of the matrix and everything that is not part of it. */
export const OTHER_ROW_GAP = 120
export const OTHER_COLUMNS = 4

export interface Position {
  x: number
  y: number
}

function isTechniqueNode(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
}

/**
 * Arranges the canvas like the ATT&CK matrix: tactics as a horizontal header row
 * in matrix order, and each technique stacked in the column of the earliest
 * tactic it belongs to.
 *
 * A technique that spans several tactics is placed once — duplicating it would
 * imply two separate findings — and the caller links it to all of them.
 *
 * Nodes that are neither tactics nor techniques (evidence, alerts, notes) are
 * parked in a grid underneath so the matrix never lands on top of them. Their
 * relative order is preserved.
 */
export function layoutLikeMitre(
  nodes: InvestigationNode[],
  tactics: MitreTactic[],
  techniques: MitreTechnique[],
): Map<string, Position> {
  const positions = new Map<string, Position>()
  const columnOf = new Map(tactics.map((tactic, index) => [tactic.id, index]))
  const techniquesById = new Map(techniques.map((t) => [t.id, t]))

  for (const [tacticId, column] of columnOf) {
    const node = nodes.find((n) => n.type === 'mitre_tactic' && n.definitionId === tacticId)
    if (node) positions.set(node.id, { x: column * COLUMN_WIDTH, y: TACTIC_ROW_Y })
  }

  // Techniques whose tactic is unknown to the knowledge base get their own
  // column past the matrix rather than being dropped on top of it.
  const overflowColumn = tactics.length
  const nextRowInColumn = new Map<number, number>()

  for (const node of nodes.filter(isTechniqueNode)) {
    const definition = techniquesById.get(node.definitionId)
    const firstKnownTactic = definition?.tactics.find((id) => columnOf.has(id))
    const column = firstKnownTactic
      ? (columnOf.get(firstKnownTactic) ?? overflowColumn)
      : overflowColumn

    const row = nextRowInColumn.get(column) ?? 0
    nextRowInColumn.set(column, row + 1)
    positions.set(node.id, {
      x: column * COLUMN_WIDTH,
      y: TECHNIQUE_START_Y + row * ROW_HEIGHT,
    })
  }

  const deepestRow = Math.max(0, ...nextRowInColumn.values())
  const otherY = TECHNIQUE_START_Y + deepestRow * ROW_HEIGHT + OTHER_ROW_GAP

  const others = nodes.filter((n) => n.type !== 'mitre_tactic' && !isTechniqueNode(n))
  others.forEach((node, index) => {
    positions.set(node.id, {
      x: (index % OTHER_COLUMNS) * COLUMN_WIDTH,
      y: otherY + Math.floor(index / OTHER_COLUMNS) * ROW_HEIGHT,
    })
  })

  return positions
}
