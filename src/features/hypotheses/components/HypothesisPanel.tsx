import type { ConfidenceLevel } from '../../../shared/types/investigation'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import type { HypothesisResult } from '../../../shared/types/correlation'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { useI18n, localize, type TranslationKey } from '../../../shared/i18n'
import './HypothesisPanel.css'

const CONFIDENCE_KEYS: Record<ConfidenceLevel, TranslationKey> = {
  low: 'confidence.low',
  possible: 'confidence.possible',
  probable: 'confidence.probable',
  high: 'confidence.high',
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
  const { t, locale } = useI18n()
  const recordCheckAnswer = useInvestigationStore((s) => s.recordCheckAnswer)
  const definition = knowledgeBase?.hypotheses.find((h) => h.id === result.hypothesisId)

  return (
    <article className={`hypothesis-card hypothesis-card--${result.confidenceLevel}`}>
      <header className="hypothesis-card__header">
        <h3>{definition ? localize(definition.name, locale) : result.hypothesisId}</h3>
        <span className="hypothesis-card__badge">
          {t(CONFIDENCE_KEYS[result.confidenceLevel])} ({result.normalizedScore})
        </span>
      </header>

      {definition && (
        <p className="hypothesis-card__description">{localize(definition.description, locale)}</p>
      )}

      {definition && definition.mitre.length > 0 && (
        <p className="hypothesis-card__mitre">
          {t('hypotheses.mitre')}
          {definition.mitre.join(', ')}
        </p>
      )}

      <p className="hypothesis-card__explanation">{result.explanation}</p>

      {result.matchedConditions.length > 0 && (
        <details open>
          <summary>
            {t('hypotheses.matched')} ({result.matchedConditions.length})
          </summary>
          <ul>
            {result.matchedConditions.map((c) => (
              <li key={c.condition.id}>{localize(c.condition.description, locale)}</li>
            ))}
          </ul>
        </details>
      )}

      {result.missingConditions.length > 0 && (
        <details>
          <summary>
            {t('hypotheses.missing')} ({result.missingConditions.length})
          </summary>
          <ul>
            {result.missingConditions.map((c) => (
              <li key={c.condition.id}>{localize(c.condition.description, locale)}</li>
            ))}
          </ul>
        </details>
      )}

      {result.contradictedConditions.length > 0 && (
        <details open>
          <summary>
            {t('hypotheses.contradicted')} ({result.contradictedConditions.length})
          </summary>
          <ul>
            {result.contradictedConditions.map((c) => (
              <li key={c.condition.id}>{localize(c.condition.description, locale)}</li>
            ))}
          </ul>
        </details>
      )}

      {result.recommendedChecks.length > 0 && (
        <div className="hypothesis-card__checks">
          <h4>{t('hypotheses.whatToCheck')}</h4>
          {result.recommendedChecks.map((check) => (
            <div key={check.id} className="hypothesis-card__check">
              <p className="hypothesis-card__check-title">{localize(check.title, locale)}</p>
              <p className="hypothesis-card__check-reason">{localize(check.reason, locale)}</p>
              <div className="hypothesis-card__check-answers">
                {check.answers.map((answer) => (
                  <button
                    key={answer.value}
                    type="button"
                    onClick={() => recordCheckAnswer(check.id, answer.value)}
                  >
                    {localize(answer.label, locale)}
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
  const { t } = useI18n()
  const results = useInvestigationStore((s) => s.hypothesisResults)

  return (
    <div className="hypothesis-panel">
      <p className="hypothesis-panel__disclaimer">{t('hypotheses.disclaimer')}</p>
      {results.length === 0 && <p className="hypothesis-panel__empty">{t('hypotheses.empty')}</p>}
      {results.map((result) => (
        <HypothesisCard key={result.hypothesisId} result={result} knowledgeBase={knowledgeBase} />
      ))}
    </div>
  )
}
