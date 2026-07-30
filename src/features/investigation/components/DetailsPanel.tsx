import { useInvestigationStore } from '../store/investigationStore'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import type { AnalyticStatus, NodeState } from '../../../shared/types/investigation'
import { nodeStateKey } from '../../canvas/utils/nodeVisuals'
import { buildGenericItems } from '../../canvas/types/libraryItem'
import { UseCaseCard } from '../../use-cases/components/UseCaseCard'
import { useI18n, localize, localizeList, type Locale } from '../../../shared/i18n'
import './DetailsPanel.css'

const NODE_STATES: NodeState[] = [
  'unknown',
  'observed',
  'suspicious',
  'confirmed_malicious',
  'expected',
  'false_positive',
  'discarded',
]

function findFieldLabel(
  knowledgeBase: KnowledgeBase | null,
  definitionId: string,
  fieldId: string,
  locale: Locale,
): string {
  const evidenceType = knowledgeBase?.evidenceTypes.find((e) => e.id === definitionId)
  const field =
    evidenceType?.fields.find((f) => f.id === fieldId) ??
    buildGenericItems(locale)
      .find((item) => item.definitionId === definitionId)
      ?.fieldDefinitions.find((f) => f.id === fieldId)
  return field ? localize(field.label, locale) : fieldId
}

function findEducationalContent(
  knowledgeBase: KnowledgeBase | null,
  definitionId: string,
  locale: Locale,
) {
  if (!knowledgeBase) return null
  const technique = knowledgeBase.techniques.find((t) => t.id === definitionId)
  if (technique) {
    const tacticNames = technique.tactics.map(
      (tacticId) => knowledgeBase.tactics.find((t) => t.id === tacticId)?.name ?? tacticId,
    )
    return {
      title: `${technique.id} - ${technique.name}`,
      tactics: tacticNames,
      whatItMeans: localize(technique.investigation_context.what_it_means, locale),
      whyItMatters: localize(technique.investigation_context.why_it_matters, locale),
      suspiciousWhen: localizeList(technique.investigation_context.suspicious_when, locale),
      legitimateWhen: localizeList(technique.investigation_context.legitimate_when, locale),
      commonMistakes: localizeList(technique.investigation_context.common_mistakes, locale),
      detectionAnalytics: technique.detection_analytics,
    }
  }
  const evidenceType = knowledgeBase.evidenceTypes.find((e) => e.id === definitionId)
  if (evidenceType) {
    return {
      title: localize(evidenceType.name, locale),
      tactics: [] as string[],
      whatItMeans: localize(evidenceType.brief, locale),
      whyItMatters: localize(evidenceType.educational_content.why_it_matters, locale),
      suspiciousWhen: localizeList(evidenceType.educational_content.suspicious_when, locale),
      legitimateWhen: localizeList(evidenceType.educational_content.legitimate_when, locale),
      commonMistakes: [] as string[],
      detectionAnalytics: [],
    }
  }
  return null
}

interface DetailsPanelProps {
  knowledgeBase: KnowledgeBase | null
}

export function DetailsPanel({ knowledgeBase }: DetailsPanelProps) {
  const { t, locale } = useI18n()
  const nodes = useInvestigationStore((s) => s.nodes)
  const selectedNodeId = useInvestigationStore((s) => s.selectedNodeId)
  const node = nodes.find((n) => n.id === selectedNodeId)
  const useCaseSuggestions = useInvestigationStore((s) => s.useCaseSuggestions)
  const updateNodeFields = useInvestigationStore((s) => s.updateNodeFields)
  const updateNodeState = useInvestigationStore((s) => s.updateNodeState)
  const updateNodeNotes = useInvestigationStore((s) => s.updateNodeNotes)
  const duplicateNode = useInvestigationStore((s) => s.duplicateNode)
  const removeNode = useInvestigationStore((s) => s.removeNode)
  const setAnalyticStatus = useInvestigationStore((s) => s.setAnalyticStatus)

  if (!node) {
    return <p className="details-panel__empty">{t('details.empty')}</p>
  }

  if (node.type === 'detection_use_case' && knowledgeBase) {
    const suggestion = useCaseSuggestions.find((s) => s.useCaseId === node.definitionId)
    return (
      <UseCaseCard
        useCaseId={node.definitionId}
        knowledgeBase={knowledgeBase}
        suggestion={suggestion}
      />
    )
  }

  const education = findEducationalContent(knowledgeBase, node.definitionId, locale)

  return (
    <div className="details-panel">
      <h3 className="details-panel__label">{node.label}</h3>

      <div className="details-panel__toolbar">
        <button type="button" onClick={() => duplicateNode(node.id)}>
          {t('details.duplicate')}
        </button>
        <button type="button" onClick={() => removeNode(node.id)}>
          {t('details.delete')}
        </button>
      </div>

      <label className="details-panel__field">
        <span>{t('details.state')}</span>
        <select
          value={node.state}
          onChange={(e) => updateNodeState(node.id, e.target.value as NodeState)}
        >
          {NODE_STATES.map((s) => (
            <option key={s} value={s}>
              {t(nodeStateKey(s))}
            </option>
          ))}
        </select>
      </label>

      {Object.entries(node.fields).map(([key, value]) => (
        <label className="details-panel__field" key={key}>
          <span>{findFieldLabel(knowledgeBase, node.definitionId, key, locale)}</span>
          {typeof value === 'boolean' ? (
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => updateNodeFields(node.id, { [key]: e.target.checked })}
            />
          ) : Array.isArray(value) ? (
            <input
              type="text"
              value={value.join(', ')}
              onChange={(e) =>
                updateNodeFields(node.id, {
                  [key]: e.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
            />
          ) : (
            <input
              type={typeof value === 'number' ? 'number' : 'text'}
              value={value === undefined ? '' : String(value)}
              onChange={(e) =>
                updateNodeFields(node.id, {
                  [key]: typeof value === 'number' ? Number(e.target.value) : e.target.value,
                })
              }
            />
          )}
        </label>
      ))}

      <label className="details-panel__field">
        <span>{t('details.notes')}</span>
        <textarea
          value={node.notes ?? ''}
          onChange={(e) => updateNodeNotes(node.id, e.target.value)}
          rows={3}
        />
      </label>

      {education && (
        <div className="details-panel__education">
          <h4>{education.title}</h4>
          {education.tactics.length > 0 && (
            <p className="details-panel__tactics">
              {t('details.tactics')}
              {education.tactics.join(', ')}
            </p>
          )}
          <p>{education.whatItMeans}</p>
          <p className="details-panel__why">{education.whyItMatters}</p>
          {education.suspiciousWhen.length > 0 && (
            <>
              <h5>{t('details.suspiciousWhen')}</h5>
              <ul>
                {education.suspiciousWhen.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {education.legitimateWhen.length > 0 && (
            <>
              <h5>{t('details.legitimateWhen')}</h5>
              <ul>
                {education.legitimateWhen.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {education.commonMistakes.length > 0 && (
            <>
              <h5>{t('details.commonMistakes')}</h5>
              <ul>
                {education.commonMistakes.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {education.detectionAnalytics.length > 0 && (
            <>
              <h5>{t('details.detectionAnalytics')}</h5>
              <ul className="details-panel__analytics">
                {education.detectionAnalytics.map((analytic) => {
                  const status: AnalyticStatus = node.analyticStatuses?.[analytic.id] ?? 'pending'
                  return (
                    <li key={analytic.id} className={`details-panel__analytic details-panel__analytic--${status}`}>
                      <p className="details-panel__analytic-id">
                        <a href={analytic.url} target="_blank" rel="noopener noreferrer">
                          {analytic.id}
                        </a>{' '}
                        ({analytic.detectionStrategyId})
                      </p>
                      <p className="details-panel__analytic-description">
                        {localize(analytic.description, locale)}
                      </p>
                      <div className="details-panel__analytic-actions">
                        <button
                          type="button"
                          className={status === 'confirmed' ? 'active' : ''}
                          onClick={() => setAnalyticStatus(node.id, analytic.id, 'confirmed')}
                        >
                          {status === 'confirmed' ? t('details.analyticConfirmed') : t('details.analyticConfirm')}
                        </button>
                        <button
                          type="button"
                          className={status === 'not_confirmed' ? 'active' : ''}
                          onClick={() => setAnalyticStatus(node.id, analytic.id, 'not_confirmed')}
                        >
                          {status === 'not_confirmed' ? t('details.analyticRuledOut') : t('details.analyticRuleOut')}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
