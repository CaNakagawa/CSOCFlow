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
import {
  buildSubtechniqueEdges,
  parentTechniqueId,
} from '../../correlation/engine/buildSubtechniqueEdges'
import { buildTacticChainEdges } from '../../correlation/engine/buildTacticChainEdges'
import { layoutLikeMitre } from '../../canvas/utils/mitreLayout'
import { OPPOSITE_HANDLE, findNearestNodeInDirection } from '../../canvas/utils/nearestNode'
import type { HandleId } from '../../../shared/types/handles'
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

function isTechniqueNode(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
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
  past: HistorySnapshot[]
  future: HistorySnapshot[]

  /**
   * Records the canvas before a mutation so it can be undone.
   *
   * `coalesceKey` folds a burst of related changes into one undo step:
   * keystrokes in a notes field, or React Flow reporting a multi-node delete as
   * one change per node.
   */
  pushHistory: (coalesceKey?: string) => void
  undo: () => void
  redo: () => void

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
  toggleAnalyticsExpanded: (nodeId: string) => void
  selectAnalytic: (nodeId: string, analyticId: string) => void
  selectedAnalytic: { nodeId: string; analyticId: string } | null
  moveNode: (nodeId: string, position: { x: number; y: number }) => void
  removeNode: (nodeId: string) => void
  duplicateNode: (nodeId: string) => string | undefined
  linkToNearest: (nodeId: string, handle: HandleId) => boolean
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

/** How many steps back the analyst can go. */
const HISTORY_LIMIT = 50
/** Changes sharing a coalesce key within this window collapse into one step. */
const COALESCE_MS = 700

interface HistorySnapshot {
  nodes: InvestigationNode[]
  manualEdges: InvestigationEdge[]
}

export const useInvestigationStore = create<InvestigationState>((set, get) => {
  // Transient bookkeeping for coalescing; never part of the saved document.
  let lastPush: { key: string; at: number } | null = null

  /** Keeps the selection only if it survived the snapshot being restored. */
  function selectionWithin(snapshot: HistorySnapshot, selectedNodeId: string | null) {
    const stillThere =
      selectedNodeId !== null && snapshot.nodes.some((n) => n.id === selectedNodeId)
    return {
      selectedNodeId: stillThere ? selectedNodeId : null,
      selectedAnalytic: null,
    }
  }

  return {
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
    selectedAnalytic: null,
    past: [],
    future: [],

    pushHistory: (coalesceKey) => {
      const now = Date.now()
      if (
        coalesceKey &&
        lastPush &&
        lastPush.key === coalesceKey &&
        now - lastPush.at < COALESCE_MS
      ) {
        // Same burst: extend the window but keep the single entry already taken.
        lastPush = { key: coalesceKey, at: now }
        return
      }
      lastPush = coalesceKey ? { key: coalesceKey, at: now } : null

      set((state) => ({
        past: [...state.past, { nodes: state.nodes, manualEdges: state.manualEdges }].slice(
          -HISTORY_LIMIT,
        ),
        // A fresh edit invalidates anything that was undone.
        future: [],
      }))
    },

    undo: () => {
      const state = get()
      const previous = state.past[state.past.length - 1]
      if (!previous) return
      lastPush = null

      set({
        nodes: previous.nodes,
        manualEdges: previous.manualEdges,
        past: state.past.slice(0, -1),
        future: [{ nodes: state.nodes, manualEdges: state.manualEdges }, ...state.future].slice(
          0,
          HISTORY_LIMIT,
        ),
        ...selectionWithin(previous, state.selectedNodeId),
      })
    },

    redo: () => {
      const state = get()
      const next = state.future[0]
      if (!next) return
      lastPush = null

      set({
        nodes: next.nodes,
        manualEdges: next.manualEdges,
        past: [...state.past, { nodes: state.nodes, manualEdges: state.manualEdges }].slice(
          -HISTORY_LIMIT,
        ),
        future: state.future.slice(1),
        ...selectionWithin(next, state.selectedNodeId),
      })
    },

    addNode: ({ nodeType, definitionId, label, position, fieldDefinitions }) => {
      get().pushHistory()
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
      get().pushHistory()
      let created = 0

      set((state) => {
        const techniquesById = new Map(knowledgeBase.techniques.map((t) => [t.id, t]))
        const now = new Date().toISOString()
        const nodes = [...state.nodes]

        // A subtechnique without its parent is incomplete ATT&CK context, so the
        // parent comes along and its own tactics are then pulled in below.
        const presentTechniques = new Set(nodes.filter(isTechniqueNode).map((n) => n.definitionId))
        const missingParents = new Set<string>()
        for (const definitionId of presentTechniques) {
          const parentId = parentTechniqueId(definitionId)
          if (parentId && !presentTechniques.has(parentId)) missingParents.add(parentId)
        }
        for (const parentId of [...missingParents].sort()) {
          const parent = techniquesById.get(parentId)
          if (!parent) continue
          nodes.push({
            id: generateId('node'),
            definitionId: parent.id,
            type: parent.type,
            label: `${parent.id} - ${parent.name}`,
            state: 'unknown',
            position: nextGridPosition(nodes.length),
            fields: {},
            notes: '',
            createdAt: now,
            updatedAt: now,
          })
        }

        const presentTactics = new Set(
          nodes.filter((n) => n.type === 'mitre_tactic').map((n) => n.definitionId),
        )
        const missingTactics = new Set<string>()
        for (const node of nodes) {
          if (!isTechniqueNode(node)) continue
          const definition = techniquesById.get(node.definitionId)
          if (!definition) continue
          for (const tacticId of definition.tactics) {
            if (!presentTactics.has(tacticId)) missingTactics.add(tacticId)
          }
        }

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
        const newEdges = [
          ...buildTacticChainEdges(nodes, knowledgeBase.tactics),
          ...buildTechniqueTacticEdges(nodes, knowledgeBase.techniques, locale),
          ...buildSubtechniqueEdges(nodes, locale),
        ].filter((edge) => !existingEdgeIds.has(edge.id))
        created = newEdges.length

        if (nodes.length === state.nodes.length && newEdges.length === 0) return {}

        // Arrange into the cascade so the new connectors read as a chain rather
        // than crossing a grid of tiled nodes.
        const positions = layoutLikeMitre(nodes, knowledgeBase.tactics, knowledgeBase.techniques)
        const positioned = nodes.map((node) => {
          const position = positions.get(node.id)
          return position ? { ...node, position } : node
        })

        return { nodes: positioned, manualEdges: [...state.manualEdges, ...newEdges] }
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
      get().pushHistory()
      let addedTactics = 0

      set((state) => {
        const now = new Date().toISOString()
        const nodes = [...state.nodes]

        for (const tactic of knowledgeBase.tactics) {
          const present = nodes.some(
            (n) => n.type === 'mitre_tactic' && n.definitionId === tactic.id,
          )
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

        const existingEdgeIds = new Set(state.manualEdges.map((e) => e.id))
        const newEdges = [
          ...buildTacticChainEdges(positioned, knowledgeBase.tactics),
          ...buildTechniqueTacticEdges(positioned, knowledgeBase.techniques, locale),
          ...buildSubtechniqueEdges(positioned, locale),
        ].filter((edge) => !existingEdgeIds.has(edge.id))

        return {
          nodes: positioned,
          manualEdges: [...state.manualEdges, ...newEdges],
        }
      })

      return addedTactics
    },

    applyUseCase: (useCase, knowledgeBase, locale) => {
      get().pushHistory()
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
      get().pushHistory('fields')
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, fields: { ...n.fields, ...fields }, updatedAt: new Date().toISOString() }
            : n,
        ),
      }))
    },

    updateNodeState: (nodeId, nodeState) => {
      get().pushHistory()
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, state: nodeState, updatedAt: new Date().toISOString() } : n,
        ),
      }))
    },

    updateNodeNotes: (nodeId, notes) => {
      get().pushHistory('notes')
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, notes, updatedAt: new Date().toISOString() } : n,
        ),
      }))
    },

    setAnalyticStatus: (nodeId, analyticId, status) => {
      get().pushHistory()
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

    // Expands or collapses all of a technique's analytics at once.
    toggleAnalyticsExpanded: (nodeId) => {
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, analyticsExpanded: !n.analyticsExpanded } : n,
        ),
      }))
    },

    selectAnalytic: (nodeId, analyticId) => {
      set((state) => ({
        selectedNodeId: nodeId,
        selectedAnalytic:
          state.selectedAnalytic?.nodeId === nodeId &&
          state.selectedAnalytic?.analyticId === analyticId
            ? null
            : { nodeId, analyticId },
      }))
    },

    moveNode: (nodeId, position) => {
      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
      }))
    },

    removeNode: (nodeId) => {
      get().pushHistory('remove')
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        manualEdges: state.manualEdges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        inferredEdges: state.inferredEdges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        ),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      }))
    },

    duplicateNode: (nodeId) => {
      const original = get().nodes.find((n) => n.id === nodeId)
      if (!original) return undefined
      get().pushHistory()

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

    /**
     * Connects a node's connection point to whatever sits nearest on that side.
     *
     * Returns false when there is nothing that way, or when the two are already
     * connected, so the caller can tell the analyst nothing happened.
     */
    linkToNearest: (nodeId, handle) => {
      const state = get()
      const target = findNearestNodeInDirection(state.nodes, nodeId, handle)
      if (!target) return false

      const alreadyLinked = state.manualEdges.some(
        (e) =>
          (e.source === nodeId && e.target === target.id) ||
          (e.source === target.id && e.target === nodeId),
      )
      if (alreadyLinked) return false

      get().addManualEdge(
        nodeId,
        target.id,
        'associated_with',
        undefined,
        handle,
        OPPOSITE_HANDLE[handle],
      )
      return true
    },

    selectNode: (nodeId) =>
      set((state) => ({
        selectedNodeId: nodeId,
        // A different node's analytic must not stay selected in the details panel.
        selectedAnalytic: state.selectedAnalytic?.nodeId === nodeId ? state.selectedAnalytic : null,
      })),

    addManualEdge: (source, target, type, label, sourceHandle, targetHandle) => {
      get().pushHistory()
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
      get().pushHistory()
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
      get().pushHistory('edgeLabel')
      set((state) => ({
        manualEdges: state.manualEdges.map((e) => (e.id === edgeId ? { ...e, label } : e)),
      }))
    },

    updateManualEdgeType: (edgeId, type) => {
      get().pushHistory()
      set((state) => ({
        manualEdges: state.manualEdges.map((e) => (e.id === edgeId ? { ...e, type } : e)),
      }))
    },

    updateEdgeStyle: (edgeId, style) => {
      get().pushHistory('edgeStyle')
      set((state) => ({
        manualEdges: state.manualEdges.map((e) => (e.id === edgeId ? { ...e, ...style } : e)),
      }))
    },

    removeEdge: (edgeId) => {
      get().pushHistory('remove')
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
      // Opening a different investigation starts a fresh history.
      set({ past: [], future: [] })
      set({
        meta: doc.investigation,
        viewport: doc.canvas.viewport,
        nodes: doc.canvas.nodes,
        manualEdges: doc.canvas.edges.filter((e) => !e.automatic),
        inferredEdges: doc.canvas.edges.filter((e) => e.automatic),
        selectedNodeId: null,
        selectedAnalytic: null,
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
        past: [],
        future: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: [],
        manualEdges: [],
        inferredEdges: [],
        selectedNodeId: null,
        selectedAnalytic: null,
        checkAnswers: [],
        hypothesisResults: [],
        useCaseSuggestions: [],
        analystNotes: '',
      })
    },

    clearCanvas: () => {
      get().pushHistory()
      set({
        nodes: [],
        manualEdges: [],
        inferredEdges: [],
        selectedNodeId: null,
        selectedAnalytic: null,
        hypothesisResults: [],
        useCaseSuggestions: [],
      })
    },
  }
})
