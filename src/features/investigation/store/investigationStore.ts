import { create } from 'zustand'
import { generateId } from '../../../shared/utils/id'
import type {
  AnalyticStatus,
  CanvasNodeType,
  InvestigationEdge,
  InvestigationMeta,
  InvestigationNode,
  NodeState,
  RelationshipType,
} from '../../../shared/types/investigation'
import type {
  EvidenceFieldDefinition,
  KnowledgeBase,
  MitreTechnique,
  UseCaseDefinition,
} from '../../../shared/types/knowledge'
import type {
  CheckAnswerRecord,
  HypothesisResult,
  UseCaseSuggestion,
} from '../../../shared/types/correlation'
import type { Investigation } from '../../../shared/types/investigation'
import { getStoredLocale, localize, type Locale } from '../../../shared/i18n/types'
import { translate } from '../../../shared/i18n/translate'
import { nextGridPosition } from '../../../shared/utils/layout'

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export function combineEdges(
  inferredEdges: InvestigationEdge[],
  manualEdges: InvestigationEdge[],
): InvestigationEdge[] {
  const seen = new Set<string>()
  const combined: InvestigationEdge[] = []
  for (const edge of [...inferredEdges, ...manualEdges]) {
    if (seen.has(edge.id)) continue
    seen.add(edge.id)
    combined.push(edge)
  }
  return combined
}

function defaultFieldValue(field: EvidenceFieldDefinition): unknown {
  switch (field.type) {
    case 'string_array':
      return []
    case 'boolean':
      return false
    case 'number':
      return undefined
    default:
      return ''
  }
}

const AUTO_LINK_STORAGE_KEY = 'csocflow.autoLinkTactics'

function readStoredAutoLink(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(AUTO_LINK_STORAGE_KEY) === 'true'
}

function createMeta(): InvestigationMeta {
  const now = new Date().toISOString()
  return {
    id: generateId('investigation'),
    title: translate(getStoredLocale(), 'investigation.untitled'),
    caseId: '',
    createdAt: now,
    updatedAt: now,
    analyst: '',
    description: '',
    status: 'open',
    conclusion: null,
  }
}

interface InvestigationState {
  meta: InvestigationMeta
  viewport: Viewport
  nodes: InvestigationNode[]
  manualEdges: InvestigationEdge[]
  inferredEdges: InvestigationEdge[]
  selectedNodeId: string | null
  checkAnswers: CheckAnswerRecord[]
  hypothesisResults: HypothesisResult[]
  useCaseSuggestions: UseCaseSuggestion[]
  analystNotes: string
  autoLinkTactics: boolean

  addNode: (params: {
    nodeType: CanvasNodeType
    definitionId: string
    label: string
    position: { x: number; y: number }
    fieldDefinitions: EvidenceFieldDefinition[]
  }) => string
  addTechniqueWithTactics: (technique: MitreTechnique, knowledgeBase: KnowledgeBase) => string
  setAutoLinkTactics: (enabled: boolean) => void
  applyUseCase: (useCase: UseCaseDefinition, knowledgeBase: KnowledgeBase, locale: Locale) => void
  updateNodeFields: (nodeId: string, fields: Record<string, unknown>) => void
  updateNodeState: (nodeId: string, state: NodeState) => void
  updateNodeNotes: (nodeId: string, notes: string) => void
  setAnalyticStatus: (nodeId: string, analyticId: string, status: AnalyticStatus) => void
  moveNode: (nodeId: string, position: { x: number; y: number }) => void
  removeNode: (nodeId: string) => void
  duplicateNode: (nodeId: string) => string | undefined
  selectNode: (nodeId: string | null) => void
  addManualEdge: (
    source: string,
    target: string,
    type: RelationshipType,
    label?: string,
    sourceHandle?: string,
    targetHandle?: string,
  ) => void
  updateManualEdgeConnection: (
    edgeId: string,
    connection: { source: string; target: string; sourceHandle?: string; targetHandle?: string },
  ) => void
  updateEdgeLabel: (edgeId: string, label: string) => void
  updateManualEdgeType: (edgeId: string, type: RelationshipType) => void
  removeEdge: (edgeId: string) => void
  setViewport: (viewport: Viewport) => void
  recordCheckAnswer: (checkId: string, value: string) => void
  setMeta: (partial: Partial<InvestigationMeta>) => void
  setAnalystNotes: (notes: string) => void
  setInferredEdges: (edges: InvestigationEdge[]) => void
  setHypothesisResults: (results: HypothesisResult[]) => void
  setUseCaseSuggestions: (suggestions: UseCaseSuggestion[]) => void
  loadInvestigation: (doc: Investigation) => void
  toDocument: () => Investigation
  newInvestigation: () => void
  clearCanvas: () => void
}

const SCHEMA_VERSION = '1.0.0'
const APPLICATION_VERSION = '0.1.0'

export const useInvestigationStore = create<InvestigationState>((set, get) => ({
  meta: createMeta(),
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [],
  manualEdges: [],
  inferredEdges: [],
  selectedNodeId: null,
  checkAnswers: [],
  hypothesisResults: [],
  useCaseSuggestions: [],
  analystNotes: '',
  autoLinkTactics: readStoredAutoLink(),

  addNode: ({ nodeType, definitionId, label, position, fieldDefinitions }) => {
    const now = new Date().toISOString()
    const id = generateId('node')
    const fields: Record<string, unknown> = {}
    for (const field of fieldDefinitions) {
      fields[field.id] = defaultFieldValue(field)
    }
    const node: InvestigationNode = {
      id,
      definitionId,
      type: nodeType,
      label,
      state: 'unknown',
      position,
      fields,
      notes: '',
      createdAt: now,
      updatedAt: now,
    }
    set((state) => ({ nodes: [...state.nodes, node], selectedNodeId: id }))
    return id
  },

  // Drops the technique on the canvas together with any tactic it belongs to that
  // is not there yet. The edges between them are inferred by the correlation
  // engine, the same way use-case hubs link to their techniques.
  addTechniqueWithTactics: (technique, knowledgeBase) => {
    const techniqueNodeId = generateId('node')

    set((state) => {
      const now = new Date().toISOString()
      const nodes = [...state.nodes]

      nodes.push({
        id: techniqueNodeId,
        definitionId: technique.id,
        type: technique.type,
        label: `${technique.id} - ${technique.name}`,
        state: 'unknown',
        position: nextGridPosition(nodes.length),
        fields: {},
        notes: '',
        createdAt: now,
        updatedAt: now,
      })

      for (const tacticId of technique.tactics) {
        const alreadyPresent = nodes.some(
          (n) => n.type === 'mitre_tactic' && n.definitionId === tacticId,
        )
        if (alreadyPresent) continue

        const tactic = knowledgeBase.tactics.find((t) => t.id === tacticId)
        if (!tactic) continue

        nodes.push({
          id: generateId('node'),
          definitionId: tactic.id,
          type: 'mitre_tactic',
          label: `${tactic.id} - ${tactic.name}`,
          state: 'unknown',
          position: nextGridPosition(nodes.length),
          fields: {},
          notes: '',
          createdAt: now,
          updatedAt: now,
        })
      }

      return { nodes, selectedNodeId: techniqueNodeId }
    })

    return techniqueNodeId
  },

  setAutoLinkTactics: (enabled) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTO_LINK_STORAGE_KEY, String(enabled))
    }
    set({ autoLinkTactics: enabled })
  },

  applyUseCase: (useCase, knowledgeBase, locale) => {
    set((state) => {
      const now = new Date().toISOString()
      const nodes = [...state.nodes]

      let useCaseNode = nodes.find(
        (n) => n.type === 'detection_use_case' && n.definitionId === useCase.id,
      )
      if (!useCaseNode) {
        useCaseNode = {
          id: generateId('node'),
          definitionId: useCase.id,
          type: 'detection_use_case',
          label: localize(useCase.name, locale),
          state: 'unknown',
          position: nextGridPosition(nodes.length),
          fields: {},
          notes: '',
          createdAt: now,
          updatedAt: now,
        }
        nodes.push(useCaseNode)
      }

      for (const techniqueId of useCase.techniques) {
        const alreadyPresent = nodes.some(
          (n) =>
            (n.type === 'mitre_technique' || n.type === 'mitre_subtechnique') &&
            n.definitionId === techniqueId,
        )
        if (alreadyPresent) continue

        const techniqueDef = knowledgeBase.techniques.find((t) => t.id === techniqueId)
        if (!techniqueDef) continue

        nodes.push({
          id: generateId('node'),
          definitionId: techniqueDef.id,
          type: techniqueDef.type,
          label: `${techniqueDef.id} - ${techniqueDef.name}`,
          state: 'unknown',
          position: nextGridPosition(nodes.length),
          fields: {},
          notes: '',
          createdAt: now,
          updatedAt: now,
        })
      }

      return { nodes, selectedNodeId: useCaseNode.id }
    })
  },

  updateNodeFields: (nodeId, fields) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, fields: { ...n.fields, ...fields }, updatedAt: new Date().toISOString() }
          : n,
      ),
    }))
  },

  updateNodeState: (nodeId, nodeState) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, state: nodeState, updatedAt: new Date().toISOString() } : n,
      ),
    }))
  },

  updateNodeNotes: (nodeId, notes) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, notes, updatedAt: new Date().toISOString() } : n,
      ),
    }))
  },

  setAnalyticStatus: (nodeId, analyticId, status) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              analyticStatuses: { ...n.analyticStatuses, [analyticId]: status },
              updatedAt: new Date().toISOString(),
            }
          : n,
      ),
    }))
  },

  moveNode: (nodeId, position) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
    }))
  },

  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      manualEdges: state.manualEdges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      inferredEdges: state.inferredEdges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }))
  },

  duplicateNode: (nodeId) => {
    const original = get().nodes.find((n) => n.id === nodeId)
    if (!original) return undefined

    const now = new Date().toISOString()
    const copy: InvestigationNode = {
      ...original,
      id: generateId('node'),
      label: `${original.label} (cópia)`,
      position: { x: original.position.x + 30, y: original.position.y + 30 },
      fields: { ...original.fields },
      createdAt: now,
      updatedAt: now,
    }
    set((state) => ({ nodes: [...state.nodes, copy], selectedNodeId: copy.id }))
    return copy.id
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  addManualEdge: (source, target, type, label, sourceHandle, targetHandle) => {
    set((state) => ({
      manualEdges: [
        ...state.manualEdges,
        {
          id: generateId('edge'),
          source,
          target,
          sourceHandle,
          targetHandle,
          type,
          label,
          automatic: false,
        },
      ],
    }))
  },

  updateManualEdgeConnection: (edgeId, connection) => {
    set((state) => ({
      manualEdges: state.manualEdges.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              source: connection.source,
              target: connection.target,
              sourceHandle: connection.sourceHandle,
              targetHandle: connection.targetHandle,
            }
          : e,
      ),
    }))
  },

  updateEdgeLabel: (edgeId, label) => {
    set((state) => ({
      manualEdges: state.manualEdges.map((e) => (e.id === edgeId ? { ...e, label } : e)),
    }))
  },

  updateManualEdgeType: (edgeId, type) => {
    set((state) => ({
      manualEdges: state.manualEdges.map((e) => (e.id === edgeId ? { ...e, type } : e)),
    }))
  },

  removeEdge: (edgeId) => {
    set((state) => ({
      manualEdges: state.manualEdges.filter((e) => e.id !== edgeId),
    }))
  },

  setViewport: (viewport) => set({ viewport }),

  recordCheckAnswer: (checkId, value) => {
    set((state) => ({
      checkAnswers: [
        ...state.checkAnswers.filter((a) => a.checkId !== checkId),
        { checkId, value, answeredAt: new Date().toISOString() },
      ],
    }))
  },

  setMeta: (partial) => {
    set((state) => ({ meta: { ...state.meta, ...partial, updatedAt: new Date().toISOString() } }))
  },

  setAnalystNotes: (notes) => set({ analystNotes: notes }),

  setInferredEdges: (edges) => set({ inferredEdges: edges }),
  setHypothesisResults: (results) => set({ hypothesisResults: results }),
  setUseCaseSuggestions: (suggestions) => set({ useCaseSuggestions: suggestions }),

  loadInvestigation: (doc) => {
    set({
      meta: doc.investigation,
      viewport: doc.canvas.viewport,
      nodes: doc.canvas.nodes,
      manualEdges: doc.canvas.edges.filter((e) => !e.automatic),
      inferredEdges: doc.canvas.edges.filter((e) => e.automatic),
      selectedNodeId: null,
      checkAnswers: [],
      hypothesisResults: [],
      useCaseSuggestions: [],
      analystNotes: doc.report.analystNotes,
    })
  },

  toDocument: () => {
    const state = get()
    return {
      schemaVersion: SCHEMA_VERSION,
      applicationVersion: APPLICATION_VERSION,
      investigation: state.meta,
      canvas: {
        viewport: state.viewport,
        nodes: state.nodes,
        edges: combineEdges(state.inferredEdges, state.manualEdges),
      },
      hypotheses: state.hypothesisResults.map((h) => ({
        hypothesisId: h.hypothesisId,
        score: h.score,
      })),
      timeline: [],
      report: {
        analystNotes: state.analystNotes,
        recommendations: [],
      },
    }
  },

  newInvestigation: () => {
    set({
      meta: createMeta(),
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [],
      manualEdges: [],
      inferredEdges: [],
      selectedNodeId: null,
      checkAnswers: [],
      hypothesisResults: [],
      useCaseSuggestions: [],
      analystNotes: '',
    })
  },

  clearCanvas: () => {
    set({
      nodes: [],
      manualEdges: [],
      inferredEdges: [],
      selectedNodeId: null,
      hypothesisResults: [],
      useCaseSuggestions: [],
    })
  },
}))
