import type { ReactNode } from 'react'

/** The icon set for the canvas tool rail, drawn on a 16x16 grid. */
export const TOOL_ICONS: Record<string, ReactNode> = {
  tool: (
    <path d="M10.6 2.6a3.4 3.4 0 0 0-4.4 4.2L2.6 10.4a1.4 1.4 0 0 0 2 2l3.6-3.6a3.4 3.4 0 0 0 4.2-4.4l-2 2-1.8-1.8Z" />
  ),
  select: <path d="M3.4 2.6 12 7.4 8.2 8.6 6.9 12.6 3.4 2.6Z" />,
  add: <path d="M8 3.4v9.2M3.4 8h9.2" />,
  undo: <path d="M3.4 7.6h6.2a3.4 3.4 0 1 1 0 6.8H6.4M3.4 7.6 6.6 4.4M3.4 7.6l3.2 3.2" />,
  redo: <path d="M12.6 7.6H6.4a3.4 3.4 0 1 0 0 6.8h3.2M12.6 7.6 9.4 4.4M12.6 7.6l-3.2 3.2" />,
  link: (
    <>
      <path d="M6.6 9.4a2.6 2.6 0 0 0 3.9.3l2-2a2.6 2.6 0 0 0-3.7-3.7l-1.1 1.1" />
      <path d="M9.4 6.6a2.6 2.6 0 0 0-3.9-.3l-2 2a2.6 2.6 0 0 0 3.7 3.7l1.1-1.1" />
    </>
  ),
  matrix: (
    <>
      <rect x="1.8" y="2.6" width="3.4" height="3" rx="0.6" />
      <rect x="6.3" y="2.6" width="3.4" height="3" rx="0.6" />
      <rect x="10.8" y="2.6" width="3.4" height="3" rx="0.6" />
      <rect x="1.8" y="7.2" width="3.4" height="3" rx="0.6" />
      <rect x="6.3" y="7.2" width="3.4" height="3" rx="0.6" />
    </>
  ),
  text: <path d="M3.4 3.6h9.2M8 3.6v8.8M6.2 12.4h3.6" />,
  whiteboard: (
    <>
      <rect x="2" y="3.2" width="12" height="8.4" rx="1.2" />
      <path d="M4.6 13.4 8 11.6l3.4 1.8" />
    </>
  ),
  draw: <path d="M3 13h2.2l6.4-6.4a1.55 1.55 0 0 0-2.2-2.2L3 10.8V13Z" />,
  duplicate: (
    <>
      <rect x="5.6" y="5.6" width="8" height="8" rx="1.2" />
      <path d="M10.4 5.6V3.6a1.2 1.2 0 0 0-1.2-1.2H3.6a1.2 1.2 0 0 0-1.2 1.2v5.6a1.2 1.2 0 0 0 1.2 1.2h2" />
    </>
  ),
  delete: (
    <path d="M2.8 4.4h10.4M6.4 4.4V2.9h3.2v1.5M4.2 4.4l.55 8.15a1.1 1.1 0 0 0 1.1 1.05h4.3a1.1 1.1 0 0 0 1.1-1.05L11.8 4.4" />
  ),
  erase: <path d="M3.2 12.8h9.6M4.6 10.6l5-5 2.8 2.8-5 5H4.6v-2.8Z" />,
  group: (
    <>
      <rect x="1.8" y="1.8" width="12.4" height="12.4" rx="1.4" strokeDasharray="2.6 2" />
      <rect x="4.4" y="4.4" width="3.2" height="3.2" rx="0.6" />
      <rect x="8.4" y="8.4" width="3.2" height="3.2" rx="0.6" />
    </>
  ),
  // Arrows pushing outward: taking the whole screen, not framing the content.
  fullscreen: (
    <path d="M6.2 2.6H2.6v3.6M9.8 2.6h3.6v3.6M13.4 9.8v3.6H9.8M2.6 9.8v3.6h3.6M2.6 2.6l3.9 3.9M13.4 2.6l-3.9 3.9M13.4 13.4 9.5 9.5M2.6 13.4l3.9-3.9" />
  ),
  new: (
    <>
      <path d="M9 1.9H4.2a1.2 1.2 0 0 0-1.2 1.2v9.8a1.2 1.2 0 0 0 1.2 1.2h7.6a1.2 1.2 0 0 0 1.2-1.2V5.9L9 1.9Z" />
      <path d="M9 1.9v4h4" />
    </>
  ),
  demo: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M6.6 5.6 10.4 8l-3.8 2.4Z" />
    </>
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
  share: (
    <>
      <circle cx="12" cy="3.8" r="1.8" />
      <circle cx="4" cy="8" r="1.8" />
      <circle cx="12" cy="12.2" r="1.8" />
      <path d="M5.6 7.1 10.4 4.7M5.6 8.9l4.8 2.4" />
    </>
  ),
  theme: (
    <>
      <circle cx="8" cy="8" r="4.6" />
      <path d="M8 3.4v9.2" />
      <path d="M8 3.4a4.6 4.6 0 0 1 0 9.2Z" fill="currentColor" stroke="none" />
    </>
  ),
}
