import { useRef, useState } from 'react'
import { useInvestigationStore } from '../features/investigation/store/investigationStore'
import {
  createInvestigationRepository,
  InvalidInvestigationFileError,
} from '../features/investigation/repository/InvestigationRepository'
import { DEMO_CASES, loadDemoCase } from '../features/investigation/services/demoCaseService'
import { useI18n, LOCALES, type Locale } from '../shared/i18n'
import './TopBar.css'

const repository = createInvestigationRepository()

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
  de: 'Deutsch',
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function TopBar() {
  const { t, locale, setLocale } = useI18n()
  const meta = useInvestigationStore((s) => s.meta)
  const setMeta = useInvestigationStore((s) => s.setMeta)
  const newInvestigation = useInvestigationStore((s) => s.newInvestigation)
  const clearCanvas = useInvestigationStore((s) => s.clearCanvas)
  const loadInvestigation = useInvestigationStore((s) => s.loadInvestigation)
  const toDocument = useInvestigationStore((s) => s.toDocument)

  const [status, setStatus] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      <input
        className="top-bar__title"
        value={meta.title}
        onChange={(e) => setMeta({ title: e.target.value })}
        aria-label={t('topBar.investigationName')}
      />

      <div className="top-bar__actions">
        <button type="button" onClick={() => newInvestigation()}>
          {t('topBar.newInvestigation')}
        </button>
        <button type="button" onClick={handleLoadDemo}>
          {t('topBar.loadDemo')}
        </button>
        <button type="button" onClick={handleSave}>
          {t('topBar.save')}
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          {t('topBar.import')}
        </button>
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
        <button type="button" onClick={handleExport}>
          {t('topBar.export')}
        </button>
        <button type="button" onClick={() => clearCanvas()}>
          {t('topBar.clear')}
        </button>
        <select
          className="top-bar__language"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          aria-label={t('topBar.language')}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABELS[l]}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
          {t('topBar.help')}
        </button>
      </div>

      {status && (
        <div className="top-bar__status" role="status">
          {status}
        </div>
      )}

      {showHelp && (
        <div className="top-bar__help" role="dialog" aria-label={t('topBar.help')}>
          <p>{t('topBar.helpText')}</p>
          <button type="button" onClick={() => setShowHelp(false)}>
            {t('topBar.close')}
          </button>
        </div>
      )}
    </header>
  )
}
