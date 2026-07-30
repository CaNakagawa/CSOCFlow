import { useState } from 'react'
import { DetailsPanel } from '../features/investigation/components/DetailsPanel'
import { HypothesisPanel } from '../features/hypotheses/components/HypothesisPanel'
import { UseCasePanel } from '../features/use-cases/components/UseCasePanel'
import type { KnowledgeBase } from '../shared/types/knowledge'
import './RightPanel.css'

type Tab = 'details' | 'hypotheses' | 'useCases'

interface RightPanelProps {
  knowledgeBase: KnowledgeBase | null
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function RightPanel({ knowledgeBase, collapsed, onToggleCollapsed }: RightPanelProps) {
  const [tab, setTab] = useState<Tab>('details')

  if (collapsed) {
    return (
      <aside className="right-panel right-panel--collapsed">
        <button
          type="button"
          className="right-panel__collapse-toggle"
          onClick={onToggleCollapsed}
          aria-label="Expandir painel"
          title="Expandir painel"
        >
          «
        </button>
      </aside>
    )
  }

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
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'useCases'}
          className={tab === 'useCases' ? 'active' : ''}
          onClick={() => setTab('useCases')}
        >
          Casos de Uso
        </button>
        <button
          type="button"
          className="right-panel__collapse-toggle"
          onClick={onToggleCollapsed}
          aria-label="Retrair painel"
          title="Retrair painel"
        >
          »
        </button>
      </div>
      <div className="right-panel__content">
        {tab === 'details' && <DetailsPanel knowledgeBase={knowledgeBase} />}
        {tab === 'hypotheses' && <HypothesisPanel knowledgeBase={knowledgeBase} />}
        {tab === 'useCases' && <UseCasePanel knowledgeBase={knowledgeBase} />}
      </div>
    </aside>
  )
}
