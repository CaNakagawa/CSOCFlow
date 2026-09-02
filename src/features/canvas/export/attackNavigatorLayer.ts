import { nodeSignal } from '../utils/nodeSignal'
import type { Investigation, InvestigationNode } from '../../../shared/types/investigation'
import type { KnowledgeBase } from '../../../shared/types/knowledge'

/**
 * A layer file for the MITRE ATT&CK Navigator, in layer format 4.5.
 *
 * Only the fields the Navigator actually reads are written. Anything it treats
 * as optional is left out rather than filled with a default, so a diff between
 * two exports shows what the analyst changed and nothing else.
 */
export interface NavigatorLayer {
  name: string
  versions: { attack: string; navigator: string; layer: string }
  domain: 'enterprise-attack'
  description: string
  techniques: NavigatorTechnique[]
  gradient: { colors: string[]; minValue: number; maxValue: number }
  legendItems: { label: string; color: string }[]
  layout: {
    layout: 'side'
    showID: boolean
    showName: boolean
    showAggregateScores: boolean
    countUnscored: boolean
  }
  hideDisabled: boolean
  selectTechniquesAcrossTactics: boolean
  selectSubtechniquesWithParent: boolean
}

export interface NavigatorTechnique {
  techniqueID: string
  /** The tactic column, by MITRE's shortname — "credential-access", not TA0006. */
  tactic?: string
  score: number
  color?: string
  comment?: string
  enabled: boolean
  showSubtechniques?: boolean
}

/** The layer format this file is written to, and the Navigator that reads it. */
const LAYER_FORMAT = '4.5'
const NAVIGATOR_VERSION = '5.1.0'

/*
 * The canvas ramp, as the Navigator's three-stop gradient: cleared through to
 * confirmed. An analyst who reads the board by colour should read the layer the
 * same way.
 */
const GRADIENT = ['#8ec843', '#ffe766', '#ff6666']

const LEGEND: { label: string; color: string }[] = [
  { label: 'Ruled out', color: '#8ec843' },
  { label: 'Observed / suspicious', color: '#ffe766' },
  { label: 'Confirmed malicious', color: '#ff6666' },
]

function isTechnique(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
}

/**
 * The score the Navigator paints with, 0 to 100.
 *
 * It is the same reading the canvas colours a card by, multiplied out: an
 * element the analyst confirmed is 100, one they ruled out is 0.
 */
export function navigatorScore(node: InvestigationNode): number {
  return Math.round(nodeSignal(node.state, node.analyticStatuses ?? {}) * 100)
}

/** The analyst's own words about this element, if they wrote any. */
function comment(node: InvestigationNode): string | undefined {
  const notes = node.notes?.trim()
  return notes && notes.length > 0 ? notes : undefined
}

export interface NavigatorLayerOptions {
  /** Names the layer; falls back to the investigation's own title. */
  name?: string
}

/**
 * Turns an investigation into a layer the ATT&CK Navigator can open.
 *
 * Only MITRE techniques and subtechniques cross over — evidence, notes and
 * drawings have no place in the matrix. A technique that belongs to several
 * tactics is written once per tactic, because that is how the Navigator
 * addresses the cells, and a technique the analyst put on the canvas twice is
 * written once, keeping whichever copy says the most.
 */
export function toNavigatorLayer(
  document: Investigation,
  knowledgeBase: KnowledgeBase,
  options: NavigatorLayerOptions = {},
): NavigatorLayer {
  const shortNameOf = new Map(knowledgeBase.tactics.map((tactic) => [tactic.id, tactic.shortName]))
  const tacticsOf = new Map(knowledgeBase.techniques.map((t) => [t.id, t.tactics]))

  /* Keyed by cell — technique in a tactic — so two cards on one technique meet. */
  const cells = new Map<string, NavigatorTechnique>()

  for (const node of document.canvas.nodes) {
    if (!isTechnique(node)) continue

    const score = navigatorScore(node)
    const tactics = tacticsOf.get(node.definitionId) ?? []
    const columns = tactics.length > 0 ? tactics.map((id) => shortNameOf.get(id)) : [undefined]

    for (const tactic of columns) {
      const key = `${node.definitionId}|${tactic ?? ''}`
      const existing = cells.get(key)
      // The louder card wins the cell, and its comment comes with it.
      if (existing && existing.score >= score) continue

      cells.set(key, {
        techniqueID: node.definitionId,
        ...(tactic ? { tactic } : {}),
        score,
        ...(node.color ? { color: node.color } : {}),
        ...(comment(node) ? { comment: comment(node) } : {}),
        enabled: true,
      })
    }
  }

  const meta = document.investigation

  return {
    name: options.name?.trim() || meta.title || 'CSOC Flow',
    versions: {
      // The Navigator matches on the major release alone.
      attack: knowledgeBase.attackVersion.split('.')[0],
      navigator: NAVIGATOR_VERSION,
      layer: LAYER_FORMAT,
    },
    domain: 'enterprise-attack',
    description: [meta.description?.trim(), `Exported from CSOC Flow — case ${meta.caseId || '—'}.`]
      .filter(Boolean)
      .join(' '),
    techniques: [...cells.values()].sort(
      (a, b) =>
        a.techniqueID.localeCompare(b.techniqueID, 'en', { numeric: true }) ||
        (a.tactic ?? '').localeCompare(b.tactic ?? ''),
    ),
    gradient: { colors: GRADIENT, minValue: 0, maxValue: 100 },
    legendItems: LEGEND,
    layout: {
      layout: 'side',
      showID: true,
      showName: true,
      showAggregateScores: false,
      countUnscored: false,
    },
    hideDisabled: false,
    selectTechniquesAcrossTactics: false,
    selectSubtechniquesWithParent: false,
  }
}
