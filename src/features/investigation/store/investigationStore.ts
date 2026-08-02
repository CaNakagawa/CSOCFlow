import { create } from 'zustand'
import { generateId } from '../../../shared/utils/id'
import type {
  AnalyticStatus,
  CanvasNodeType,
  DrawingStroke,
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

/** A freehand stroke as a canvas element, with its points made relative. */
export function strokeToNode(stroke: DrawingStroke): InvestigationNode {
  const xs = stroke.points.map((p) => p.x)
  const ys = stroke.points.map((p) => p.y)
  // Half the stroke width sticks out past the points on each side.
  const pad = stroke.width
  const origin = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad }
  const now = new Date().toISOString()

  return {
    id: stroke.id,
    definitionId: 'free.drawing',
    type: 'drawing',
    label: '',
    state: 'unknown',
    position: origin,
    size: {
      width: Math.max(...xs) - origin.x + pad,
      height: Math.max(...ys) - origin.y + pad,
    },
    stroke: {
      points: stroke.points.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y })),
      color: stroke.color,
      width: stroke.width,
    },
    fields: {},
    notes: '',
    createdAt: now,
    updatedAt: now,
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
  /** Everything the marquee or a shift-click caught; drives the bulk actions. */
  selectedNodeIds: string[]
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
  expandSubtechniques: (nodeId: string, knowledgeBase: KnowledgeBase, locale: Locale) => number
  collapseSubtechniques: (nodeId: string) => number
  addFreeNode: (params: {
    nodeType: CanvasNodeType
    label: string
    position: { x: number; y: number }
    size?: { width: number; height: number }
  }) => string
  updateNodeLabel: (nodeId: string, label: string) => void
  resizeNode: (nodeId: string, size: { width: number; height: number }) => void
  /** Hands an element back to sizing itself around its contents. */
  clearNodeSize: (nodeIds: string[]) => void
  setSelectedNodes: (nodeIds: string[]) => void
  selectAllNodes: () => void
  copySelection: () => number
  pasteClipboard: () => number
  addStroke: (stroke: DrawingStroke) => void
  clearDrawings: () => void
  groupSelection: () => string | undefined
  /** Moves elements through the stack: to the very front or back, or one step. */
  restack: (nodeIds: string[], move: 'front' | 'back' | 'forward' | 'backward') => void
  ungroupNode: (nodeId: string) => number
  addImageNode: (params: {
    src: string
    position: { x: number; y: number }
    size: { width: number; height: number }
  }) => string
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

/** How far a pasted copy lands from its original. */
const PASTE_OFFSET = 40

/** Breathing room between a group's edge and what it holds. */
const GROUP_PADDING = 24
/** Room at the top of a group for its own title. */
const GROUP_HEADER = 28
/** Assumed size of an element React Flow has not measured yet. */
const GROUPED_NODE_FALLBACK_SIZE = { width: 200, height: 100 }

export const useInvestigationStore = create<InvestigationState>((set, get) => {
  // Transient bookkeeping for coalescing; never part of the saved document.
  let lastPush: { key: string; at: number } | null = null
  // The copy buffer lives outside the state: it is not part of the canvas.
  let clipboard: InvestigationNode[] = []

  /** Keeps the selection only if it survived the snapshot being restored. */
  function selectionWithin(snapshot: HistorySnapshot, selectedNodeId: string | null) {
    const present = new Set(snapshot.nodes.map((n) => n.id))
    const stillThere = selectedNodeId !== null && present.has(selectedNodeId)
    return {
      selectedNodeId: stillThere ? selectedNodeId : null,
      selectedNodeIds: get().selectedNodeIds.filter((id) => present.has(id)),
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
    selectedNodeIds: [],
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
      set((state) => ({ nodes: [...state.nodes, node], selectedNodeId: id, selectedNodeIds: [id] }))
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
            label: `${tactic.id} - ${localize(tactic.name, locale)}`,
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
            label: `${tactic.id} - ${localize(tactic.name, locale)}`,
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
        label: `${original.label}${translate(getStoredLocale(), 'details.duplicateSuffix')}`,
        position: { x: original.position.x + 30, y: original.position.y + 30 },
        fields: { ...original.fields },
        createdAt: now,
        updatedAt: now,
      }
      set((state) => ({ nodes: [...state.nodes, copy], selectedNodeId: copy.id }))
      return copy.id
    },

    /**
     * Brings in every subtechnique of a technique node and links each one to it.
     *
     * Subtechniques the analyst already placed are left alone and simply get the
     * parent connection, so running this twice adds nothing the second time.
     *
     * Returns how many subtechniques were added.
     */
    expandSubtechniques: (nodeId, knowledgeBase, locale) => {
      const state = get()
      const parent = state.nodes.find((n) => n.id === nodeId)
      if (!parent || parent.type !== 'mitre_technique') return 0

      const children = knowledgeBase.techniques.filter(
        (t) => parentTechniqueId(t.id) === parent.definitionId,
      )
      if (children.length === 0) return 0

      const present = new Set(state.nodes.filter(isTechniqueNode).map((n) => n.definitionId))
      const missing = children.filter((t) => !present.has(t.id))

      get().pushHistory()
      const now = new Date().toISOString()
      // Fan the new subtechniques out below their parent, matching the cascade.
      const added: InvestigationNode[] = missing.map((technique, index) => ({
        id: generateId('node'),
        definitionId: technique.id,
        type: technique.type,
        label: `${technique.id} - ${technique.name}`,
        state: 'unknown',
        position: {
          x: parent.position.x + (index - (missing.length - 1) / 2) * 220,
          y: parent.position.y + 160,
        },
        fields: {},
        notes: '',
        createdAt: now,
        updatedAt: now,
      }))

      set((current) => {
        const nodes = [...current.nodes, ...added]
        const existingEdgeIds = new Set(current.manualEdges.map((e) => e.id))
        const newEdges = buildSubtechniqueEdges(nodes, locale).filter(
          (edge) => !existingEdgeIds.has(edge.id),
        )
        return { nodes, manualEdges: [...current.manualEdges, ...newEdges] }
      })

      return added.length
    },

    /**
     * Sends the subtechniques brought in from a technique back where they came
     * from.
     *
     * Only the ones still hanging off this technique alone go: a subtechnique
     * the analyst wired into the rest of the investigation is evidence now, not
     * scaffolding, and stays.
     */
    collapseSubtechniques: (nodeId) => {
      const state = get()
      const parent = state.nodes.find((n) => n.id === nodeId)
      if (!parent) return 0

      const children = state.nodes.filter(
        (n) =>
          n.type === 'mitre_subtechnique' &&
          parentTechniqueId(n.definitionId) === parent.definitionId,
      )
      const removable = children.filter((child) =>
        state.manualEdges
          .concat(state.inferredEdges)
          .every(
            (edge) =>
              (edge.source !== child.id && edge.target !== child.id) ||
              edge.source === parent.id ||
              edge.target === parent.id,
          ),
      )
      if (removable.length === 0) return 0

      get().pushHistory()
      const removedIds = new Set(removable.map((n) => n.id))
      set((current) => ({
        nodes: current.nodes.filter((n) => !removedIds.has(n.id)),
        manualEdges: current.manualEdges.filter(
          (e) => !removedIds.has(e.source) && !removedIds.has(e.target),
        ),
        inferredEdges: current.inferredEdges.filter(
          (e) => !removedIds.has(e.source) && !removedIds.has(e.target),
        ),
        selectedNodeId:
          current.selectedNodeId && removedIds.has(current.selectedNodeId)
            ? null
            : current.selectedNodeId,
        selectedNodeIds: current.selectedNodeIds.filter((id) => !removedIds.has(id)),
      }))
      return removable.length
    },

    /** A node the analyst writes themselves: free text, or the whiteboard panel. */
    addFreeNode: ({ nodeType, label, position, size }) => {
      get().pushHistory()
      const now = new Date().toISOString()
      const id = generateId('node')
      const node: InvestigationNode = {
        id,
        definitionId: `free.${nodeType}`,
        type: nodeType,
        label,
        state: 'unknown',
        position,
        size,
        fields: {},
        notes: '',
        createdAt: now,
        updatedAt: now,
      }
      set((state) => ({ nodes: [...state.nodes, node], selectedNodeId: id, selectedNodeIds: [id] }))
      return id
    },

    updateNodeLabel: (nodeId, label) => {
      // Typing is one undo step per burst, not one per character.
      get().pushHistory(`label:${nodeId}`)
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, label, updatedAt: new Date().toISOString() } : n,
        ),
      }))
    },

    resizeNode: (nodeId, size) => {
      get().pushHistory(`resize:${nodeId}`)
      const now = new Date().toISOString()
      set((state) => ({
        nodes: state.nodes.map((node) => {
          if (node.id !== nodeId) return node
          if (!node.stroke || !node.size) return { ...node, size, updatedAt: now }

          // A stroke is its drawing: stretching the box has to stretch the line.
          const scaleX = size.width / node.size.width
          const scaleY = size.height / node.size.height
          return {
            ...node,
            size,
            stroke: {
              ...node.stroke,
              points: node.stroke.points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY })),
            },
            updatedAt: now,
          }
        }),
      }))
    },

    clearNodeSize: (nodeIds) => {
      const targets = new Set(nodeIds)
      // A drawing has no content to fit itself around, so its box stays.
      const resizable = get().nodes.filter((n) => targets.has(n.id) && n.size && !n.stroke)
      if (resizable.length === 0) return

      get().pushHistory()
      const affected = new Set(resizable.map((n) => n.id))
      const now = new Date().toISOString()
      set((state) => ({
        nodes: state.nodes.map((n) =>
          affected.has(n.id) ? { ...n, size: undefined, updatedAt: now } : n,
        ),
      }))
    },

    setSelectedNodes: (nodeIds) =>
      set((state) => ({
        selectedNodeIds: nodeIds,
        // The details panel follows the last thing picked, and only shows
        // something when a single node is in play.
        selectedNodeId: nodeIds.length === 1 ? nodeIds[0] : null,
        selectedAnalytic:
          nodeIds.length === 1 && state.selectedAnalytic?.nodeId === nodeIds[0]
            ? state.selectedAnalytic
            : null,
      })),

    selectAllNodes: () => {
      const ids = get().nodes.map((n) => n.id)
      set({ selectedNodeIds: ids, selectedNodeId: ids.length === 1 ? ids[0] : null })
    },

    copySelection: () => {
      const state = get()
      const ids = new Set(state.selectedNodeIds)
      clipboard = state.nodes.filter((n) => ids.has(n.id))
      return clipboard.length
    },

    pasteClipboard: () => {
      if (clipboard.length === 0) return 0
      get().pushHistory()
      const now = new Date().toISOString()
      const copies = clipboard.map((node) => ({
        ...node,
        id: generateId('node'),
        position: { x: node.position.x + PASTE_OFFSET, y: node.position.y + PASTE_OFFSET },
        fields: { ...node.fields },
        createdAt: now,
        updatedAt: now,
      }))
      set((state) => ({
        nodes: [...state.nodes, ...copies],
        selectedNodeIds: copies.map((n) => n.id),
        selectedNodeId: copies.length === 1 ? copies[0].id : null,
      }))
      // Pasting again lands beside the copies rather than on top of them.
      clipboard = copies
      return copies.length
    },

    /**
     * Commits a freehand stroke as a node of its own.
     *
     * Everything the canvas already knows how to do — select, move, delete,
     * undo, group, export — then applies to a drawing for free, which is why
     * the points are stored relative to the node's own box.
     */
    addStroke: (stroke) => {
      if (stroke.points.length === 0) return
      get().pushHistory()
      set((state) => ({ nodes: [...state.nodes, strokeToNode(stroke)] }))
    },

    clearDrawings: () => {
      const strokes = get().nodes.filter((n) => n.type === 'drawing')
      if (strokes.length === 0) return
      get().pushHistory()
      const ids = new Set(strokes.map((n) => n.id))
      set((state) => ({
        nodes: state.nodes.filter((n) => !ids.has(n.id)),
        selectedNodeIds: state.selectedNodeIds.filter((id) => !ids.has(id)),
      }))
    },

    restack: (nodeIds, move) => {
      if (nodeIds.length === 0) return
      const state = get()
      const moving = new Set(nodeIds)
      const layers = state.nodes.map((n) => n.layer ?? 0)
      const top = Math.max(0, ...layers)
      const bottom = Math.min(0, ...layers)

      get().pushHistory()
      const now = new Date().toISOString()
      set((current) => ({
        nodes: current.nodes.map((node) => {
          if (!moving.has(node.id)) return node
          const layer = node.layer ?? 0
          const next =
            move === 'front'
              ? top + 1
              : move === 'back'
                ? bottom - 1
                : move === 'forward'
                  ? layer + 1
                  : layer - 1
          return { ...node, layer: next, updatedAt: now }
        }),
      }))
    },

    /**
     * Wraps the selection in a container that carries it around.
     *
     * The children keep their look and their own selection; only their
     * positions become relative to the group, which is what React Flow needs to
     * move them together.
     */
    groupSelection: () => {
      const state = get()
      const selected = state.nodes.filter(
        (n) => state.selectedNodeIds.includes(n.id) && !n.parentId,
      )
      if (selected.length < 2) return undefined

      const sizeOf = (node: InvestigationNode) => node.size ?? GROUPED_NODE_FALLBACK_SIZE
      const left = Math.min(...selected.map((n) => n.position.x)) - GROUP_PADDING
      const top = Math.min(...selected.map((n) => n.position.y)) - GROUP_PADDING - GROUP_HEADER
      const right = Math.max(...selected.map((n) => n.position.x + sizeOf(n).width)) + GROUP_PADDING
      const bottom =
        Math.max(...selected.map((n) => n.position.y + sizeOf(n).height)) + GROUP_PADDING

      get().pushHistory()
      const now = new Date().toISOString()
      const groupId = generateId('node')
      const group: InvestigationNode = {
        id: groupId,
        definitionId: 'free.group',
        type: 'group',
        label: '',
        state: 'unknown',
        position: { x: left, y: top },
        size: { width: right - left, height: bottom - top },
        fields: {},
        notes: '',
        createdAt: now,
        updatedAt: now,
      }

      const members = new Set(selected.map((n) => n.id))
      set((current) => ({
        // The group is listed first: React Flow needs a parent before its child.
        nodes: [
          ...current.nodes.filter((n) => !members.has(n.id)),
          group,
          ...current.nodes
            .filter((n) => members.has(n.id))
            .map((n) => ({
              ...n,
              parentId: groupId,
              position: { x: n.position.x - left, y: n.position.y - top },
              updatedAt: now,
            })),
        ],
        selectedNodeId: groupId,
        selectedNodeIds: [groupId],
      }))
      return groupId
    },

    /** Releases a group, leaving its contents where they sit. */
    ungroupNode: (nodeId) => {
      const state = get()
      const group = state.nodes.find((n) => n.id === nodeId && n.type === 'group')
      if (!group) return 0

      const children = state.nodes.filter((n) => n.parentId === nodeId)
      get().pushHistory()
      const now = new Date().toISOString()
      set((current) => ({
        nodes: current.nodes
          .filter((n) => n.id !== nodeId)
          .map((n) =>
            n.parentId === nodeId
              ? {
                  ...n,
                  parentId: undefined,
                  position: {
                    x: n.position.x + group.position.x,
                    y: n.position.y + group.position.y,
                  },
                  updatedAt: now,
                }
              : n,
          ),
        selectedNodeId: null,
        selectedNodeIds: children.map((n) => n.id),
      }))
      return children.length
    },

    addImageNode: ({ src, position, size }) => {
      get().pushHistory()
      const now = new Date().toISOString()
      const id = generateId('node')
      const node: InvestigationNode = {
        id,
        definitionId: 'free.image',
        type: 'image',
        label: '',
        state: 'unknown',
        position,
        size,
        imageSrc: src,
        fields: {},
        notes: '',
        createdAt: now,
        updatedAt: now,
      }
      set((state) => ({ nodes: [...state.nodes, node], selectedNodeId: id, selectedNodeIds: [id] }))
      return id
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
        selectedNodeIds: nodeId ? [nodeId] : [],
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
        // Investigations saved before strokes were elements carry them apart.
        nodes: [...doc.canvas.nodes, ...(doc.canvas.drawings ?? []).map(strokeToNode)],
        manualEdges: doc.canvas.edges.filter((e) => !e.automatic),
        inferredEdges: doc.canvas.edges.filter((e) => e.automatic),
        selectedNodeId: null,
        selectedNodeIds: [],
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
        selectedNodeIds: [],
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
        selectedNodeIds: [],
        selectedAnalytic: null,
        hypothesisResults: [],
        useCaseSuggestions: [],
      })
    },
  }
})
