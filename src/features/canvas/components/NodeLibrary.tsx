import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import type { LibraryItem } from '../types/libraryItem'
import { CATEGORY_TRANSLATION_KEYS } from '../types/libraryItem'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { nextGridPosition } from '../../../shared/utils/layout'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { useI18n, type TranslationKey } from '../../../shared/i18n'
import './NodeLibrary.css'

interface NodeLibraryProps {
  items: LibraryItem[]
  knowledgeBase: KnowledgeBase | null
  collapsed: boolean
  onToggleCollapsed: () => void
}

const CATEGORY_ORDER = [
  'tactics',
  'techniques',
  'useCases',
  'alerts',
  'authentication',
  'identity',
  'infrastructure',
  'evidence',
  'analystNotes',
]

const TECHNIQUES_CATEGORY = 'techniques'

function groupByCategory(items: LibraryItem[]): [string, LibraryItem[]][] {
  const groups = new Map<string, LibraryItem[]>()
  for (const item of items) {
    const bucket = groups.get(item.category)
    if (bucket) bucket.push(item)
    else groups.set(item.category, [item])
  }
  return Array.from(groups.entries()).sort(([a], [b]) => {
    const ia = CATEGORY_ORDER.indexOf(a)
    const ib = CATEGORY_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

function groupTechniquesByParent(items: LibraryItem[]) {
  const parents = items.filter((i) => !i.definitionId.includes('.'))
  const children = items.filter((i) => i.definitionId.includes('.'))
  return parents.map((parent) => ({
    parent,
    subtechniques: children.filter((c) => c.definitionId.startsWith(`${parent.definitionId}.`)),
  }))
}

export function NodeLibrary({ items, knowledgeBase, collapsed, onToggleCollapsed }: NodeLibraryProps) {
  const { t, locale } = useI18n()
  const [query, setQuery] = useState('')
  const [expandedTechniques, setExpandedTechniques] = useState<Set<string>>(new Set())
  const addNode = useInvestigationStore((s) => s.addNode)
  const applyUseCase = useInvestigationStore((s) => s.applyUseCase)
  const nodeCount = useInvestigationStore((s) => s.nodes.length)

  const fuse = useMemo(
    () => new Fuse(items, { keys: ['label', 'brief', 'category'], threshold: 0.35 }),
    [items],
  )

  const searchResults = useMemo(() => {
    if (!query.trim()) return null
    return fuse.search(query).map((r) => r.item)
  }, [query, fuse])

  const groups = useMemo(() => groupByCategory(items), [items])

  function categoryLabel(category: string): string {
    const key = CATEGORY_TRANSLATION_KEYS[category]
    return key ? t(key as TranslationKey) : category
  }

  function toggleExpanded(definitionId: string) {
    setExpandedTechniques((prev) => {
      const next = new Set(prev)
      if (next.has(definitionId)) next.delete(definitionId)
      else next.add(definitionId)
      return next
    })
  }

  function handleItemClick(item: LibraryItem) {
    if (item.isUseCase && knowledgeBase) {
      const useCase = knowledgeBase.useCases.find((u) => u.id === item.definitionId)
      if (useCase) applyUseCase(useCase, knowledgeBase, locale)
      return
    }
    addNode({
      nodeType: item.nodeType,
      definitionId: item.definitionId,
      label: item.label,
      position: nextGridPosition(nodeCount),
      fieldDefinitions: item.fieldDefinitions,
    })
  }

  function renderItem(item: LibraryItem, isSub = false) {
    return (
      <li key={item.definitionId}>
        <button
          type="button"
          className={`node-library__item${isSub ? ' node-library__item--sub' : ''}`}
          title={item.brief}
          onClick={() => handleItemClick(item)}
        >
          <span className="node-library__item-label">{item.label}</span>
        </button>
      </li>
    )
  }

  function renderTechniqueList(groupItems: LibraryItem[]) {
    return (
      <ul className="node-library__list">
        {groupTechniquesByParent(groupItems).map(({ parent, subtechniques }) => {
          const expanded = expandedTechniques.has(parent.definitionId)
          return (
            <li key={parent.definitionId}>
              <div className="node-library__technique-row">
                {subtechniques.length > 0 && (
                  <button
                    type="button"
                    className="node-library__expand"
                    aria-label={
                      expanded ? t('library.collapseSubtechniques') : t('library.expandSubtechniques')
                    }
                    aria-expanded={expanded}
                    onClick={() => toggleExpanded(parent.definitionId)}
                  >
                    {expanded ? '▾' : '▸'}
                  </button>
                )}
                <button
                  type="button"
                  className="node-library__item"
                  title={parent.brief}
                  onClick={() => handleItemClick(parent)}
                >
                  <span className="node-library__item-label">{parent.label}</span>
                </button>
              </div>
              {subtechniques.length > 0 && expanded && (
                <ul className="node-library__subtechniques">
                  {subtechniques.map((sub) => renderItem(sub, true))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  if (collapsed) {
    return (
      <aside className="node-library node-library--collapsed">
        <button
          type="button"
          className="node-library__collapse-toggle"
          onClick={onToggleCollapsed}
          aria-label={t('library.expand')}
          title={t('library.expand')}
        >
          »
        </button>
      </aside>
    )
  }

  return (
    <aside className="node-library" aria-label={t('library.title')}>
      <div className="node-library__header">
        <h2 className="node-library__title">{t('library.title')}</h2>
        <button
          type="button"
          className="node-library__collapse-toggle"
          onClick={onToggleCollapsed}
          aria-label={t('library.collapse')}
          title={t('library.collapse')}
        >
          «
        </button>
      </div>
      <input
        type="search"
        className="node-library__search"
        placeholder={t('library.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t('library.searchLabel')}
      />

      {searchResults ? (
        <ul className="node-library__list">
          {searchResults.map((item) => renderItem(item))}
          {searchResults.length === 0 && <li className="node-library__empty">{t('library.empty')}</li>}
        </ul>
      ) : (
        <div className="node-library__groups">
          {groups.map(([category, groupItems], index) => (
            <details key={category} className="node-library__group" open={index === 0}>
              <summary className="node-library__group-summary">
                {categoryLabel(category)}
                <span className="node-library__group-count">{groupItems.length}</span>
              </summary>
              {category === TECHNIQUES_CATEGORY
                ? renderTechniqueList(groupItems)
                : <ul className="node-library__list">{groupItems.map((item) => renderItem(item))}</ul>}
            </details>
          ))}
        </div>
      )}
    </aside>
  )
}
