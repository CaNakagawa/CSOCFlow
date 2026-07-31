import { useMemo, useState } from 'react'
import { useKnowledgeBase } from '../features/knowledge-base/hooks/useKnowledgeBase'
import { useCorrelation } from '../features/correlation/selectors/useCorrelation'
import { buildLibraryItems } from '../features/canvas/types/libraryItem'
import { NodeLibrary } from '../features/canvas/components/NodeLibrary'
import { Canvas } from '../features/canvas/components/Canvas'
import { TopBar } from './TopBar'
import { RightPanel } from './RightPanel'
import { useI18n } from '../shared/i18n'
import './App.css'

export function App() {
  const { knowledgeBase, loading, error } = useKnowledgeBase()
  useCorrelation(knowledgeBase)
  const { t, locale } = useI18n()

  const [isLibraryCollapsed, setLibraryCollapsed] = useState(false)
  const [isRightPanelCollapsed, setRightPanelCollapsed] = useState(false)

  const libraryItems = useMemo(
    () => (knowledgeBase ? buildLibraryItems(knowledgeBase, locale) : []),
    [knowledgeBase, locale],
  )

  if (loading) {
    return <div className="app-loading">{t('app.loading')}</div>
  }

  if (error) {
    return (
      <div className="app-error">
        <h1>{t('app.loadError')}</h1>
        <p>{error.message}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <TopBar
        libraryCollapsed={isLibraryCollapsed}
        onToggleLibrary={() => setLibraryCollapsed((v) => !v)}
        rightPanelCollapsed={isRightPanelCollapsed}
        onToggleRightPanel={() => setRightPanelCollapsed((v) => !v)}
      />
      <div className="app-body">
        <NodeLibrary
          items={libraryItems}
          knowledgeBase={knowledgeBase}
          collapsed={isLibraryCollapsed}
          onToggleCollapsed={() => setLibraryCollapsed((v) => !v)}
        />
        <Canvas knowledgeBase={knowledgeBase} />
        <RightPanel
          knowledgeBase={knowledgeBase}
          collapsed={isRightPanelCollapsed}
          onToggleCollapsed={() => setRightPanelCollapsed((v) => !v)}
        />
      </div>
    </div>
  )
}
