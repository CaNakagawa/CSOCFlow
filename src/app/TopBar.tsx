import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { useInvestigationStore } from '../features/investigation/store/investigationStore'
import {
  createInvestigationRepository,
  InvalidInvestigationFileError,
} from '../features/investigation/repository/InvestigationRepository'
import { DEMO_CASES, loadDemoCase } from '../features/investigation/services/demoCaseService'
import { useI18n, type TranslationKey } from '../shared/i18n'
import { LanguageSelect } from './LanguageSelect'
import './TopBar.css'

const repository = createInvestigationRepository()

const STATUS_TIMEOUT_MS = 5000

type MenuTab = 'investigation' | 'file' | 'view'

const TAB_ORDER: MenuTab[] = ['investigation', 'file', 'view']

const TAB_LABEL_KEYS: Record<MenuTab, TranslationKey> = {
  investigation: 'topBar.tabInvestigation',
  file: 'topBar.tabFile',
  view: 'topBar.tabView',
}

type IconName =
  'new' | 'demo' | 'clear' | 'save' | 'import' | 'export' | 'library' | 'details' | 'link' | 'help'

const ICONS: Record<IconName, ReactNode> = {
  new: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5.4v5.2M5.4 8h5.2" />
    </>
  ),
  demo: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M6.6 5.6 10.4 8l-3.8 2.4Z" />
    </>
  ),
  clear: (
    <path d="M2.8 4.4h10.4M6.4 4.4V2.9h3.2v1.5M4.2 4.4l.55 8.15a1.1 1.1 0 0 0 1.1 1.05h4.3a1.1 1.1 0 0 0 1.1-1.05L11.8 4.4" />
  ),
  save: (
    <>
      <path d="M3 2.8h7.3L13 5.5V13a.7.7 0 0 1-.7.7H3.7A.7.7 0 0 1 3 13V2.8Z" />
      <path d="M5.4 2.8v3.6h5.2V2.8M5.4 13.7V9.9h5.2v3.8" />
    </>
  ),
  import: (
    <>
      <path d="M8 2.6v6.9M5.2 6.9 8 9.7l2.8-2.8" />
      <path d="M2.8 11.4v1.1a1 1 0 0 0 1 1h8.4a1 1 0 0 0 1-1v-1.1" />
    </>
  ),
  export: (
    <>
      <path d="M8 9.7V2.8M5.2 5.6 8 2.8l2.8 2.8" />
      <path d="M2.8 11.4v1.1a1 1 0 0 0 1 1h8.4a1 1 0 0 0 1-1v-1.1" />
    </>
  ),
  library: (
    <>
      <rect x="2.3" y="3" width="11.4" height="10" rx="1.3" />
      <path d="M6.4 3v10" />
    </>
  ),
  details: (
    <>
      <rect x="2.3" y="3" width="11.4" height="10" rx="1.3" />
      <path d="M9.6 3v10" />
    </>
  ),
  link: (
    <>
      <path d="M6.6 9.4a2.6 2.6 0 0 0 3.9.3l2-2a2.6 2.6 0 0 0-3.7-3.7l-1.1 1.1" />
      <path d="M9.4 6.6a2.6 2.6 0 0 0-3.9-.3l-2 2a2.6 2.6 0 0 0 3.7 3.7l1.1-1.1" />
    </>
  ),
  help: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M6.3 6.3a1.75 1.75 0 1 1 2.3 1.85c-.4.17-.6.5-.6.9v.3" />
      <path d="M8 11.7h.01" />
    </>
  ),
}

function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="top-bar__icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface TopBarProps {
  libraryCollapsed: boolean
  onToggleLibrary: () => void
  rightPanelCollapsed: boolean
  onToggleRightPanel: () => void
}

export function TopBar({
  libraryCollapsed,
  onToggleLibrary,
  rightPanelCollapsed,
  onToggleRightPanel,
}: TopBarProps) {
  const { t } = useI18n()
  const meta = useInvestigationStore((s) => s.meta)
  const setMeta = useInvestigationStore((s) => s.setMeta)
  const newInvestigation = useInvestigationStore((s) => s.newInvestigation)
  const clearCanvas = useInvestigationStore((s) => s.clearCanvas)
  const loadInvestigation = useInvestigationStore((s) => s.loadInvestigation)
  const toDocument = useInvestigationStore((s) => s.toDocument)
  const autoLinkTactics = useInvestigationStore((s) => s.autoLinkTactics)
  const setAutoLinkTactics = useInvestigationStore((s) => s.setAutoLinkTactics)

  const [activeTab, setActiveTab] = useState<MenuTab>('investigation')
  const [status, setStatus] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tabRefs = useRef<Partial<Record<MenuTab, HTMLButtonElement | null>>>({})
  const helpRef = useRef<HTMLDivElement>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(null), STATUS_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!showHelp) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as globalThis.Node
      if (helpRef.current?.contains(target) || helpButtonRef.current?.contains(target)) return
      setShowHelp(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setShowHelp(false)
      helpButtonRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showHelp])

  function handleTabKeyDown(event: ReactKeyboardEvent, index: number) {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0) return
    event.preventDefault()
    const next = TAB_ORDER[(index + delta + TAB_ORDER.length) % TAB_ORDER.length]
    setActiveTab(next)
    tabRefs.current[next]?.focus()
  }

  async function handleSave() {
    await repository.save(toDocument())
    setStatus(t('topBar.statusSaved'))
  }

  async function handleLoadDemo() {
    const investigation = await loadDemoCase(DEMO_CASES[0])
    loadInvestigation(investigation)
    setStatus(t('topBar.statusDemoLoaded', { name: DEMO_CASES[0].title }))
  }

  function handleExport() {
    const doc = toDocument()
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${doc.investigation.id}.json`)
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      const data: unknown = JSON.parse(text)
      const investigation = await repository.import(data)
      loadInvestigation(investigation)
      setStatus(t('topBar.statusImported'))
    } catch (error) {
      if (error instanceof InvalidInvestigationFileError) {
        setStatus(error.message)
      } else {
        setStatus(t('topBar.statusImportFailedGeneric'))
      }
    }
  }

  return (
    <header className="top-bar">
      <div className="top-bar__primary">
        <div className="top-bar__brand">
          <svg className="top-bar__logo" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 1.4 14 4.9v6.2L8 14.6 2 11.1V4.9Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <circle cx="8" cy="8" r="2.2" fill="currentColor" />
          </svg>
          <span>CSOC Flow</span>
        </div>

        <input
          className="top-bar__title"
          value={meta.title}
          onChange={(e) => setMeta({ title: e.target.value })}
          aria-label={t('topBar.investigationName')}
        />

        <div className="top-bar__primary-right">
          <LanguageSelect />
          <button
            ref={helpButtonRef}
            type="button"
            className="top-bar__icon-button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            aria-label={t('topBar.help')}
            title={t('topBar.help')}
          >
            <Icon name="help" />
          </button>
        </div>
      </div>

      <div className="top-bar__ribbon">
        <div className="top-bar__tabs" role="tablist" aria-label={t('topBar.menu')}>
          {TAB_ORDER.map((tab, index) => (
            <button
              key={tab}
              ref={(el) => {
                tabRefs.current[tab] = el
              }}
              type="button"
              role="tab"
              id={`top-bar-tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls="top-bar-tabpanel"
              tabIndex={activeTab === tab ? 0 : -1}
              className="top-bar__tab"
              onClick={() => setActiveTab(tab)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
            >
              {t(TAB_LABEL_KEYS[tab])}
            </button>
          ))}
        </div>

        <div className="top-bar__ribbon-divider" aria-hidden="true" />

        <div
          className="top-bar__group"
          id="top-bar-tabpanel"
          role="tabpanel"
          aria-labelledby={`top-bar-tab-${activeTab}`}
        >
          {activeTab === 'investigation' && (
            <>
              <button type="button" className="top-bar__action" onClick={() => newInvestigation()}>
                <Icon name="new" />
                {t('topBar.newInvestigation')}
              </button>
              <button type="button" className="top-bar__action" onClick={handleLoadDemo}>
                <Icon name="demo" />
                {t('topBar.loadDemo')}
              </button>
              <button
                type="button"
                className="top-bar__action top-bar__action--danger"
                onClick={() => clearCanvas()}
              >
                <Icon name="clear" />
                {t('topBar.clear')}
              </button>
            </>
          )}

          {activeTab === 'file' && (
            <>
              <button type="button" className="top-bar__action" onClick={handleSave}>
                <Icon name="save" />
                {t('topBar.save')}
              </button>
              <button
                type="button"
                className="top-bar__action"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="import" />
                {t('topBar.import')}
              </button>
              <button type="button" className="top-bar__action" onClick={handleExport}>
                <Icon name="export" />
                {t('topBar.export')}
              </button>
            </>
          )}

          {activeTab === 'view' && (
            <>
              <button
                type="button"
                className="top-bar__action top-bar__action--toggle"
                onClick={onToggleLibrary}
                aria-pressed={!libraryCollapsed}
              >
                <Icon name="library" />
                {t('topBar.toggleLibrary')}
              </button>
              <button
                type="button"
                className="top-bar__action top-bar__action--toggle"
                onClick={onToggleRightPanel}
                aria-pressed={!rightPanelCollapsed}
              >
                <Icon name="details" />
                {t('topBar.toggleDetails')}
              </button>
              <div className="top-bar__group-divider" aria-hidden="true" />
              <button
                type="button"
                className="top-bar__action top-bar__action--toggle"
                onClick={() => setAutoLinkTactics(!autoLinkTactics)}
                aria-pressed={autoLinkTactics}
                aria-label={t('topBar.autoLink')}
                title={t('topBar.autoLinkHint')}
              >
                <Icon name="link" />
                {t('topBar.autoLink')}
              </button>
            </>
          )}
        </div>

        {status && (
          <div className="top-bar__status" role="status">
            {status}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleImportFile(file)
          e.target.value = ''
        }}
      />

      {showHelp && (
        <div ref={helpRef} className="top-bar__help" role="dialog" aria-label={t('topBar.help')}>
          <p>{t('topBar.helpText')}</p>
          <button type="button" className="top-bar__action" onClick={() => setShowHelp(false)}>
            {t('topBar.close')}
          </button>
        </div>
      )}
    </header>
  )
}
