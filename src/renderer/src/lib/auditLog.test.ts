import { describe, expect, it } from 'vitest'
import {
  filterAuditDays,
  formatAuditEntryLens,
  formatDayLabel,
  formatNetMovement,
  groupHistoryByDay
} from './auditLog'
import type { StockHistoryEntry } from '@shared/ipc'

function entry(overrides: Partial<StockHistoryEntry>): StockHistoryEntry {
  return {
    id: 1,
    category: 'positive',
    sphereHundredths: 0,
    cylinderHundredths: 0,
    delta: 1,
    resultingQuantity: 1,
    source: 'manual',
    createdAt: new Date(2026, 7, 18, 10, 0).getTime(),
    ...overrides
  }
}

describe('groupHistoryByDay', () => {
  it('groups entries by local calendar day', () => {
    const day1 = new Date(2026, 7, 17, 9, 0).getTime()
    const day2 = new Date(2026, 7, 18, 9, 0).getTime()

    const days = groupHistoryByDay([
      entry({ id: 1, createdAt: day1 }),
      entry({ id: 2, createdAt: day2 }),
      entry({ id: 3, createdAt: day2 })
    ])

    expect(days).toHaveLength(2)
    expect(days.find((d) => d.dayKey === '2026-08-17')?.entries).toHaveLength(1)
    expect(days.find((d) => d.dayKey === '2026-08-18')?.entries).toHaveLength(2)
  })

  it('orders days most-recent-first', () => {
    const day1 = new Date(2026, 7, 17, 9, 0).getTime()
    const day2 = new Date(2026, 7, 18, 9, 0).getTime()

    const days = groupHistoryByDay([entry({ createdAt: day1 }), entry({ createdAt: day2 })])

    expect(days.map((d) => d.dayKey)).toEqual(['2026-08-18', '2026-08-17'])
  })

  it('sums additions and removals separately for the day total', () => {
    const days = groupHistoryByDay([
      entry({ delta: 5 }),
      entry({ delta: -2 }),
      entry({ delta: -1 })
    ])

    expect(days[0].added).toBe(5)
    expect(days[0].removed).toBe(3)
  })

  it('produces dayStartMs/dayEndMs spanning exactly the local calendar day', () => {
    const days = groupHistoryByDay([entry({})])

    expect(days[0].dayEndMs - days[0].dayStartMs).toBe(24 * 60 * 60 * 1000)
    expect(new Date(days[0].dayStartMs).getHours()).toBe(0)
  })
})

describe('formatDayLabel', () => {
  const now = new Date(2026, 7, 18, 15, 0).getTime()

  it('labels today and yesterday relatively', () => {
    expect(formatDayLabel('2026-08-18', now)).toBe('Hoje')
    expect(formatDayLabel('2026-08-17', now)).toBe('Ontem')
  })

  it('spells out older dates', () => {
    expect(formatDayLabel('2026-08-10', now)).toContain('2026')
    expect(formatDayLabel('2026-08-10', now)).not.toBe('Hoje')
  })
})

describe('formatNetMovement', () => {
  it('matches the requested line format, positive and negative net', () => {
    expect(formatNetMovement(5, 2)).toBe('Movimento total: +3 lentes (Adicionado: 5, Removido: 2)')
    expect(formatNetMovement(1, 4)).toBe('Movimento total: -3 lentes (Adicionado: 1, Removido: 4)')
    expect(formatNetMovement(2, 2)).toBe('Movimento total: 0 lentes (Adicionado: 2, Removido: 2)')
  })
})

describe('formatAuditEntryLens', () => {
  it('formats sphere/cylinder with the app-wide diopter format', () => {
    expect(formatAuditEntryLens(entry({ sphereHundredths: 125, cylinderHundredths: -25 }))).toBe(
      'Lente ESF: +1.25, CIL: -0.25'
    )
  })
})

describe('filterAuditDays', () => {
  const now = new Date(2026, 9, 21, 12, 0).getTime() // 2026-10-21 (Hoje)

  const days = [
    {
      dayKey: '2026-10-21',
      dayStartMs: 0,
      dayEndMs: 0,
      entries: [],
      added: 2,
      removed: 1
    },
    {
      dayKey: '2026-10-20',
      dayStartMs: 0,
      dayEndMs: 0,
      entries: [],
      added: 0,
      removed: 3
    },
    {
      dayKey: '2026-08-15',
      dayStartMs: 0,
      dayEndMs: 0,
      entries: [],
      added: 5,
      removed: 0
    },
    {
      dayKey: '2025-03-10',
      dayStartMs: 0,
      dayEndMs: 0,
      entries: [],
      added: 1,
      removed: 1
    }
  ]

  it('returns all days when search is empty or whitespace', () => {
    expect(filterAuditDays(days, '', now)).toHaveLength(4)
    expect(filterAuditDays(days, '   ', now)).toHaveLength(4)
  })

  it('filters by relative labels like "hoje" or "ontem"', () => {
    const hoje = filterAuditDays(days, 'hoje', now)
    expect(hoje).toHaveLength(1)
    expect(hoje[0].dayKey).toBe('2026-10-21')

    const ontem = filterAuditDays(days, 'ontem', now)
    expect(ontem).toHaveLength(1)
    expect(ontem[0].dayKey).toBe('2026-10-20')
  })

  it('filters by month name (case and accent insensitive)', () => {
    const outubro = filterAuditDays(days, 'outubro', now)
    expect(outubro).toHaveLength(2)
    expect(outubro.map((d) => d.dayKey)).toEqual(['2026-10-21', '2026-10-20'])

    const marco = filterAuditDays(days, 'março', now)
    expect(marco).toHaveLength(1)
    expect(marco[0].dayKey).toBe('2025-03-10')

    const marcoNoAccent = filterAuditDays(days, 'marco', now)
    expect(marcoNoAccent).toHaveLength(1)
  })

  it('filters by date representations (DD/MM, YYYY-MM, YYYY-MM-DD)', () => {
    expect(filterAuditDays(days, '21/10', now)).toHaveLength(1)
    expect(filterAuditDays(days, '2026-08', now)).toHaveLength(1)
    expect(filterAuditDays(days, '2026-10-21', now)).toHaveLength(1)
  })

  it('filters by year', () => {
    expect(filterAuditDays(days, '2025', now)).toHaveLength(1)
    expect(filterAuditDays(days, '2026', now)).toHaveLength(3)
  })

  it('filters by specific day number', () => {
    expect(filterAuditDays(days, '15', now)).toHaveLength(1)
    expect(filterAuditDays(days, '15', now)[0].dayKey).toBe('2026-08-15')
  })

  it('returns empty array when no day matches', () => {
    expect(filterAuditDays(days, 'dezembro', now)).toHaveLength(0)
    expect(filterAuditDays(days, '2024-01-01', now)).toHaveLength(0)
  })
})
