import type { KnowledgeBase } from '../../../shared/types/knowledge'
import type { UseCaseSuggestion } from '../../../shared/types/correlation'
import './UseCaseCard.css'

interface UseCaseCardProps {
  useCaseId: string
  knowledgeBase: KnowledgeBase
  suggestion?: UseCaseSuggestion
  onApply?: () => void
}

function tacticName(knowledgeBase: KnowledgeBase, tacticId: string): string {
  return knowledgeBase.tactics.find((t) => t.id === tacticId)?.name ?? tacticId
}

function techniqueName(knowledgeBase: KnowledgeBase, techniqueId: string): string {
  const technique = knowledgeBase.techniques.find((t) => t.id === techniqueId)
  return technique ? `${technique.id} - ${technique.name}` : techniqueId
}

export function UseCaseCard({ useCaseId, knowledgeBase, suggestion, onApply }: UseCaseCardProps) {
  const useCase = knowledgeBase.useCases.find((u) => u.id === useCaseId)
  if (!useCase) return null

  const matched = new Set(suggestion?.matchedTechniques ?? [])

  return (
    <article className={`use-case-card${suggestion?.applied ? ' use-case-card--applied' : ''}`}>
      <header className="use-case-card__header">
        <h3>{useCase.name}</h3>
        {suggestion?.applied && <span className="use-case-card__badge">Aplicado</span>}
      </header>

      <p className="use-case-card__description">{useCase.description}</p>

      <p className="use-case-card__meta">
        Táticas: {useCase.tactics.map((t) => tacticName(knowledgeBase, t)).join(', ')}
      </p>

      <ul className="use-case-card__techniques">
        {useCase.techniques.map((techniqueId) => (
          <li
            key={techniqueId}
            className={
              suggestion === undefined
                ? undefined
                : matched.has(techniqueId)
                  ? 'use-case-card__technique--matched'
                  : 'use-case-card__technique--missing'
            }
          >
            {techniqueName(knowledgeBase, techniqueId)}
            {suggestion !== undefined && (matched.has(techniqueId) ? ' (no canvas)' : ' (ausente)')}
          </li>
        ))}
      </ul>

      {onApply && !suggestion?.applied && (
        <button type="button" className="use-case-card__apply" onClick={onApply}>
          Aplicar caso de uso
        </button>
      )}

      <details className="use-case-card__steps">
        <summary>Passo a passo da investigação</summary>
        <ol>
          {[...useCase.investigationSteps]
            .sort((a, b) => a.order - b.order)
            .map((step) => (
              <li key={step.order}>
                <p className="use-case-card__step-technique">
                  {techniqueName(knowledgeBase, step.techniqueId)}
                </p>
                <p>{step.instruction}</p>
                {step.detectionStrategies.length > 0 && (
                  <ul className="use-case-card__detection-strategies">
                    {step.detectionStrategies.map((strategy) => (
                      <li key={strategy.id}>
                        <a href={strategy.url} target="_blank" rel="noopener noreferrer">
                          {strategy.id} — {strategy.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
        </ol>
      </details>

      {useCase.dataSources.length > 0 && (
        <p className="use-case-card__data-sources">
          Fontes de dados: {useCase.dataSources.join(', ')}
        </p>
      )}

      {useCase.sourceReference && (
        <p className="use-case-card__source">
          Baseado em:{' '}
          <a href={useCase.sourceReference.url} target="_blank" rel="noopener noreferrer">
            {useCase.sourceReference.title}
          </a>
        </p>
      )}
    </article>
  )
}
