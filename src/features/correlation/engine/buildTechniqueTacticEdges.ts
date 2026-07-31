import type { InvestigationEdge, InvestigationNode } from '../../../shared/types/investigation'
import type { MitreTechnique } from '../../../shared/types/knowledge'
import { translate, type Locale } from '../../../shared/i18n'
import type { HandleId } from '../../../shared/types/handles'
import { parentTechniqueId } from './buildSubtechniqueEdges'

// Techniques hang below their tactic, so the connector leaves the technique's
// top edge. Only tactics sit side by side.
const SOURCE_HANDLE: HandleId = 'top'
const TARGET_HANDLE: HandleId = 'bottom'

function isTechniqueNode(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
}

export function techniqueTacticEdgeId(techniqueNodeId: string, tacticNodeId: string): string {
  return `tactic-${techniqueNodeId}-${tacticNodeId}`
}

/**
 * Builds a connection from every technique on the canvas to each of its tactics
 * that is also present.
 *
 * A subtechnique whose parent is on the canvas is skipped: it reaches the
 * tactic through its parent, so the chain reads subtechnique → technique →
 * tactic instead of the subtechnique short-circuiting to the tactic. A
 * subtechnique standing alone still links directly, rather than floating.
 *
 * The Auto link action runs this once and stores the result as ordinary
 * connections rather than re-deriving them every tick, so the analyst can
 * restyle them, drag their endpoints to another side or delete them and have
 * that stick.
 */
export function buildTechniqueTacticEdges(
  nodes: InvestigationNode[],
  techniques: MitreTechnique[],
  locale: Locale,
): InvestigationEdge[] {
  const tacticNodes = nodes.filter((n) => n.type === 'mitre_tactic')
  if (tacticNodes.length === 0) return []

  const techniqueNodes = nodes.filter(isTechniqueNode)
  const presentTechniqueIds = new Set(techniqueNodes.map((n) => n.definitionId))
  const techniquesById = new Map(techniques.map((t) => [t.id, t]))
  const label = translate(locale, 'relationship.maps_to')
  const edges: InvestigationEdge[] = []

  for (const node of techniqueNodes) {
    const parentId = parentTechniqueId(node.definitionId)
    if (parentId && presentTechniqueIds.has(parentId)) continue

    const definition = techniquesById.get(node.definitionId)
    if (!definition) continue

    for (const tacticId of definition.tactics) {
      const tacticNode = tacticNodes.find((t) => t.definitionId === tacticId)
      if (!tacticNode) continue

      edges.push({
        id: techniqueTacticEdgeId(node.id, tacticNode.id),
        source: node.id,
        target: tacticNode.id,
        sourceHandle: SOURCE_HANDLE,
        targetHandle: TARGET_HANDLE,
        type: 'maps_to',
        label,
        automatic: false,
        explanation: `${node.label} -> ${tacticNode.label}`,
      })
    }
  }

  return edges
}
