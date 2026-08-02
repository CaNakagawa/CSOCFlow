import { useEffect, useMemo, useRef } from 'react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { parentTechniqueId } from '../../correlation/engine/buildSubtechniqueEdges'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { useI18n, type TranslationKey } from '../../../shared/i18n'
import './NodeContextMenu.css'

export interface ContextMenuState {
  nodeId: string
  x: number
  y: number
}

interface NodeContextMenuProps {
  menu: ContextMenuState
  knowledgeBase: KnowledgeBase | null
  onClose: () => void
}

/** Everything worth doing to what was right-clicked, without leaving the spot. */
export function NodeContextMenu({ menu, knowledgeBase, onClose }: NodeContextMenuProps) {
  const { t, locale } = useI18n()
  const duplicateNode = useInvestigationStore((s) => s.duplicateNode)
  const removeNode = useInvestigationStore((s) => s.removeNode)
  const expandSubtechniques = useInvestigationStore((s) => s.expandSubtechniques)
  const collapseSubtechniques = useInvestigationStore((s) => s.collapseSubtechniques)
  const groupSelection = useInvestigationStore((s) => s.groupSelection)
  const ungroupNode = useInvestigationStore((s) => s.ungroupNode)
  const restack = useInvestigationStore((s) => s.restack)
  const clearNodeSize = useInvestigationStore((s) => s.clearNodeSize)
  const nodes = useInvestigationStore((s) => s.nodes)
  const selectedNodeIds = useInvestigationStore((s) => s.selectedNodeIds)
  const rootRef = useRef<HTMLDivElement>(null)

  const node = nodes.find((n) => n.id === menu.nodeId)

  /* The menu acts on the whole selection when the target is part of it. */
  const targets = selectedNodeIds.includes(menu.nodeId) ? selectedNodeIds : [menu.nodeId]

  const subtechniques = useMemo(() => {
    if (!knowledgeBase || node?.type !== 'mitre_technique') return { missing: 0, present: 0 }
    const onCanvas = new Set(nodes.map((n) => n.definitionId))
    const children = knowledgeBase.techniques.filter(
      (tech) => parentTechniqueId(tech.id) === node.definitionId,
    )
    return {
      missing: children.filter((tech) => !onCanvas.has(tech.id)).length,
      present: children.filter((tech) => onCanvas.has(tech.id)).length,
    }
  }, [knowledgeBase, node, nodes])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as globalThis.Node)) onClose()
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  function item(labelKey: TranslationKey, action: () => void, danger = false) {
    return (
      <button
        type="button"
        role="menuitem"
        className={danger ? 'node-context-menu__danger' : undefined}
        onClick={() => {
          action()
          onClose()
        }}
      >
        {t(labelKey)}
      </button>
    )
  }

  return (
    <div
      ref={rootRef}
      className="node-context-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      aria-label={t('canvas.nodeActions')}
    >
      {item('details.duplicate', () => targets.forEach((id) => duplicateNode(id)))}

      {targets.some((id) => {
        const target = nodes.find((n) => n.id === id)
        return target?.size && !target.stroke
      }) && item('canvas.fitToContent', () => clearNodeSize(targets))}

      {targets.length > 1 && item('canvas.group', () => groupSelection())}
      {node?.type === 'group' && item('canvas.ungroup', () => ungroupNode(menu.nodeId))}

      <div className="node-context-menu__divider" aria-hidden="true" />

      {item('canvas.bringToFront', () => restack(targets, 'front'))}
      {item('canvas.bringForward', () => restack(targets, 'forward'))}
      {item('canvas.sendBackward', () => restack(targets, 'backward'))}
      {item('canvas.sendToBack', () => restack(targets, 'back'))}

      {(subtechniques.missing > 0 || subtechniques.present > 0) && (
        <div className="node-context-menu__divider" aria-hidden="true" />
      )}
      {subtechniques.missing > 0 &&
        knowledgeBase &&
        item('canvas.menuExpandSubtechniques', () =>
          expandSubtechniques(menu.nodeId, knowledgeBase, locale),
        )}
      {subtechniques.present > 0 &&
        item('canvas.menuCollapseSubtechniques', () => collapseSubtechniques(menu.nodeId))}

      <div className="node-context-menu__divider" aria-hidden="true" />

      {item('details.delete', () => targets.forEach((id) => removeNode(id)), true)}
    </div>
  )
}
