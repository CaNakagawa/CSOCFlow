import { useState } from 'react'
import type { DetectionAnalytic } from '../../../shared/types/knowledge'
import { buildHuntingQueries, type HuntingPlatform } from '../utils/huntingQueries'
import { useI18n } from '../../../shared/i18n'
import './HuntingQueries.css'

interface HuntingQueriesProps {
  analytic: DetectionAnalytic
}

export function HuntingQueries({ analytic }: HuntingQueriesProps) {
  const { t, locale } = useI18n()
  const [platform, setPlatform] = useState<HuntingPlatform>('kql')
  const [copied, setCopied] = useState(false)

  const queries = buildHuntingQueries(analytic, locale)
  const active = queries.find((q) => q.platform === platform) ?? queries[0]

  async function copy() {
    await navigator.clipboard.writeText(active.query)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="hunting">
      <h5 className="hunting__title">{t('hunting.title')}</h5>
      <p className="hunting__disclaimer">{t('hunting.disclaimer')}</p>

      {analytic.logSources.length > 0 && (
        <p className="hunting__sources">
          {t('hunting.logSources')}
          {analytic.logSources
            .map((s) => (s.channel ? `${s.name} (${s.channel})` : s.name))
            .join(', ')}
        </p>
      )}

      <div className="hunting__tabs" role="tablist" aria-label={t('hunting.title')}>
        {queries.map((query) => (
          <button
            key={query.platform}
            type="button"
            role="tab"
            aria-selected={query.platform === platform}
            className="hunting__tab"
            onClick={() => setPlatform(query.platform)}
          >
            {query.label}
          </button>
        ))}
      </div>

      <pre className="hunting__code">
        <code>{active.query}</code>
      </pre>

      <button type="button" className="hunting__copy" onClick={() => void copy()}>
        {copied ? t('hunting.copied') : t('hunting.copy')}
      </button>

      {analytic.mutableElements.length > 0 && (
        <>
          <h5 className="hunting__title">{t('hunting.tune')}</h5>
          <ul className="hunting__tune">
            {analytic.mutableElements.map((element) => (
              <li key={element.field}>
                <strong>{element.field}</strong>
                {element.description ? ` — ${element.description}` : ''}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
