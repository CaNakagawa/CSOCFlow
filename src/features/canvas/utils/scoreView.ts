import type { InvestigationNode } from '../../../shared/types/investigation'

/**
 * How the scored techniques of an imported ATT&CK Navigator layer are looked
 * at: which scores to show, and in what order. The numbers are the layer's
 * own — a count of how many threat actors use a technique, say — and nothing
 * here reads them as a verdict.
 */
export type ScoreOrder = 'technique' | 'score'
export type ScoreDirection = 'asc' | 'desc'
/** How close together the cards are packed when the canvas is arranged. */
export type ScoreSpacing = 'normal' | 'compact' | 'tight'

export interface ScoreView {
  /** Lowest score to show; null for no lower limit. */
  min: number | null
  /** Highest score to show; null for no upper limit. */
  max: number | null
  /** The matrix order of technique ids, or the score. */
  order: ScoreOrder
  direction: ScoreDirection
  /** Whether the cards outside the range leave the canvas, or only the list narrows. */
  hideOutside: boolean
  /** How tightly the canvas packs the cards when it is arranged. */
  spacing: ScoreSpacing
}

export const DEFAULT_SCORE_VIEW: ScoreView = {
  min: null,
  max: null,
  order: 'technique',
  direction: 'asc',
  hideOutside: true,
  spacing: 'normal',
}

export function isTechniqueNode(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
}

/** Whether the view narrows anything at all. */
export function hasScoreRange(view: ScoreView): boolean {
  return view.min !== null || view.max !== null
}

/** True when a score falls inside the range the view asks for. */
export function inScoreRange(score: number, view: ScoreView): boolean {
  return (view.min === null || score >= view.min) && (view.max === null || score <= view.max)
}

/**
 * Whether a card is taken off the canvas by the view. Only techniques that
 * came with a score are ever hidden: a card the analyst added by hand has
 * nothing to compare, and disappearing would be a surprise.
 */
export function isHiddenByScore(node: InvestigationNode, view: ScoreView): boolean {
  if (!view.hideOutside || !hasScoreRange(view)) return false
  if (!isTechniqueNode(node) || node.navigatorScore === undefined) return false
  return !inScoreRange(node.navigatorScore, view)
}

/** Compares two technique ids the way MITRE numbers them: T1059 before T1059.001 before T1060. */
export function compareTechniqueIds(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true })
}

/**
 * Orders cards for a list or a column. Scored cards come first in the
 * requested direction; cards without a score always go last. Ties keep the
 * matrix order, so a score order is stable and readable.
 */
export function sortByScoreView(
  nodes: InvestigationNode[],
  view: Pick<ScoreView, 'order' | 'direction'>,
): InvestigationNode[] {
  const sign = view.direction === 'asc' ? 1 : -1
  return [...nodes].sort((a, b) => {
    if (view.order === 'score') {
      const sa = a.navigatorScore
      const sb = b.navigatorScore
      if (sa === undefined && sb !== undefined) return 1
      if (sa !== undefined && sb === undefined) return -1
      if (sa !== undefined && sb !== undefined && sa !== sb) return (sa - sb) * sign
      return compareTechniqueIds(a.definitionId, b.definitionId)
    }
    return compareTechniqueIds(a.definitionId, b.definitionId) * sign
  })
}

/** The scored techniques on the canvas that pass the view's range, in the view's order. */
export function listForView(nodes: InvestigationNode[], view: ScoreView): InvestigationNode[] {
  const scored = nodes.filter((n) => isTechniqueNode(n) && n.navigatorScore !== undefined)
  return sortByScoreView(
    scored.filter((n) => inScoreRange(n.navigatorScore as number, view)),
    view,
  )
}
