import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { UseCaseCard } from './UseCaseCard'
import './UseCasePanel.css'

interface UseCasePanelProps {
  knowledgeBase: KnowledgeBase | null
}

export function UseCasePanel({ knowledgeBase }: UseCasePanelProps) {
  const suggestions = useInvestigationStore((s) => s.useCaseSuggestions)
  const applyUseCase = useInvestigationStore((s) => s.applyUseCase)

  if (!knowledgeBase) return null

  return (
    <div className="use-case-panel">
      <p className="use-case-panel__disclaimer">
        Sugerido a partir das técnicas MITRE ATT&amp;CK presentes no canvas. Adicione técnicas pela
        biblioteca para ver mais casos de uso compatíveis.
      </p>
      {suggestions.length === 0 && (
        <p className="use-case-panel__empty">
          Nenhum caso de uso compatível ainda. Adicione uma técnica MITRE ATT&amp;CK ao canvas, ou
          selecione um caso de uso diretamente na biblioteca.
        </p>
      )}
      {suggestions.map((suggestion) => (
        <UseCaseCard
          key={suggestion.useCaseId}
          useCaseId={suggestion.useCaseId}
          knowledgeBase={knowledgeBase}
          suggestion={suggestion}
          onApply={() => {
            const useCase = knowledgeBase.useCases.find((u) => u.id === suggestion.useCaseId)
            if (useCase) applyUseCase(useCase, knowledgeBase)
          }}
        />
      ))}
    </div>
  )
}
