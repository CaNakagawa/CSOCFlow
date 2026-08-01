import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useKnowledgeBase } from '../features/knowledge-base/hooks/useKnowledgeBase'
import { useCorrelation } from '../features/correlation/selectors/useCorrelation'
import { useEditShortcuts } from '../features/investigation/hooks/useEditShortcuts'
import { buildLibraryItems } from '../features/canvas/types/libraryItem'
import { NodeLibrary } from '../features/canvas/components/NodeLibrary'
import { Canvas } from '../features/canvas/components/Canvas'
import { TopBar } from './TopBar'
import { RightPanel } from './RightPanel'
import { PanelResizer } from './PanelResizer'
import {
  getStoredPanelWidths,
  storePanelWidths,
  LIBRARY_WIDTH,
  RIGHT_PANEL_WIDTH,
} from './panelWidths'
import { useI18n } from '../shared/i18n'
import './App.css'

export function App() {
  const { knowledgeBase, loading, error } = useKnowledgeBase()
  useCorrelation(knowledgeBase)
  useEditShortcuts()
  const { t, locale } = useI18n()

  const [isLibraryCollapsed, setLibraryCollapsed] = useState(false)
  const [isRightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [panelWidths, setPanelWidths] = useState(getStoredPanelWidths)

  useEffect(() => storePanelWidths(panelWidths), [panelWidths])

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
      <div
        className="app-body"
        style={
          {
            '--library-width': `${panelWidths.library}px`,
            '--right-panel-width': `${panelWidths.rightPanel}px`,
          } as CSSProperties
        }
      >
        <NodeLibrary
          items={libraryItems}
          knowledgeBase={knowledgeBase}
          collapsed={isLibraryCollapsed}
          onToggleCollapsed={() => setLibraryCollapsed((v) => !v)}
        />
        {!isLibraryCollapsed && (
          <PanelResizer
            side="left"
            width={panelWidths.library}
            min={LIBRARY_WIDTH.min}
            max={LIBRARY_WIDTH.max}
            label={t('app.resizeLibrary')}
            onResize={(library) => setPanelWidths((widths) => ({ ...widths, library }))}
          />
        )}
        <Canvas knowledgeBase={knowledgeBase} />
        {!isRightPanelCollapsed && (
          <PanelResizer
            side="right"
            width={panelWidths.rightPanel}
            min={RIGHT_PANEL_WIDTH.min}
            max={RIGHT_PANEL_WIDTH.max}
            label={t('app.resizeRightPanel')}
            onResize={(rightPanel) => setPanelWidths((widths) => ({ ...widths, rightPanel }))}
          />
        )}
        <RightPanel
          knowledgeBase={knowledgeBase}
          collapsed={isRightPanelCollapsed}
          onToggleCollapsed={() => setRightPanelCollapsed((v) => !v)}
        />
      </div>
    </div>
  )
}
