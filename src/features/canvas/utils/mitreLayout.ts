import type { InvestigationNode } from '../../../shared/types/investigation'
import type { MitreTactic, MitreTechnique } from '../../../shared/types/knowledge'
import { parentTechniqueId } from '../../correlation/engine/buildSubtechniqueEdges'
import { sortByScoreView, type ScoreDirection, type ScoreOrder } from './scoreView'

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

export interface Size {
  width: number
  height: number
}

/** How close together the cards are packed. `normal` is the matrix grid; the others follow real card sizes. */
export type Spacing = 'normal' | 'compact' | 'tight' | 'exploded'

/** Space left between neighbouring cards for each packed spacing. */
const PACKED_GAP: Record<Exclude<Spacing, 'normal'>, { x: number; y: number }> = {
  compact: { x: 24, y: 10 },
  tight: { x: 8, y: 4 },
  // Wide lanes so every link has room to be followed by eye.
  exploded: { x: 60, y: 40 },
}

/** What a card measures before the canvas has drawn it. */
const DEFAULT_CARD: Size = { width: 210, height: 104 }

/**
 * Packs the matrix by the measured size of each card instead of a fixed grid:
 * a column is as wide as its widest card, and a card sits right under the one
 * above it, so nothing overlaps and nothing is further apart than it has to be.
 */
export interface Packing {
  spacing: Exclude<Spacing, 'normal'>
  /** The drawn size of a card, when known. */
  sizeOf: (nodeId: string) => Size | undefined
}

/** How the cards in each column are put in order; without it they keep the order they came in. */
export interface LayoutOrder {
  order: ScoreOrder
  direction: ScoreDirection
}

function isTechniqueNode(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
}

/** Widest a row of exploded clusters grows before it wraps. */
const EXPLODED_ROW_WIDTH = 3600

/**
 * Exploded layout: every technique with its subtechniques is a cluster, the
 * parent in the middle and the subtechniques spread around it on a ring, so
 * each link is short and runs in its own direction. Clusters are scattered
 * over the canvas in rows, with room between them, instead of being stacked
 * in tactic columns. Tactic headers stay in a row along the top.
 */
function explode(
  nodes: InvestigationNode[],
  rootCards: InvestigationNode[],
  childrenOf: Map<string, InvestigationNode[]>,
  positions: Map<string, Position>,
  packing: Packing,
  columnOf: Map<string, number>,
) {
  const gap = PACKED_GAP.exploded
  const sizeOf = (node: InvestigationNode): Size => packing.sizeOf(node.id) ?? DEFAULT_CARD

  let headerBottom = 0
  for (const [tacticId, column] of columnOf) {
    const header = nodes.find((n) => n.type === 'mitre_tactic' && n.definitionId === tacticId)
    if (!header) continue
    positions.set(header.id, { x: column * COLUMN_WIDTH, y: TACTIC_ROW_Y })
    headerBottom = Math.max(headerBottom, TACTIC_ROW_Y + sizeOf(header).height)
  }

  let x = 0
  let y = headerBottom > 0 ? headerBottom + gap.y * 3 : 0
  let rowHeight = 0
  for (const root of rootCards) {
    const children = childrenOf.get(root.definitionId) ?? []
    const center = sizeOf(root)
    const kids = children.map(sizeOf)
    const widest = Math.max(0, ...kids.map((k) => k.width))
    const tallest = Math.max(0, ...kids.map((k) => k.height))
    // Neighbours on the ring must not touch: the ring is as long as the cards need side by side.
    const around = kids.reduce((sum, k) => sum + Math.max(k.width, k.height) + gap.x, 0)
    const radius =
      children.length === 0
        ? 0
        : Math.max(
            Math.max(center.width, center.height) / 2 + Math.max(widest, tallest) / 2 + gap.x,
            around / (2 * Math.PI),
          )
    const width = radius * 2 + Math.max(center.width, widest)
    const height = radius * 2 + Math.max(center.height, tallest)

    if (x > 0 && x + width > EXPLODED_ROW_WIDTH) {
      x = 0
      y += rowHeight + gap.y * 2
      rowHeight = 0
    }
    const cx = x + width / 2
    const cy = y + height / 2
    positions.set(root.id, { x: cx - center.width / 2, y: cy - center.height / 2 })
    children.forEach((child, index) => {
      // Start at the top and go round, so the first child sits straight above the parent.
      const angle = -Math.PI / 2 + (2 * Math.PI * index) / children.length
      positions.set(child.id, {
        x: cx + radius * Math.cos(angle) - kids[index].width / 2,
        y: cy + radius * Math.sin(angle) - kids[index].height / 2,
      })
    })
    x += width + gap.x
    rowHeight = Math.max(rowHeight, height)
  }
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
 *
 * With `order`, the cards of each column are sorted: by technique id, where a
 * subtechnique still sits under its parent, or by the score a Navigator layer
 * gave them, where every card stands on its own so the column reads strictly
 * from the highest score down (or the lowest up).
 */
export function layoutLikeMitre(
  nodes: InvestigationNode[],
  tactics: MitreTactic[],
  techniques: MitreTechnique[],
  order?: LayoutOrder,
  packing?: Packing,
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
  const cardsInColumn = new Map<number, InvestigationNode[]>()
  const techniqueNodes = nodes.filter(isTechniqueNode)

  function columnFor(node: InvestigationNode): number {
    // A subtechnique the knowledge base does not place follows its parent.
    const parentId = parentTechniqueId(node.definitionId)
    const definition =
      techniquesById.get(node.definitionId) ?? (parentId ? techniquesById.get(parentId) : undefined)
    const firstKnownTactic = definition?.tactics.find((id) => columnOf.has(id))
    return firstKnownTactic ? (columnOf.get(firstKnownTactic) ?? overflowColumn) : overflowColumn
  }

  function place(node: InvestigationNode, column: number) {
    const row = nextRowInColumn.get(column) ?? 0
    nextRowInColumn.set(column, row + 1)
    cardsInColumn.set(column, [...(cardsInColumn.get(column) ?? []), node])
    positions.set(node.id, {
      x: column * COLUMN_WIDTH,
      y: TECHNIQUE_START_Y + row * ROW_HEIGHT,
    })
  }

  // Cascade: a subtechnique sits directly under its parent, in the parent's
  // column, so the chain reads tactic → technique → subtechnique downwards.
  const childrenOf = new Map<string, InvestigationNode[]>()
  const rootTechniques: InvestigationNode[] = []
  const presentTechniqueIds = new Set(techniqueNodes.map((n) => n.definitionId))

  for (const node of techniqueNodes) {
    const parentId = parentTechniqueId(node.definitionId)
    if (parentId && presentTechniqueIds.has(parentId)) {
      const siblings = childrenOf.get(parentId) ?? []
      siblings.push(node)
      childrenOf.set(parentId, siblings)
    } else {
      rootTechniques.push(node)
    }
  }

  const roots = () => (order ? sortByScoreView(rootTechniques, order) : rootTechniques)

  if (order?.order === 'score') {
    for (const card of sortByScoreView(techniqueNodes, order)) place(card, columnFor(card))
  } else {
    for (const technique of roots()) {
      const column = columnFor(technique)
      place(technique, column)
      for (const child of childrenOf.get(technique.definitionId) ?? []) {
        place(child, column)
      }
    }
  }

  const deepestRow = Math.max(0, ...nextRowInColumn.values())
  let otherY = TECHNIQUE_START_Y + deepestRow * ROW_HEIGHT + OTHER_ROW_GAP

  if (packing?.spacing === 'exploded') {
    explode(nodes, roots(), childrenOf, positions, packing, columnOf)
    const bottom = Math.max(0, ...[...positions.values()].map((p) => p.y)) + DEFAULT_CARD.height
    otherY = bottom + OTHER_ROW_GAP / 2
  } else if (packing) {
    const gap = PACKED_GAP[packing.spacing]
    const sizeOf = (node: InvestigationNode): Size => packing.sizeOf(node.id) ?? DEFAULT_CARD
    const headers = new Map<number, InvestigationNode>()
    for (const [tacticId, column] of columnOf) {
      const header = nodes.find((n) => n.type === 'mitre_tactic' && n.definitionId === tacticId)
      if (header) headers.set(column, header)
    }

    // A column with neither a header nor a card takes no room at all.
    const used = [...new Set([...headers.keys(), ...cardsInColumn.keys()])].sort((a, b) => a - b)
    const headerHeight = Math.max(0, ...[...headers.values()].map((h) => sizeOf(h).height))
    const startY = headers.size > 0 ? TACTIC_ROW_Y + headerHeight + gap.y * 2 : TACTIC_ROW_Y

    let x = 0
    let bottom = startY
    for (const column of used) {
      const header = headers.get(column)
      const cards = cardsInColumn.get(column) ?? []
      const width = Math.max(
        header ? sizeOf(header).width : 0,
        ...cards.map((card) => sizeOf(card).width),
      )
      if (header) positions.set(header.id, { x, y: TACTIC_ROW_Y })
      let y = startY
      for (const card of cards) {
        positions.set(card.id, { x, y })
        y += sizeOf(card).height + gap.y
      }
      bottom = Math.max(bottom, y)
      x += width + gap.x
    }
    otherY = bottom + OTHER_ROW_GAP / 2
  }

  const others = nodes.filter((n) => n.type !== 'mitre_tactic' && !isTechniqueNode(n))
  others.forEach((node, index) => {
    positions.set(node.id, {
      x: (index % OTHER_COLUMNS) * COLUMN_WIDTH,
      y: otherY + Math.floor(index / OTHER_COLUMNS) * ROW_HEIGHT,
    })
  })

  return positions
}
