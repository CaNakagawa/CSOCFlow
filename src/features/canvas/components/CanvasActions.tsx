import { useEffect, useState } from 'react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { ExportMenu } from './ExportMenu'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { useI18n } from '../../../shared/i18n'
import './CanvasActions.css'

const FEEDBACK_TIMEOUT_MS = 5000

interface CanvasActionsProps {
  knowledgeBase: KnowledgeBase | null
}

export function CanvasActions({ knowledgeBase }: CanvasActionsProps) {
  const { t, locale } = useI18n()
  const runAutoLink = useInvestigationStore((s) => s.runAutoLink)
  const organizeLikeMitre = useInvestigationStore((s) => s.organizeLikeMitre)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), FEEDBACK_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [feedback])

  function handleAutoLink() {
    if (!knowledgeBase) return
    const created = runAutoLink(knowledgeBase, locale)
    setFeedback(
      created > 0
        ? t('canvas.autoLinkCreated', { count: String(created) })
        : t('canvas.autoLinkNothing'),
    )
  }

  function handleOrganize() {
    if (!knowledgeBase) return
    const added = organizeLikeMitre(knowledgeBase, locale)
    setFeedback(t('canvas.organizeDone', { count: String(added) }))
  }

  return (
    <div className="canvas-actions">
      <div className="canvas-actions__row">
        <ExportMenu onStatus={setFeedback} />

        <button
          type="button"
          className="canvas-actions__button nopan"
          onClick={handleAutoLink}
          aria-label={t('canvas.autoLink')}
          title={t('canvas.autoLinkHint')}
        >
          <svg className="canvas-actions__icon" viewBox="0 0 16 16" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M6.6 9.4a2.6 2.6 0 0 0 3.9.3l2-2a2.6 2.6 0 0 0-3.7-3.7l-1.1 1.1" />
              <path d="M9.4 6.6a2.6 2.6 0 0 0-3.9-.3l-2 2a2.6 2.6 0 0 0 3.7 3.7l1.1-1.1" />
            </g>
          </svg>
          {t('canvas.autoLink')}
        </button>

        <button
          type="button"
          className="canvas-actions__button canvas-actions__button--primary nopan"
          onClick={handleOrganize}
          aria-label={t('canvas.organize')}
          title={t('canvas.organizeHint')}
        >
          <svg className="canvas-actions__icon" viewBox="0 0 16 16" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
              <rect x="1.8" y="2.2" width="3.4" height="3" rx="0.6" />
              <rect x="6.3" y="2.2" width="3.4" height="3" rx="0.6" />
              <rect x="10.8" y="2.2" width="3.4" height="3" rx="0.6" />
              <rect x="1.8" y="7" width="3.4" height="3" rx="0.6" />
              <rect x="6.3" y="7" width="3.4" height="3" rx="0.6" />
              <rect x="1.8" y="11.4" width="3.4" height="2.4" rx="0.6" />
            </g>
          </svg>
          {t('canvas.organize')}
        </button>
      </div>

      {feedback && (
        <p className="canvas-actions__feedback" role="status">
          {feedback}
        </p>
      )}
    </div>
  )
}
