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
import {
  NavigatorImportError,
  parseNavigatorLayer,
} from '../features/canvas/export/attackNavigatorImport'
import { useInvestigationStore } from '../features/investigation/store/investigationStore'
import { applyTheme, getStoredTheme, storeTheme } from '../shared/theme/theme'
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
  const importNavigatorLayer = useInvestigationStore((s) => s.importNavigatorLayer)

  useEffect(() => {
    applyTheme(theme)
    storeTheme(theme)
  }, [theme])

  const saveLocally = useCallback(async () => {
    await repository.save(toDocument())
    setStatus(t('topBar.statusSaved'))
  }, [t, toDocument])

  const loadDemo = useCallback(async () => {
    const investigation = await loadDemoCase(DEMO_CASES[0])
    loadInvestigation(investigation)
    setStatus(t('topBar.statusDemoLoaded', { name: DEMO_CASES[0].title }))
  }, [loadInvestigation, t])

  /*
   * One Import button for two kinds of file. An investigation replaces the
   * canvas; an ATT&CK Navigator layer adds its techniques to what is already
   * there, because a layer is a set of techniques rather than a whole case.
   */
  const importFile = useCallback(
    async (file: File) => {
      const text = await file.text()

      try {
        const data: unknown = JSON.parse(text)
        loadInvestigation(await repository.import(data))
        setStatus(t('topBar.statusImported'))
        return
      } catch (error) {
        if (!(error instanceof InvalidInvestigationFileError)) {
          setStatus(t('topBar.statusImportFailedGeneric'))
          return
        }
        // Not an investigation. It may still be a layer.
      }

      if (!knowledgeBase) {
        setStatus(t('topBar.statusImportFailedGeneric'))
        return
      }

      try {
        const layer = parseNavigatorLayer(text)
        const { added, skipped, unknown } = importNavigatorLayer(
          layer.entries,
          knowledgeBase,
          locale,
        )
        setStatus(
          [
            t('topBar.statusLayerImported', { added: String(added) }),
            skipped > 0 ? t('topBar.statusLayerSkipped', { skipped: String(skipped) }) : '',
            layer.ignored > 0
              ? t('topBar.statusLayerIgnored', { ignored: String(layer.ignored) })
              : '',
            unknown.length > 0
              ? t('topBar.statusLayerUnknown', { ids: unknown.slice(0, 5).join(', ') })
              : '',
          ]
            .filter(Boolean)
            .join(' '),
        )
      } catch (error) {
        setStatus(
          error instanceof NavigatorImportError
            ? t('topBar.statusLayerFailed')
            : t('topBar.statusImportFailedGeneric'),
        )
      }
    },
    [importNavigatorLayer, knowledgeBase, loadInvestigation, locale, t],
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
      <TopBar
        status={status}
        onStatusCleared={() => setStatus(null)}
        theme={theme}
        onThemeChange={setTheme}
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
        <Canvas
          knowledgeBase={knowledgeBase}
          libraryItems={libraryItems}
          presenting={presenting}
          onTogglePresentation={togglePresentation}
          theme={theme}
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
