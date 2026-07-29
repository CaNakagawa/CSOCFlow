import type { CanvasNodeType } from '../../../shared/types/investigation'
import type { EvidenceFieldDefinition, KnowledgeBase } from '../../../shared/types/knowledge'

export interface LibraryItem {
  definitionId: string
  nodeType: CanvasNodeType
  label: string
  category: string
  brief?: string
  fieldDefinitions: EvidenceFieldDefinition[]
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
    category: 'Observações do analista',
    brief: 'Uma anotação livre do analista sobre a investigação.',
    fieldDefinitions: [{ id: 'text', label: 'Texto', type: 'string', required: false }],
  },
]

export function buildLibraryItems(knowledgeBase: KnowledgeBase): LibraryItem[] {
  const techniqueItems: LibraryItem[] = knowledgeBase.techniques.map((technique) => ({
    definitionId: technique.id,
    nodeType: technique.type,
    label: `${technique.id} - ${technique.name}`,
    category: 'MITRE ATT&CK',
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

  return [...techniqueItems, ...evidenceItems, ...GENERIC_ITEMS]
}
