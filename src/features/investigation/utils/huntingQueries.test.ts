import { describe, expect, it } from 'vitest'
import { buildHuntingQueries } from './huntingQueries'
import type { DetectionAnalytic } from '../../../shared/types/knowledge'

function analytic(partial: Partial<DetectionAnalytic> = {}): DetectionAnalytic {
  return {
    id: 'AN0648',
    detectionStrategyId: 'DET0234',
    description: { en: 'Suspicious handle access to lsass.exe.' },
    url: 'https://attack.mitre.org/detectionstrategies/DET0234#AN0648',
    platforms: ['Windows'],
    logSources: [{ name: 'WinEventLog:Security', channel: 'EventCode=4663, 4670, 4656' }],
    mutableElements: [{ field: 'AccessMask', description: 'Tune per environment' }],
    ...partial,
  }
}

describe('buildHuntingQueries', () => {
  it('returns one starting point per platform', () => {
    const queries = buildHuntingQueries(analytic(), 'en')
    expect(queries.map((q) => q.platform)).toEqual(['kql', 'spl', 'cql'])
  })

  it('targets the table the MITRE log source actually lives in', () => {
    const [kql, spl] = buildHuntingQueries(analytic(), 'en')
    expect(kql.query).toContain('SecurityEvent')
    expect(spl.query).toContain('source="WinEventLog:Security"')
  })

  it('lifts the event codes out of the MITRE channel', () => {
    const [kql, spl] = buildHuntingQueries(analytic(), 'en')
    expect(kql.query).toContain('| where EventID in (4663, 4670, 4656)')
    expect(spl.query).toContain('EventCode=4663 OR EventCode=4670 OR EventCode=4656')
  })

  it('keeps short Sysmon event codes, which a digit-length rule would drop', () => {
    const [kql] = buildHuntingQueries(
      analytic({
        logSources: [
          { name: 'WinEventLog:Security', channel: 'EventCode=4688' },
          { name: 'WinEventLog:Sysmon', channel: 'EventCode=11' },
        ],
      }),
      'en',
    )
    expect(kql.query).toContain('| where EventID in (4688, 11)')
  })

  it('does not mistake numbers in a prose channel for event codes', () => {
    const [kql] = buildHuntingQueries(
      analytic({
        logSources: [{ name: 'auditd:SYSCALL', channel: 'connections to 3 or more hosts' }],
      }),
      'en',
    )
    expect(kql.query).not.toContain('EventID in')
  })

  it('routes a Linux analytic to Linux sources instead of Windows ones', () => {
    const [kql, spl, cql] = buildHuntingQueries(
      analytic({ logSources: [{ name: 'auditd:SYSCALL', channel: 'socket/connect' }] }),
      'en',
    )
    expect(kql.query).toContain('Syslog')
    expect(spl.query).toContain('sourcetype=linux_audit')
    expect(cql.query).toContain('event_platform=Lin')
  })

  it('never claims to be a finished detection', () => {
    for (const query of buildHuntingQueries(analytic(), 'en')) {
      expect(query.query).toContain('TODO')
      expect(query.query.toLowerCase()).toContain('starting point only')
    }
  })

  it('names the tunable parameters MITRE flags', () => {
    const [kql] = buildHuntingQueries(analytic(), 'en')
    expect(kql.query).toContain('Tune before use: AccessMask')
  })

  it('comments SPL the Splunk way and KQL the KQL way', () => {
    const [kql, spl] = buildHuntingQueries(analytic(), 'en')
    expect(kql.query.startsWith('// AN0648')).toBe(true)
    expect(spl.query.startsWith('``` AN0648')).toBe(true)
  })

  it('falls back to a generic source when MITRE names none', () => {
    const [kql, spl] = buildHuntingQueries(analytic({ logSources: [] }), 'en')
    expect(kql.query).toContain('union *')
    expect(spl.query).toContain('index=*')
    // no channel means no invented event codes
    expect(kql.query).not.toContain('EventID in')
  })

  it('uses the analytic description in the reader locale', () => {
    const [kql] = buildHuntingQueries(
      analytic({ description: { en: 'English text', pt: 'Texto em portugues' } }),
      'pt',
    )
    expect(kql.query).toContain('Texto em portugues')
  })
})
