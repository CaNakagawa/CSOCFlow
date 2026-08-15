import type { AnalyticStatus, NodeState } from '../../../shared/types/investigation'

/**
 * How much this element is saying, from 0 (ruled out) to 1 (confirmed).
 *
 * The analyst's own verdict on the element comes first. Failing that, the
 * detection analytics speak: one confirmed analytic confirms the behaviour,
 * and everything ruled out clears it.
 */
export function nodeSignal(
  state: NodeState,
  analyticStatuses: Record<string, AnalyticStatus> = {},
): number {
  if (state === 'confirmed_malicious') return 1
  if (state === 'false_positive' || state === 'discarded') return 0
  if (state === 'expected') return 0.15

  const statuses = Object.values(analyticStatuses)
  if (statuses.includes('confirmed')) return 1
  if (statuses.length > 0 && statuses.every((status) => status === 'not_confirmed')) return 0.1

  if (state === 'suspicious') return 0.7
  if (state === 'observed') return 0.5
  return 0.35
}

/** The five steps of the ramp, from cleared through to confirmed. */
export type SignalTone = 'clear' | 'low' | 'watch' | 'high' | 'confirmed'

const TONE_STEPS: { upTo: number; tone: SignalTone }[] = [
  { upTo: 0.2, tone: 'clear' },
  { upTo: 0.45, tone: 'low' },
  { upTo: 0.65, tone: 'watch' },
  { upTo: 0.85, tone: 'high' },
  { upTo: Infinity, tone: 'confirmed' },
]

/**
 * Buckets the signal into the colours the canvas paints with.
 *
 * Steps rather than a continuous gradient: a dozen cards side by side have to
 * be told apart at a glance, and neighbouring shades of the same hue cannot do
 * that.
 */
export function signalTone(signal: number): SignalTone {
  return TONE_STEPS.find((step) => signal <= step.upTo)!.tone
}
