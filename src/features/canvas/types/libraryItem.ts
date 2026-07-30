import type { CanvasNodeType } from '../../../shared/types/investigation'
import type { EvidenceFieldDefinition, KnowledgeBase } from '../../../shared/types/knowledge'

export interface LibraryItem {
  definitionId: string
  nodeType: CanvasNodeType
  label: string
  category: string
  brief?: string
  fieldDefinitions: EvidenceFieldDefinition[]
  isUseCase?: boolean
}

const GENERIC_ITEMS: LibraryItem[] = [
  {
    definitionId: 'generic.alert',
    nodeType: 'alert',
    label: 'Alerta',
    category: 'Alertas',
    brief: 'Um alerta gerado por uma ferramenta de segurança.',
    fieldDefinitions: [
      { id: 'source_tool', label: 'Ferramenta de origem', type: 'string', required: false },
      { id: 'severity', label: 'Severidade', type: 'string', required: false },
    ],
  },
  {
    definitionId: 'generic.evidence',
    nodeType: 'evidence',
    label: 'Evidência genérica',
    category: 'Evidências',
    brief:
      'Uma evidência observada que ainda não possui um tipo específico na base de conhecimento.',
    fieldDefinitions: [{ id: 'description', label: 'Descrição', type: 'string', required: false }],
  },
  {
    definitionId: 'generic.analyst_note',
    nodeType: 'analyst_note',
    label: 'Observação do analista',
    category: 'Observações do Analista',
    brief: 'Uma anotação livre do analista sobre a investigação.',
    fieldDefinitions: [{ id: 'text', label: 'Texto', type: 'string', required: false }],
  },
]

export function buildLibraryItems(knowledgeBase: KnowledgeBase): LibraryItem[] {
  const tacticItems: LibraryItem[] = knowledgeBase.tactics.map((tactic) => ({
    definitionId: tactic.id,
    nodeType: 'mitre_tactic',
    label: `${tactic.id} - ${tactic.name}`,
    category: 'Táticas MITRE ATT&CK',
    fieldDefinitions: [],
  }))

  const techniqueItems: LibraryItem[] = knowledgeBase.techniques.map((technique) => ({
    definitionId: technique.id,
    nodeType: technique.type,
    label: `${technique.id} - ${technique.name}`,
    category: 'Técnicas MITRE ATT&CK',
    brief: technique.brief,
    fieldDefinitions: [],
  }))

  const evidenceItems: LibraryItem[] = knowledgeBase.evidenceTypes.map((evidenceType) => ({
    definitionId: evidenceType.id,
    nodeType: evidenceType.node_type,
    label: evidenceType.name,
    category: evidenceType.category,
    brief: evidenceType.brief,
    fieldDefinitions: evidenceType.fields,
  }))

  const useCaseItems: LibraryItem[] = knowledgeBase.useCases.map((useCase) => ({
    definitionId: useCase.id,
    nodeType: 'detection_use_case',
    label: useCase.name,
    category: 'Casos de Uso',
    brief: useCase.description,
    fieldDefinitions: [],
    isUseCase: true,
  }))

  return [...tacticItems, ...techniqueItems, ...evidenceItems, ...useCaseItems, ...GENERIC_ITEMS]
}
