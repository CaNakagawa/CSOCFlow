import type { ReactNode } from 'react'
import type { TranslationKey } from '../../../shared/i18n'

/**
 * Icons an analyst can put on an element to say what it is at a glance.
 *
 * Drawn on the same 16x16 grid as the tool rail, in stroke only, so they read
 * at card size and take the card's colour. They are illustration and nothing
 * else: correlation never looks at them.
 */
export const NODE_ICONS: Record<string, ReactNode> = {
  bug: (
    <>
      <rect x="5" y="5.6" width="6" height="7.4" rx="3" />
      <path d="M6.3 5a1.7 1.7 0 0 1 3.4 0M2.6 7.4h2.4M11 7.4h2.4M2.6 11h2.4M11 11h2.4M4.4 3.6 5.9 5.1M11.6 3.6 10.1 5.1" />
    </>
  ),
  malware: (
    <>
      <path d="M4 10.4a4.6 4.6 0 1 1 8 0v1.1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1.1Z" />
      <circle cx="6.4" cy="8.6" r="1" />
      <circle cx="9.6" cy="8.6" r="1" />
      <path d="M6.6 12.5v1.3M9.4 12.5v1.3" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="4.2" />
      <path d="m10.2 10.2 3.4 3.4" />
    </>
  ),
  shield: <path d="M8 2.2 13 4.1v4.3c0 2.6-2 4.6-5 5.4-3-.8-5-2.8-5-5.4V4.1L8 2.2Z" />,
  lock: (
    <>
      <rect x="3.6" y="7" width="8.8" height="6.4" rx="1.2" />
      <path d="M5.8 7V5.4a2.2 2.2 0 0 1 4.4 0V7" />
    </>
  ),
  key: (
    <>
      <circle cx="10.4" cy="5.6" r="2.8" />
      <path d="M8.4 7.6 2.8 13.2M4.4 11.2l1.4 1.4M5.9 9.7l1.4 1.4" />
    </>
  ),
  fire: (
    <path d="M8 2.2c2.4 2 3.8 3.8 3.8 5.8a3.8 3.8 0 1 1-7.6 0c0-1.4.7-2.6 1.6-3.6.1 1.1.7 1.8 1.4 1.8.9 0 1.2-1 .8-4Z" />
  ),
  warning: (
    <>
      <path d="M8 2.6 14.4 13H1.6L8 2.6Z" />
      <path d="M8 6.6v3M8 11.4h.01" />
    </>
  ),
  flag: <path d="M3.8 13.8V2.4M3.8 3.2h8l-1.7 2.5L11.8 8.2h-8" />,
  clock: (
    <>
      <circle cx="8" cy="8" r="5.8" />
      <path d="M8 4.6V8l2.4 1.6" />
    </>
  ),
  user: (
    <>
      <circle cx="8" cy="5.6" r="2.6" />
      <path d="M3.4 13.4a4.6 4.6 0 0 1 9.2 0" />
    </>
  ),
  users: (
    <>
      <circle cx="6.2" cy="5.8" r="2.4" />
      <path d="M2.2 13.2a4 4 0 0 1 8 0" />
      <path d="M10.6 3.7a2.4 2.4 0 0 1 0 4.2M11.6 9.6a4 4 0 0 1 2.2 3.6" />
    </>
  ),
  server: (
    <>
      <rect x="2.2" y="2.6" width="11.6" height="4.6" rx="1" />
      <rect x="2.2" y="8.8" width="11.6" height="4.6" rx="1" />
      <path d="M4.6 4.9h.01M4.6 11.1h.01" />
    </>
  ),
  network: (
    <>
      <circle cx="8" cy="8" r="5.8" />
      <path d="M2.4 8h11.2" />
      <path d="M8 2.2c1.6 1.8 2.4 3.8 2.4 5.8S9.6 12 8 13.8C6.4 12 5.6 10 5.6 8S6.4 4 8 2.2Z" />
    </>
  ),
  terminal: (
    <>
      <rect x="2" y="3" width="12" height="10" rx="1.2" />
      <path d="m4.8 6.4 2.2 1.8-2.2 1.8M8.8 10.4h2.8" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="3.6" width="12" height="8.8" rx="1.2" />
      <path d="m2.7 4.7 5.3 3.9 5.3-3.9" />
    </>
  ),
  file: (
    <>
      <path d="M9.2 1.9H4.4a1.2 1.2 0 0 0-1.2 1.2v9.8a1.2 1.2 0 0 0 1.2 1.2h7.2a1.2 1.2 0 0 0 1.2-1.2V5.6L9.2 1.9Z" />
      <path d="M9 2v3.8h3.8" />
    </>
  ),
  database: (
    <>
      <ellipse cx="8" cy="3.9" rx="5.2" ry="2.1" />
      <path d="M2.8 3.9v8.2c0 1.2 2.3 2.1 5.2 2.1s5.2-.9 5.2-2.1V3.9" />
      <path d="M13.2 8c0 1.2-2.3 2.1-5.2 2.1S2.8 9.2 2.8 8" />
    </>
  ),
  cloud: <path d="M4.8 12.4a3.2 3.2 0 0 1-.4-6.4 4 4 0 0 1 7.5-.6 2.9 2.9 0 0 1-.5 7H4.8Z" />,
  link: (
    <>
      <path d="M6.6 9.4a2.6 2.6 0 0 0 3.9.3l2-2a2.6 2.6 0 0 0-3.7-3.7l-1.1 1.1" />
      <path d="M9.4 6.6a2.6 2.6 0 0 0-3.9-.3l-2 2a2.6 2.6 0 0 0 3.7 3.7l1.1-1.1" />
    </>
  ),
  eye: (
    <>
      <path d="M1.6 8S4 3.8 8 3.8 14.4 8 14.4 8 12 12.2 8 12.2 1.6 8 1.6 8Z" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  target: (
    <>
      <circle cx="8" cy="8" r="5.4" />
      <circle cx="8" cy="8" r="2.1" />
      <path d="M8 1v2.2M8 12.8V15M1 8h2.2M12.8 8H15" />
    </>
  ),
  bolt: <path d="M8.9 1.8 3.7 9.2h3.7l-.5 5 5.2-7.4H8.4l.5-5Z" />,
}

/** The order the grid is drawn in, with the labels the analyst reads. */
export const NODE_ICON_KEYS: { value: string; labelKey: TranslationKey }[] = Object.keys(
  NODE_ICONS,
).map((value) => ({ value, labelKey: `icon.${value}` as TranslationKey }))
