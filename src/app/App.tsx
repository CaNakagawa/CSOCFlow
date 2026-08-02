import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useKnowledgeBase } from '../features/knowledge-base/hooks/useKnowledgeBase'
import { useCorrelation } from '../features/correlation/selectors/useCorrelation'
import { useEditShortcuts } from '../features/investigation/hooks/useEditShortcuts'
import { buildLibraryItems } from '../features/canvas/types/libraryItem'
import { NodeLibrary } from '../features/canvas/components/NodeLibrary'
import { Canvas } from '../features/canvas/components/Canvas'
import { TopBar } from './TopBar'
import {
  createInvestigationRepository,
  InvalidInvestigationFileError,
} from '../features/investigation/repository/InvestigationRepository'
import { DEMO_CASES, loadDemoCase } from '../features/investigation/services/demoCaseService'
import { useInvestigationStore } from '../features/investigation/store/investigationStore'
import { applyTheme, getStoredTheme, storeTheme, THEMES } from '../shared/theme/theme'
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

const repository = createInvestigationRepository()

export function App() {
  const { knowledgeBase, loading, error } = useKnowledgeBase()
  useCorrelation(knowledgeBase)
  useEditShortcuts()
  const { t, locale } = useI18n()

  /*
   * On a phone the canvas is the whole point, so both panels start out of the
   * way; their arrows bring them back over the canvas.
   */
  const startsCollapsed = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches

  const [isLibraryCollapsed, setLibraryCollapsed] = useState(startsCollapsed)
  const [isRightPanelCollapsed, setRightPanelCollapsed] = useState(startsCollapsed)
  const [panelWidths, setPanelWidths] = useState(getStoredPanelWidths)
  const [presenting, setPresenting] = useState(false)
  const [theme, setTheme] = useState(getStoredTheme)
  const [status, setStatus] = useState<string | null>(null)
  const loadInvestigation = useInvestigationStore((s) => s.loadInvestigation)
  const toDocument = useInvestigationStore((s) => s.toDocument)

  useEffect(() => {
    applyTheme(theme)
    storeTheme(theme)
  }, [theme])

  const cycleTheme = useCallback(() => {
    setTheme((current) => THEMES[(THEMES.indexOf(current) + 1) % THEMES.length])
  }, [])

  const saveLocally = useCallback(async () => {
    await repository.save(toDocument())
    setStatus(t('topBar.statusSaved'))
  }, [t, toDocument])

  const loadDemo = useCallback(async () => {
    const investigation = await loadDemoCase(DEMO_CASES[0])
    loadInvestigation(investigation)
    setStatus(t('topBar.statusDemoLoaded', { name: DEMO_CASES[0].title }))
  }, [loadInvestigation, t])

  const importFile = useCallback(
    async (file: File) => {
      try {
        const data: unknown = JSON.parse(await file.text())
        loadInvestigation(await repository.import(data))
        setStatus(t('topBar.statusImported'))
      } catch (error) {
        setStatus(
          error instanceof InvalidInvestigationFileError
            ? error.message
            : t('topBar.statusImportFailedGeneric'),
        )
      }
    },
    [loadInvestigation, t],
  )

  /*
   * Presentation mode hides the chrome and asks the browser for the screen.
   * Fullscreen can be refused (an iframe without permission, or a user gesture
   * the browser did not like); the layout still goes full-window either way.
   */
  const togglePresentation = useCallback(() => {
    setPresenting((value) => {
      const next = !value
      if (next) void document.documentElement.requestFullscreen?.().catch(() => undefined)
      else if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined)
      return next
    })
  }, [])

  useEffect(() => {
    if (!presenting) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setPresenting(false)
    }
    // Leaving fullscreen by the browser's own shortcut must leave the mode too.
    function handleFullscreenChange() {
      if (!document.fullscreenElement) setPresenting(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [presenting])

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
    <div className={`app-shell${presenting ? ' app-shell--presenting' : ''}`}>
      <TopBar status={status} onStatusCleared={() => setStatus(null)} />
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
        <Canvas
          knowledgeBase={knowledgeBase}
          libraryItems={libraryItems}
          presenting={presenting}
          onTogglePresentation={togglePresentation}
          theme={theme}
          onCycleTheme={cycleTheme}
          onImportFile={(file) => void importFile(file)}
          onSaveLocally={() => void saveLocally()}
          onLoadDemo={() => void loadDemo()}
        />
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
