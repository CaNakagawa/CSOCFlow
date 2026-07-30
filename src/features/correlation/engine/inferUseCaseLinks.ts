import type { InvestigationEdge, InvestigationNode } from '../../../shared/types/investigation'
import type { UseCaseDefinition } from '../../../shared/types/knowledge'

const USE_CASE_LINK_CONFIDENCE = 100

function isTechniqueNode(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
}

export function inferUseCaseLinks(
  nodes: InvestigationNode[],
  useCases: UseCaseDefinition[],
): InvestigationEdge[] {
  const useCasesById = new Map(useCases.map((u) => [u.id, u]))
  const techniqueNodes = nodes.filter(isTechniqueNode)
  const edges: InvestigationEdge[] = []

  for (const node of nodes.filter((n) => n.type === 'detection_use_case')) {
    const definition = useCasesById.get(node.definitionId)
    if (!definition) continue

    for (const techniqueId of definition.techniques) {
      const techniqueNode = techniqueNodes.find((t) => t.definitionId === techniqueId)
      if (!techniqueNode) continue

      edges.push({
        id: `usecase-${node.id}-${techniqueNode.id}`,
        source: node.id,
        target: techniqueNode.id,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'maps_to',
        label: 'mapeia para',
        automatic: true,
        confidence: USE_CASE_LINK_CONFIDENCE,
        explanation: `Técnica associada ao caso de uso "${definition.name}".`,
      })
    }
  }

  return edges
}
