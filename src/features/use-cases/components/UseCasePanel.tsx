import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { UseCaseCard } from './UseCaseCard'
import { useI18n } from '../../../shared/i18n'
import './UseCasePanel.css'

interface UseCasePanelProps {
  knowledgeBase: KnowledgeBase | null
}

export function UseCasePanel({ knowledgeBase }: UseCasePanelProps) {
  const { t, locale } = useI18n()
  const suggestions = useInvestigationStore((s) => s.useCaseSuggestions)
  const applyUseCase = useInvestigationStore((s) => s.applyUseCase)

  if (!knowledgeBase) return null

  return (
    <div className="use-case-panel">
      <p className="use-case-panel__disclaimer">{t('useCasePanel.disclaimer')}</p>
      {suggestions.length === 0 && <p className="use-case-panel__empty">{t('useCasePanel.empty')}</p>}
      {suggestions.map((suggestion) => (
        <UseCaseCard
          key={suggestion.useCaseId}
          useCaseId={suggestion.useCaseId}
          knowledgeBase={knowledgeBase}
          suggestion={suggestion}
          onApply={() => {
            const useCase = knowledgeBase.useCases.find((u) => u.id === suggestion.useCaseId)
            if (useCase) applyUseCase(useCase, knowledgeBase, locale)
          }}
        />
      ))}
    </div>
  )
}
