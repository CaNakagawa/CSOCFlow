import { useState } from 'react'
import { DetailsPanel } from '../features/investigation/components/DetailsPanel'
import { ScorePanel } from '../features/investigation/components/ScorePanel'
import { HypothesisPanel } from '../features/hypotheses/components/HypothesisPanel'
import { UseCasePanel } from '../features/use-cases/components/UseCasePanel'
import type { KnowledgeBase } from '../shared/types/knowledge'
import { useI18n } from '../shared/i18n'
import './RightPanel.css'

type Tab = 'details' | 'score' | 'hypotheses' | 'useCases'

interface RightPanelProps {
  knowledgeBase: KnowledgeBase | null
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function RightPanel({ knowledgeBase, collapsed, onToggleCollapsed }: RightPanelProps) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('details')

  if (collapsed) {
    return (
      <aside className="right-panel right-panel--collapsed">
        <button
          type="button"
          className="right-panel__collapse-toggle"
          onClick={onToggleCollapsed}
          aria-label={t('rightPanel.expand')}
          title={t('rightPanel.expand')}
        >
          «
        </button>
      </aside>
    )
  }

  return (
    <aside className="right-panel" aria-label={t('rightPanel.details')}>
      <div className="right-panel__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'details'}
          className={tab === 'details' ? 'active' : ''}
          onClick={() => setTab('details')}
        >
          {t('rightPanel.details')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'score'}
          className={tab === 'score' ? 'active' : ''}
          onClick={() => setTab('score')}
        >
          {t('rightPanel.score')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'hypotheses'}
          className={tab === 'hypotheses' ? 'active' : ''}
          onClick={() => setTab('hypotheses')}
        >
          {t('rightPanel.hypotheses')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'useCases'}
          className={tab === 'useCases' ? 'active' : ''}
          onClick={() => setTab('useCases')}
        >
          {t('rightPanel.useCases')}
        </button>
        <button
          type="button"
          className="right-panel__collapse-toggle"
          onClick={onToggleCollapsed}
          aria-label={t('rightPanel.collapse')}
          title={t('rightPanel.collapse')}
        >
          »
        </button>
      </div>
      <div className="right-panel__content">
        {tab === 'details' && <DetailsPanel knowledgeBase={knowledgeBase} />}
        {tab === 'score' && <ScorePanel knowledgeBase={knowledgeBase} />}
        {tab === 'hypotheses' && <HypothesisPanel knowledgeBase={knowledgeBase} />}
        {tab === 'useCases' && <UseCasePanel knowledgeBase={knowledgeBase} />}
      </div>
    </aside>
  )
}
