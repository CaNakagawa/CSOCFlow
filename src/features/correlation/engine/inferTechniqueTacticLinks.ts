import type { InvestigationEdge, InvestigationNode } from '../../../shared/types/investigation'
import type { MitreTechnique } from '../../../shared/types/knowledge'
import { translate, type Locale } from '../../../shared/i18n'
import type { SourceHandleId, TargetHandleId } from '../../../shared/types/handles'

const TACTIC_LINK_CONFIDENCE = 100

// Techniques and their tactics land side by side on the grid, so a straight
// right-to-left connector reads better than looping under the nodes.
const SOURCE_HANDLE: SourceHandleId = 'right'
const TARGET_HANDLE: TargetHandleId = 'left'

function isTechniqueNode(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
}

/**
 * Links every technique on the canvas to the tactics it belongs to, whenever
 * those tactic nodes are also present. Only runs while auto-link is enabled, so
 * an analyst who places a tactic and a technique deliberately apart keeps them
 * apart.
 */
export function inferTechniqueTacticLinks(
  nodes: InvestigationNode[],
  techniques: MitreTechnique[],
  locale: Locale,
): InvestigationEdge[] {
  const tacticNodes = nodes.filter((n) => n.type === 'mitre_tactic')
  if (tacticNodes.length === 0) return []

  const techniquesById = new Map(techniques.map((t) => [t.id, t]))
  const label = translate(locale, 'relationship.maps_to')
  const edges: InvestigationEdge[] = []

  for (const node of nodes.filter(isTechniqueNode)) {
    const definition = techniquesById.get(node.definitionId)
    if (!definition) continue

    for (const tacticId of definition.tactics) {
      const tacticNode = tacticNodes.find((t) => t.definitionId === tacticId)
      if (!tacticNode) continue

      edges.push({
        id: `tactic-${node.id}-${tacticNode.id}`,
        source: node.id,
        target: tacticNode.id,
        sourceHandle: SOURCE_HANDLE,
        targetHandle: TARGET_HANDLE,
        type: 'maps_to',
        label,
        automatic: true,
        confidence: TACTIC_LINK_CONFIDENCE,
        explanation: `${node.label} -> ${tacticNode.label}`,
      })
    }
  }

  return edges
}
