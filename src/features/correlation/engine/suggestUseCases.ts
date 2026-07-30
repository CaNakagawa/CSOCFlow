import type { InvestigationNode } from '../../../shared/types/investigation'
import type { UseCaseDefinition } from '../../../shared/types/knowledge'
import type { UseCaseSuggestion } from '../../../shared/types/correlation'

function isTechniqueNode(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
}

export function suggestUseCases(
  nodes: InvestigationNode[],
  useCases: UseCaseDefinition[],
): UseCaseSuggestion[] {
  const presentTechniqueIds = new Set(nodes.filter(isTechniqueNode).map((n) => n.definitionId))
  const appliedUseCaseIds = new Set(
    nodes.filter((n) => n.type === 'detection_use_case').map((n) => n.definitionId),
  )

  return useCases
    .map((useCase) => {
      const matchedTechniques = useCase.techniques.filter((t) => presentTechniqueIds.has(t))
      const missingTechniques = useCase.techniques.filter((t) => !presentTechniqueIds.has(t))
      return {
        useCaseId: useCase.id,
        matchedTechniques,
        missingTechniques,
        matchRatio:
          useCase.techniques.length === 0
            ? 0
            : matchedTechniques.length / useCase.techniques.length,
        applied: appliedUseCaseIds.has(useCase.id),
      }
    })
    .filter((suggestion) => suggestion.matchedTechniques.length > 0)
    .sort(
      (a, b) =>
        b.matchRatio - a.matchRatio || b.matchedTechniques.length - a.matchedTechniques.length,
    )
}
