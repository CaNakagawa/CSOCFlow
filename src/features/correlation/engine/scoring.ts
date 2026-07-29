import type { ConfidenceLevel } from '../../../shared/types/investigation'

export function confidenceLevelFor(normalizedScore: number): ConfidenceLevel {
  if (normalizedScore >= 75) return 'high'
  if (normalizedScore >= 50) return 'probable'
  if (normalizedScore >= 25) return 'possible'
  return 'low'
}

export function normalizeScore(score: number, maximumScore: number): number {
  if (maximumScore <= 0) return 0
  const clamped = Math.max(0, Math.min(score, maximumScore))
  return Math.round((clamped / maximumScore) * 100)
}
