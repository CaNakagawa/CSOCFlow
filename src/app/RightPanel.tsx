import { useState } from 'react'
import { DetailsPanel } from '../features/investigation/components/DetailsPanel'
import { HypothesisPanel } from '../features/hypotheses/components/HypothesisPanel'
import type { KnowledgeBase } from '../shared/types/knowledge'
import './RightPanel.css'

type Tab = 'details' | 'hypotheses'

interface RightPanelProps {
  knowledgeBase: KnowledgeBase | null
}

export function RightPanel({ knowledgeBase }: RightPanelProps) {
  const [tab, setTab] = useState<Tab>('details')

  return (
    <aside className="right-panel" aria-label="Painel de detalhes e hipóteses">
      <div className="right-panel__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'details'}
          className={tab === 'details' ? 'active' : ''}
          onClick={() => setTab('details')}
        >
          Detalhes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'hypotheses'}
          className={tab === 'hypotheses' ? 'active' : ''}
          onClick={() => setTab('hypotheses')}
        >
          Hipóteses
        </button>
      </div>
      <div className="right-panel__content">
        {tab === 'details' ? (
          <DetailsPanel knowledgeBase={knowledgeBase} />
        ) : (
          <HypothesisPanel knowledgeBase={knowledgeBase} />
        )}
      </div>
    </aside>
  )
}
