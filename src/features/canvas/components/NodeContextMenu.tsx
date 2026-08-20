import { useEffect, useMemo, useRef } from 'react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { parentTechniqueId } from '../../correlation/engine/buildSubtechniqueEdges'
import { NODE_PALETTE } from '../utils/nodePalette'
import { NODE_ICONS, NODE_ICON_KEYS } from '../utils/nodeIcons'
import { STROKE_WIDTHS } from '../utils/penSettings'
import { TOOL_ICONS } from './toolIcons'
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
  const setNodeColor = useInvestigationStore((s) => s.setNodeColor)
  const setNodeIcon = useInvestigationStore((s) => s.setNodeIcon)
  const setStrokeWidth = useInvestigationStore((s) => s.setStrokeWidth)
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

  function item(icon: string, labelKey: TranslationKey, action: () => void, danger = false) {
    return (
      <button
        type="button"
        role="menuitem"
        className={`node-context-menu__item${danger ? ' node-context-menu__danger' : ''}`}
        onClick={() => {
          action()
          onClose()
        }}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {TOOL_ICONS[icon]}
        </svg>
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
      {/* Painting the lot at once is the point when several are selected. */}
      <div className="node-context-menu__swatches" role="group" aria-label={t('canvas.colour')}>
        {NODE_PALETTE.map((colour) => (
          <button
            key={colour.value}
            type="button"
            className="node-context-menu__swatch"
            style={{ background: colour.value }}
            aria-label={t(colour.labelKey)}
            title={t(colour.labelKey)}
            onClick={() => {
              setNodeColor(targets, colour.value)
              onClose()
            }}
          />
        ))}
        <button
          type="button"
          className="node-context-menu__swatch node-context-menu__swatch--auto"
          aria-label={t('canvas.colourAuto')}
          title={t('canvas.colourAuto')}
          onClick={() => {
            setNodeColor(targets, null)
            onClose()
          }}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      {/* Thickness belongs to a drawing alone, so it only appears for one. */}
      {targets.some((id) => nodes.find((n) => n.id === id)?.stroke) && (
        <div className="node-context-menu__widths" role="group" aria-label={t('canvas.penWidth')}>
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width}
              type="button"
              className="node-context-menu__width"
              aria-label={t('canvas.penWidthValue', { width: String(width) })}
              title={t('canvas.penWidthValue', { width: String(width) })}
              onClick={() => {
                setStrokeWidth(targets, width)
                onClose()
              }}
            >
              <span style={{ height: `${width}px` }} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {/* Illustration, not classification: an icon never changes correlation. */}
      <div className="node-context-menu__icons" role="group" aria-label={t('canvas.icon')}>
        {NODE_ICON_KEYS.map((icon) => (
          <button
            key={icon.value}
            type="button"
            className="node-context-menu__icon"
            aria-label={t(icon.labelKey)}
            title={t(icon.labelKey)}
            onClick={() => {
              setNodeIcon(targets, icon.value)
              onClose()
            }}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {NODE_ICONS[icon.value]}
            </svg>
          </button>
        ))}
        <button
          type="button"
          className="node-context-menu__icon node-context-menu__icon--none"
          aria-label={t('canvas.iconNone')}
          title={t('canvas.iconNone')}
          onClick={() => {
            setNodeIcon(targets, null)
            onClose()
          }}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <div className="node-context-menu__divider" aria-hidden="true" />

      {item('duplicate', 'details.duplicate', () => targets.forEach((id) => duplicateNode(id)))}

      {targets.some((id) => {
        const target = nodes.find((n) => n.id === id)
        return target?.size && !target.stroke
      }) && item('fit', 'canvas.fitToContent', () => clearNodeSize(targets))}

      {targets.length > 1 && item('group', 'canvas.group', () => groupSelection())}
      {node?.type === 'group' && item('ungroup', 'canvas.ungroup', () => ungroupNode(menu.nodeId))}

      <div className="node-context-menu__divider" aria-hidden="true" />

      {item('bringToFront', 'canvas.bringToFront', () => restack(targets, 'front'))}
      {item('bringForward', 'canvas.bringForward', () => restack(targets, 'forward'))}
      {item('sendBackward', 'canvas.sendBackward', () => restack(targets, 'backward'))}
      {item('sendToBack', 'canvas.sendToBack', () => restack(targets, 'back'))}

      {(subtechniques.missing > 0 || subtechniques.present > 0) && (
        <div className="node-context-menu__divider" aria-hidden="true" />
      )}
      {subtechniques.missing > 0 &&
        knowledgeBase &&
        item('expand', 'canvas.menuExpandSubtechniques', () =>
          expandSubtechniques(menu.nodeId, knowledgeBase, locale),
        )}
      {subtechniques.present > 0 &&
        item('collapse', 'canvas.menuCollapseSubtechniques', () =>
          collapseSubtechniques(menu.nodeId),
        )}

      <div className="node-context-menu__divider" aria-hidden="true" />

      {item('delete', 'details.delete', () => targets.forEach((id) => removeNode(id)), true)}
    </div>
  )
}
