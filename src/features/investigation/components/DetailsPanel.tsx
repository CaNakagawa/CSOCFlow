import { useInvestigationStore } from '../store/investigationStore'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import type { NodeState } from '../../../shared/types/investigation'
import { NODE_STATE_LABELS } from '../../canvas/utils/nodeVisuals'
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

function findEducationalContent(knowledgeBase: KnowledgeBase | null, definitionId: string) {
  if (!knowledgeBase) return null
  const technique = knowledgeBase.techniques.find((t) => t.id === definitionId)
  if (technique) {
    return {
      title: `${technique.id} - ${technique.name}`,
      whatItMeans: technique.investigation_context.what_it_means,
      whyItMatters: technique.investigation_context.why_it_matters,
      suspiciousWhen: technique.investigation_context.suspicious_when,
      legitimateWhen: technique.investigation_context.legitimate_when,
      commonMistakes: technique.investigation_context.common_mistakes,
    }
  }
  const evidenceType = knowledgeBase.evidenceTypes.find((e) => e.id === definitionId)
  if (evidenceType) {
    return {
      title: evidenceType.name,
      whatItMeans: evidenceType.brief,
      whyItMatters: evidenceType.educational_content.why_it_matters,
      suspiciousWhen: evidenceType.educational_content.suspicious_when,
      legitimateWhen: evidenceType.educational_content.legitimate_when,
      commonMistakes: [],
    }
  }
  return null
}

interface DetailsPanelProps {
  knowledgeBase: KnowledgeBase | null
}

export function DetailsPanel({ knowledgeBase }: DetailsPanelProps) {
  const nodes = useInvestigationStore((s) => s.nodes)
  const selectedNodeId = useInvestigationStore((s) => s.selectedNodeId)
  const node = nodes.find((n) => n.id === selectedNodeId)
  const updateNodeFields = useInvestigationStore((s) => s.updateNodeFields)
  const updateNodeState = useInvestigationStore((s) => s.updateNodeState)
  const updateNodeNotes = useInvestigationStore((s) => s.updateNodeNotes)

  if (!node) {
    return (
      <p className="details-panel__empty">Selecione um elemento no canvas para ver os detalhes.</p>
    )
  }

  const education = findEducationalContent(knowledgeBase, node.definitionId)

  return (
    <div className="details-panel">
      <h3 className="details-panel__label">{node.label}</h3>

      <label className="details-panel__field">
        <span>Estado investigativo</span>
        <select
          value={node.state}
          onChange={(e) => updateNodeState(node.id, e.target.value as NodeState)}
        >
          {NODE_STATES.map((s) => (
            <option key={s} value={s}>
              {NODE_STATE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {Object.entries(node.fields).map(([key, value]) => (
        <label className="details-panel__field" key={key}>
          <span>{key}</span>
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
        <span>Observações</span>
        <textarea
          value={node.notes ?? ''}
          onChange={(e) => updateNodeNotes(node.id, e.target.value)}
          rows={3}
        />
      </label>

      {education && (
        <div className="details-panel__education">
          <h4>{education.title}</h4>
          <p>{education.whatItMeans}</p>
          <p className="details-panel__why">{education.whyItMatters}</p>
          {education.suspiciousWhen.length > 0 && (
            <>
              <h5>Costuma ser suspeito quando</h5>
              <ul>
                {education.suspiciousWhen.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {education.legitimateWhen.length > 0 && (
            <>
              <h5>Costuma ser legítimo quando</h5>
              <ul>
                {education.legitimateWhen.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {education.commonMistakes.length > 0 && (
            <>
              <h5>Erros comuns de interpretação</h5>
              <ul>
                {education.commonMistakes.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
