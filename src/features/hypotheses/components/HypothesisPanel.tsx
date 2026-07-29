import type { ConfidenceLevel } from '../../../shared/types/investigation'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import type { HypothesisResult } from '../../../shared/types/correlation'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import './HypothesisPanel.css'

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  low: 'Baixa compatibilidade',
  possible: 'Possível',
  probable: 'Provável',
  high: 'Alta compatibilidade',
}

interface HypothesisPanelProps {
  knowledgeBase: KnowledgeBase | null
}

function HypothesisCard({
  result,
  knowledgeBase,
}: {
  result: HypothesisResult
  knowledgeBase: KnowledgeBase | null
}) {
  const recordCheckAnswer = useInvestigationStore((s) => s.recordCheckAnswer)
  const definition = knowledgeBase?.hypotheses.find((h) => h.id === result.hypothesisId)

  return (
    <article className={`hypothesis-card hypothesis-card--${result.confidenceLevel}`}>
      <header className="hypothesis-card__header">
        <h3>{definition?.name ?? result.hypothesisId}</h3>
        <span className="hypothesis-card__badge">
          {CONFIDENCE_LABELS[result.confidenceLevel]} ({result.normalizedScore})
        </span>
      </header>

      {definition && <p className="hypothesis-card__description">{definition.description}</p>}

      {definition && definition.mitre.length > 0 && (
        <p className="hypothesis-card__mitre">MITRE ATT&amp;CK: {definition.mitre.join(', ')}</p>
      )}

      <p className="hypothesis-card__explanation">{result.explanation}</p>

      {result.matchedConditions.length > 0 && (
        <details open>
          <summary>Evidências favoráveis ({result.matchedConditions.length})</summary>
          <ul>
            {result.matchedConditions.map((c) => (
              <li key={c.condition.id}>{c.condition.description}</li>
            ))}
          </ul>
        </details>
      )}

      {result.missingConditions.length > 0 && (
        <details>
          <summary>Evidências ausentes ({result.missingConditions.length})</summary>
          <ul>
            {result.missingConditions.map((c) => (
              <li key={c.condition.id}>{c.condition.description}</li>
            ))}
          </ul>
        </details>
      )}

      {result.contradictedConditions.length > 0 && (
        <details open>
          <summary>Evidências contrárias ({result.contradictedConditions.length})</summary>
          <ul>
            {result.contradictedConditions.map((c) => (
              <li key={c.condition.id}>{c.condition.description}</li>
            ))}
          </ul>
        </details>
      )}

      {result.recommendedChecks.length > 0 && (
        <div className="hypothesis-card__checks">
          <h4>O que verificar agora?</h4>
          {result.recommendedChecks.map((check) => (
            <div key={check.id} className="hypothesis-card__check">
              <p className="hypothesis-card__check-title">{check.title}</p>
              <p className="hypothesis-card__check-reason">{check.reason}</p>
              <div className="hypothesis-card__check-answers">
                {check.answers.map((answer) => (
                  <button
                    key={answer.value}
                    type="button"
                    onClick={() => recordCheckAnswer(check.id, answer.value)}
                  >
                    {answer.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

export function HypothesisPanel({ knowledgeBase }: HypothesisPanelProps) {
  const results = useInvestigationStore((s) => s.hypothesisResults)

  return (
    <div className="hypothesis-panel">
      <p className="hypothesis-panel__disclaimer">
        A pontuação é baseada em regras investigativas e não representa uma confirmação automática
        do incidente.
      </p>
      {results.length === 0 && (
        <p className="hypothesis-panel__empty">
          Nenhuma hipótese compatível ainda. Adicione evidências ao canvas para começar a
          correlação.
        </p>
      )}
      {results.map((result) => (
        <HypothesisCard key={result.hypothesisId} result={result} knowledgeBase={knowledgeBase} />
      ))}
    </div>
  )
}
