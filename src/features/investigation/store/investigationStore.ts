import { create } from 'zustand'
import { generateId } from '../../../shared/utils/id'
import type {
  AnalyticStatus,
  CanvasNodeType,
  EdgeLineStyle,
  InvestigationEdge,
  InvestigationMeta,
  InvestigationNode,
  NodeState,
  RelationshipType,
} from '../../../shared/types/investigation'
import { buildTechniqueTacticEdges } from '../../correlation/engine/buildTechniqueTacticEdges'
import { layoutLikeMitre } from '../../canvas/utils/mitreLayout'
import { sortTacticIds } from '../../../shared/utils/tacticOrder'
import type {
  EvidenceFieldDefinition,
  KnowledgeBase,
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

  addNode: (params: {
    nodeType: CanvasNodeType
    definitionId: string
    label: string
    position: { x: number; y: number }
    fieldDefinitions: EvidenceFieldDefinition[]
  }) => string
  runAutoLink: (knowledgeBase: KnowledgeBase, locale: Locale) => number
  organizeLikeMitre: (knowledgeBase: KnowledgeBase, locale: Locale) => number
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
  updateEdgeStyle: (edgeId: string, style: { color?: string; lineStyle?: EdgeLineStyle }) => void
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

  /**
   * One-shot correlation: brings every tactic that the techniques on the canvas
   * belong to, then connects them. Purely additive — existing nodes, positions,
   * connections and styling are left untouched, and connections it already
   * created are not duplicated on a second run.
   *
   * Returns how many new connections were made so the UI can report the result.
   */
  runAutoLink: (knowledgeBase, locale) => {
    let created = 0

    set((state) => {
      const techniquesById = new Map(knowledgeBase.techniques.map((t) => [t.id, t]))
      const presentTactics = new Set(
        state.nodes.filter((n) => n.type === 'mitre_tactic').map((n) => n.definitionId),
      )

      const missingTactics = new Set<string>()
      for (const node of state.nodes) {
        if (node.type !== 'mitre_technique' && node.type !== 'mitre_subtechnique') continue
        const definition = techniquesById.get(node.definitionId)
        if (!definition) continue
        for (const tacticId of definition.tactics) {
          if (!presentTactics.has(tacticId)) missingTactics.add(tacticId)
        }
      }

      const now = new Date().toISOString()
      const nodes = [...state.nodes]
      // Aggregating across several techniques interleaves the set, so re-sort to
      // drop the tactics onto the canvas in matrix order.
      for (const tacticId of sortTacticIds([...missingTactics], knowledgeBase.tactics)) {
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

      const existingEdgeIds = new Set(state.manualEdges.map((e) => e.id))
      const newEdges = buildTechniqueTacticEdges(nodes, knowledgeBase.techniques, locale).filter(
        (edge) => !existingEdgeIds.has(edge.id),
      )
      created = newEdges.length

      if (nodes.length === state.nodes.length && newEdges.length === 0) return {}
      return { nodes, manualEdges: [...state.manualEdges, ...newEdges] }
    })

    return created
  },

  /**
   * Lays the canvas out like the ATT&CK matrix: every tactic becomes a faded
   * scaffold node in a horizontal header row, and the analyst's own techniques
   * are stacked in the column of the tactic they belong to and linked upward.
   *
   * Only techniques already on the canvas take part — the matrix frame is
   * scaffolding, not a dump of all 697 techniques. Nothing is removed; existing
   * nodes are repositioned and existing connections are kept.
   *
   * Returns how many tactic scaffolds were added.
   */
  organizeLikeMitre: (knowledgeBase, locale) => {
    let addedTactics = 0

    set((state) => {
      const now = new Date().toISOString()
      const nodes = [...state.nodes]

      for (const tactic of knowledgeBase.tactics) {
        const present = nodes.some((n) => n.type === 'mitre_tactic' && n.definitionId === tactic.id)
        if (present) continue
        nodes.push({
          id: generateId('node'),
          definitionId: tactic.id,
          type: 'mitre_tactic',
          label: `${tactic.id} - ${tactic.name}`,
          state: 'unknown',
          position: { x: 0, y: 0 },
          fields: {},
          notes: '',
          scaffold: true,
          createdAt: now,
          updatedAt: now,
        })
        addedTactics += 1
      }

      const positions = layoutLikeMitre(nodes, knowledgeBase.tactics, knowledgeBase.techniques)
      const positioned = nodes.map((node) => {
        const position = positions.get(node.id)
        return position ? { ...node, position } : node
      })

      // Techniques sit under their tactic here, so the connection leaves the
      // technique's top edge instead of its right edge.
      const existingEdgeIds = new Set(state.manualEdges.map((e) => e.id))
      const newEdges = buildTechniqueTacticEdges(positioned, knowledgeBase.techniques, locale, {
        source: 'top',
        target: 'bottom',
      }).filter((edge) => !existingEdgeIds.has(edge.id))

      return {
        nodes: positioned,
        manualEdges: [...state.manualEdges, ...newEdges],
      }
    })

    return addedTactics
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

  updateEdgeStyle: (edgeId, style) => {
    set((state) => ({
      manualEdges: state.manualEdges.map((e) => (e.id === edgeId ? { ...e, ...style } : e)),
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
