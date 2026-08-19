import { useRef, useState } from 'react'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { useUserUseCaseStore } from '../store/userUseCaseStore'
import { UseCaseImportError } from '../import/parseUseCase'
import { UseCaseCard } from './UseCaseCard'
import { useI18n, localize } from '../../../shared/i18n'
import './UseCasePanel.css'

interface UseCasePanelProps {
  knowledgeBase: KnowledgeBase | null
}

export function UseCasePanel({ knowledgeBase }: UseCasePanelProps) {
  const { t, locale } = useI18n()
  const suggestions = useInvestigationStore((s) => s.useCaseSuggestions)
  const applyUseCase = useInvestigationStore((s) => s.applyUseCase)
  const userUseCases = useUserUseCaseStore((s) => s.useCases)
  const importFile = useUserUseCaseStore((s) => s.importFile)
  const removeUseCase = useUserUseCaseStore((s) => s.remove)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null)

  if (!knowledgeBase) return null

  const mine = new Set(userUseCases.map((useCase) => useCase.id))
  const builtInIds = knowledgeBase.useCases
    .filter((useCase) => !mine.has(useCase.id))
    .map((useCase) => useCase.id)

  async function handleFile(file: File) {
    try {
      const useCase = await importFile(file, builtInIds)
      setMessage({
        text: t('useCase.imported', { name: localize(useCase.name, locale) }),
        failed: false,
      })
    } catch (error) {
      const reason =
        error instanceof UseCaseImportError
          ? error.message === 'notJson'
            ? t('useCase.importNotJson')
            : error.message === 'idTaken'
              ? t('useCase.importIdTaken')
              : error.message === 'isInvestigation'
                ? t('useCase.importIsInvestigation')
                : t('useCase.importInvalid', { reason: error.message })
          : t('useCase.importFailed')
      setMessage({ text: reason, failed: true })
    }
  }

  return (
    <div className="use-case-panel">
      {/* The analyst's own cases, before the ones the app happens to suggest. */}
      <section className="use-case-panel__mine">
        <header className="use-case-panel__mine-header">
          <h3>{t('useCase.mine')}</h3>
          <button
            type="button"
            className="use-case-panel__import"
            onClick={() => fileInputRef.current?.click()}
          >
            {t('useCase.import')}
          </button>
        </header>

        <p className="use-case-panel__hint">{t('useCase.importHint')}</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            // Clearing the input lets the same file be picked twice in a row.
            event.target.value = ''
            if (file) void handleFile(file)
          }}
        />

        {message && (
          <p
            className={`use-case-panel__message${message.failed ? ' use-case-panel__message--failed' : ''}`}
            role="status"
          >
            {message.text}
          </p>
        )}

        {userUseCases.map((useCase) => {
          /*
           * Applying a case skips techniques the base does not carry, and a
           * node that never appears is hard to tell from one that failed. Say
           * so before the analyst clicks.
           */
          const unknown = useCase.techniques.filter(
            (id) => !knowledgeBase.techniques.some((technique) => technique.id === id),
          )
          return (
            <div key={useCase.id} className="use-case-panel__own">
              <UseCaseCard
                useCaseId={useCase.id}
                knowledgeBase={knowledgeBase}
                onApply={() => applyUseCase(useCase, knowledgeBase, locale)}
              />
              {unknown.length > 0 && (
                <p className="use-case-panel__warning">
                  {t('useCase.unknownTechniques', { ids: unknown.join(', ') })}
                </p>
              )}
              <button
                type="button"
                className="use-case-panel__remove"
                onClick={() => void removeUseCase(useCase.id)}
              >
                {t('useCase.remove')}
              </button>
            </div>
          )
        })}
      </section>

      <h3 className="use-case-panel__suggested">{t('useCase.suggested')}</h3>
      <p className="use-case-panel__disclaimer">{t('useCasePanel.disclaimer')}</p>
      {suggestions.length === 0 && (
        <p className="use-case-panel__empty">{t('useCasePanel.empty')}</p>
      )}
      {suggestions.map((suggestion) => (
        <UseCaseCard
          key={suggestion.useCaseId}
          useCaseId={suggestion.useCaseId}
          knowledgeBase={knowledgeBase}
          suggestion={suggestion}
          onApply={() => {
            const useCase = knowledgeBase.useCases.find((u) => u.id === suggestion.useCaseId)
            if (useCase) applyUseCase(useCase, knowledgeBase, locale)
          }}
        />
      ))}
    </div>
  )
}
