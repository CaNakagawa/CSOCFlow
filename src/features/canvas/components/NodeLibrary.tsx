import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import type { LibraryItem } from '../types/libraryItem'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { nextGridPosition } from '../../../shared/utils/layout'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import './NodeLibrary.css'

interface NodeLibraryProps {
  items: LibraryItem[]
  knowledgeBase: KnowledgeBase | null
  collapsed: boolean
  onToggleCollapsed: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  authentication: 'Autenticação',
  identity: 'Identidade',
  infrastructure: 'Infraestrutura',
}

const CATEGORY_ORDER = [
  'Táticas MITRE ATT&CK',
  'Técnicas MITRE ATT&CK',
  'Casos de Uso',
  'Alertas',
  'Autenticação',
  'Identidade',
  'Infraestrutura',
  'Evidências',
  'Observações do Analista',
]

const TECHNIQUES_CATEGORY = 'Técnicas MITRE ATT&CK'

function categoryLabel(raw: string): string {
  return CATEGORY_LABELS[raw] ?? raw
}

function groupByCategory(items: LibraryItem[]): [string, LibraryItem[]][] {
  const groups = new Map<string, LibraryItem[]>()
  for (const item of items) {
    const label = categoryLabel(item.category)
    const bucket = groups.get(label)
    if (bucket) bucket.push(item)
    else groups.set(label, [item])
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

export function NodeLibrary({
  items,
  knowledgeBase,
  collapsed,
  onToggleCollapsed,
}: NodeLibraryProps) {
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
      if (useCase) applyUseCase(useCase, knowledgeBase)
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
                    aria-label={expanded ? 'Recolher subtécnicas' : 'Expandir subtécnicas'}
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
          aria-label="Expandir biblioteca"
          title="Expandir biblioteca"
        >
          »
        </button>
      </aside>
    )
  }

  return (
    <aside className="node-library" aria-label="Biblioteca de elementos investigativos">
      <div className="node-library__header">
        <h2 className="node-library__title">Biblioteca</h2>
        <button
          type="button"
          className="node-library__collapse-toggle"
          onClick={onToggleCollapsed}
          aria-label="Retrair biblioteca"
          title="Retrair biblioteca"
        >
          «
        </button>
      </div>
      <input
        type="search"
        className="node-library__search"
        placeholder="Buscar técnica, evidência..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar na biblioteca"
      />

      {searchResults ? (
        <ul className="node-library__list">
          {searchResults.map((item) => renderItem(item))}
          {searchResults.length === 0 && (
            <li className="node-library__empty">Nenhum item encontrado.</li>
          )}
        </ul>
      ) : (
        <div className="node-library__groups">
          {groups.map(([label, groupItems], index) => (
            <details key={label} className="node-library__group" open={index === 0}>
              <summary className="node-library__group-summary">
                {label}
                <span className="node-library__group-count">{groupItems.length}</span>
              </summary>
              {label === TECHNIQUES_CATEGORY ? (
                renderTechniqueList(groupItems)
              ) : (
                <ul className="node-library__list">{groupItems.map((item) => renderItem(item))}</ul>
              )}
            </details>
          ))}
        </div>
      )}
    </aside>
  )
}
