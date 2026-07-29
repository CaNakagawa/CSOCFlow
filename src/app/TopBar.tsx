import { useRef, useState } from 'react'
import { useInvestigationStore } from '../features/investigation/store/investigationStore'
import {
  createInvestigationRepository,
  InvalidInvestigationFileError,
} from '../features/investigation/repository/InvestigationRepository'
import { DEMO_CASES, loadDemoCase } from '../features/investigation/services/demoCaseService'
import './TopBar.css'

const repository = createInvestigationRepository()

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function TopBar() {
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
    setStatus('Investigação salva localmente.')
  }

  async function handleLoadDemo() {
    const investigation = await loadDemoCase(DEMO_CASES[0])
    loadInvestigation(investigation)
    setStatus(`Caso de demonstração "${DEMO_CASES[0].title}" carregado.`)
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
      setStatus('Investigação importada com sucesso.')
    } catch (error) {
      if (error instanceof InvalidInvestigationFileError) {
        setStatus(error.message)
      } else {
        setStatus('Não foi possível importar o arquivo selecionado.')
      }
    }
  }

  return (
    <header className="top-bar">
      <input
        className="top-bar__title"
        value={meta.title}
        onChange={(e) => setMeta({ title: e.target.value })}
        aria-label="Nome da investigação"
      />

      <div className="top-bar__actions">
        <button type="button" onClick={() => newInvestigation()}>
          Nova investigação
        </button>
        <button type="button" onClick={handleLoadDemo}>
          Carregar caso de demonstração
        </button>
        <button type="button" onClick={handleSave}>
          Salvar localmente
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          Importar JSON
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
          Exportar JSON
        </button>
        <button type="button" onClick={() => clearCanvas()}>
          Limpar canvas
        </button>
        <button type="button" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
          Ajuda
        </button>
      </div>

      {status && (
        <div className="top-bar__status" role="status">
          {status}
        </div>
      )}

      {showHelp && (
        <div className="top-bar__help" role="dialog" aria-label="Ajuda">
          <p>
            Adicione elementos pela biblioteca à esquerda, preencha os campos no painel de detalhes
            e acompanhe as hipóteses sugeridas no painel à direita. A pontuação das hipóteses é
            recalculada automaticamente a cada mudança no canvas.
          </p>
          <button type="button" onClick={() => setShowHelp(false)}>
            Fechar
          </button>
        </div>
      )}
    </header>
  )
}
