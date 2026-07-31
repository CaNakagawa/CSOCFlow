import type { DetectionAnalytic } from '../../../shared/types/knowledge'
import { localize, type Locale } from '../../../shared/i18n'

export type HuntingPlatform = 'kql' | 'spl' | 'cql'

export interface HuntingQuery {
  platform: HuntingPlatform
  label: string
  query: string
}

export const HUNTING_PLATFORMS: { platform: HuntingPlatform; label: string }[] = [
  { platform: 'kql', label: 'KQL — Sentinel / Defender' },
  { platform: 'spl', label: 'SPL — Splunk' },
  { platform: 'cql', label: 'CQL — CrowdStrike' },
]

interface SourceTarget {
  kqlTable: string
  splSource: string
  cqlFilter: string
}

/**
 * Maps a MITRE log source prefix onto the table or sourcetype each platform
 * stores it in. Only the destination is asserted here — never the detection
 * logic, which stays a TODO for the analyst.
 */
const SOURCE_TARGETS: { match: RegExp; target: SourceTarget }[] = [
  {
    match: /^WinEventLog:Sysmon/i,
    target: {
      kqlTable: 'Event\n| where Source == "Microsoft-Windows-Sysmon"',
      splSource: 'source="WinEventLog:Microsoft-Windows-Sysmon/Operational"',
      cqlFilter: 'event_platform=Win',
    },
  },
  {
    match: /^WinEventLog:Security/i,
    target: {
      kqlTable: 'SecurityEvent',
      splSource: 'source="WinEventLog:Security"',
      cqlFilter: 'event_platform=Win',
    },
  },
  {
    match: /^WinEventLog/i,
    target: {
      kqlTable: 'Event',
      splSource: 'source="WinEventLog:*"',
      cqlFilter: 'event_platform=Win',
    },
  },
  {
    match: /^auditd|^linux/i,
    target: {
      kqlTable: 'Syslog',
      splSource: 'sourcetype=linux_audit',
      cqlFilter: 'event_platform=Lin',
    },
  },
  {
    match: /^macos/i,
    target: {
      kqlTable: 'Syslog',
      splSource: 'sourcetype=osquery_results',
      cqlFilter: 'event_platform=Mac',
    },
  },
  {
    match: /^AWS/i,
    target: {
      kqlTable: 'AWSCloudTrail',
      splSource: 'sourcetype=aws:cloudtrail',
      cqlFilter: 'event_platform=*',
    },
  },
  {
    match: /^azure/i,
    target: {
      kqlTable: 'AzureActivity',
      splSource: 'sourcetype=azure:activity',
      cqlFilter: 'event_platform=*',
    },
  },
  {
    match: /^m365|^saas/i,
    target: {
      kqlTable: 'OfficeActivity',
      splSource: 'sourcetype=o365:management:activity',
      cqlFilter: 'event_platform=*',
    },
  },
  {
    match: /^NSM|^networkdevice/i,
    target: {
      kqlTable: 'CommonSecurityLog',
      splSource: 'sourcetype=stream:*',
      cqlFilter: 'event_simpleName=NetworkConnect*',
    },
  },
]

const FALLBACK_TARGET: SourceTarget = {
  kqlTable: 'union *',
  splSource: 'index=*',
  cqlFilter: 'event_platform=*',
}

function targetFor(analytic: DetectionAnalytic): SourceTarget {
  const first = analytic.logSources[0]?.name ?? ''
  return SOURCE_TARGETS.find((entry) => entry.match.test(first))?.target ?? FALLBACK_TARGET
}

/**
 * MITRE writes channels like "EventCode=4663, 4670, 4656".
 *
 * Anchored on the EventCode/EventID key rather than on any number in the
 * string: Sysmon codes are one or two digits (1, 10, 11, 22), so a
 * digit-length rule would silently drop them, while a bare number rule would
 * pick up digits out of prose channels.
 */
function eventCodes(analytic: DetectionAnalytic): string[] {
  const codes = new Set<string>()
  for (const source of analytic.logSources) {
    for (const match of source.channel.matchAll(/\b(?:EventCode|EventID)\s*=\s*([\d,\s]+)/gi)) {
      for (const code of match[1].split(',')) {
        const trimmed = code.trim()
        if (trimmed) codes.add(trimmed)
      }
    }
  }
  return [...codes]
}

/** Splunk comments are ```like this```; KQL and CQL both use //. */
function header(analytic: DetectionAnalytic, locale: Locale, style: 'slash' | 'splunk'): string[] {
  const wrap = (text: string) => (style === 'splunk' ? `\`\`\` ${text} \`\`\`` : `// ${text}`)

  const lines = [
    wrap(
      `${analytic.id} (${analytic.detectionStrategyId}) — ${localize(analytic.description, locale)}`,
    ),
  ]

  if (analytic.logSources.length > 0) {
    const sources = analytic.logSources
      .map((s) => (s.channel ? `${s.name} [${s.channel}]` : s.name))
      .join(', ')
    lines.push(wrap(`MITRE log sources: ${sources}`))
  }
  if (analytic.mutableElements.length > 0) {
    lines.push(wrap(`Tune before use: ${analytic.mutableElements.map((m) => m.field).join(', ')}`))
  }

  lines.push(wrap('Starting point only — the detection logic below is a TODO.'))
  return lines
}

/**
 * Builds a hunting query starting point for each platform.
 *
 * MITRE publishes no queries, so only what it does publish is asserted: the
 * table or sourcetype the signal lives in, and the event codes named in the
 * channel. The predicate that would actually implement the analytic is left as
 * an explicit TODO rather than invented, because a fabricated detection that
 * looks finished is worse than none during a live investigation.
 */
export function buildHuntingQueries(analytic: DetectionAnalytic, locale: Locale): HuntingQuery[] {
  const target = targetFor(analytic)
  const codes = eventCodes(analytic)

  const kql = [
    ...header(analytic, locale, 'slash'),
    target.kqlTable,
    '| where TimeGenerated > ago(24h)',
    ...(codes.length > 0 ? [`| where EventID in (${codes.join(', ')})`] : []),
    '// TODO: express the analytic above as a filter',
    '| take 100',
  ].join('\n')

  const splCodes = codes.length > 0 ? ` (${codes.map((c) => `EventCode=${c}`).join(' OR ')})` : ''
  const spl = [
    ...header(analytic, locale, 'splunk'),
    `${target.splSource}${splCodes} earliest=-24h`,
    '``` TODO: express the analytic above as a filter ```',
    '| head 100',
  ].join('\n')

  const cql = [
    ...header(analytic, locale, 'slash'),
    target.cqlFilter,
    '// TODO: express the analytic above as a filter',
    '| tail(100)',
  ].join('\n')

  return [
    { platform: 'kql', label: HUNTING_PLATFORMS[0].label, query: kql },
    { platform: 'spl', label: HUNTING_PLATFORMS[1].label, query: spl },
    { platform: 'cql', label: HUNTING_PLATFORMS[2].label, query: cql },
  ]
}
