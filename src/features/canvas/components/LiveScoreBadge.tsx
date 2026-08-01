import { useEffect, useMemo, useRef, useState } from 'react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { ScorePanel } from '../../investigation/components/ScorePanel'
import {
  computeInvestigationScore,
  scoreBand,
} from '../../investigation/scoring/investigationScore'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { useI18n } from '../../../shared/i18n'
import './LiveScoreBadge.css'

/** How long the chip stays highlighted after the score moves. */
const BUMP_MS = 900

interface LiveScoreBadgeProps {
  knowledgeBase: KnowledgeBase | null
}

/**
 * The investigation score, kept on the canvas so it moves while the analyst
 * works instead of only when the Score tab is open. Clicking it opens the full
 * breakdown right there.
 */
export function LiveScoreBadge({ knowledgeBase }: LiveScoreBadgeProps) {
  const { t } = useI18n()
  const nodes = useInvestigationStore((s) => s.nodes)
  const [open, setOpen] = useState(false)
  const [bumped, setBumped] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const result = useMemo(
    () => computeInvestigationScore(nodes, knowledgeBase),
    [nodes, knowledgeBase],
  )

  // Flash the chip when the number actually changes, so a confirmation made on
  // the far side of the canvas still gets noticed. The first render is the
  // starting value, not a change.
  const previous = useRef<number | null>(null)
  useEffect(() => {
    if (previous.current !== null && previous.current !== result.score) {
      setBumped(true)
      const timer = window.setTimeout(() => setBumped(false), BUMP_MS)
      previous.current = result.score
      return () => window.clearTimeout(timer)
    }
    previous.current = result.score
  }, [result.score])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as globalThis.Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const classes = [
    'live-score__chip',
    'nopan',
    `live-score__chip--${scoreBand(result.score)}`,
    bumped ? 'live-score__chip--bumped' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="live-score" ref={rootRef}>
      <button
        type="button"
        className={classes}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={t('score.live', { score: String(result.score) })}
        title={t('score.liveHint')}
      >
        <span className="live-score__label">{t('rightPanel.score')}</span>
        <span className="live-score__value">{result.score}</span>
        <span className="live-score__reach">
          {result.deepestTactic ? result.deepestTactic.name : t('score.noneConfirmed')}
        </span>
        <span className="live-score__track" aria-hidden="true">
          <span style={{ width: `${result.score}%` }} />
        </span>
      </button>

      {open && (
        <div className="live-score__popover nopan nowheel">
          <ScorePanel knowledgeBase={knowledgeBase} />
        </div>
      )}
    </div>
  )
}
