import { formatDiopter } from './matrix'
import type { StockHistoryEntry } from '@shared/ipc'

export interface AuditDay {
  dayKey: string
  dayStartMs: number
  dayEndMs: number
  entries: StockHistoryEntry[]
  added: number
  removed: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function toDayKey(epochMs: number): string {
  const d = new Date(epochMs)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayStartMs(dayKey: string): number {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime()
}

// Groups already-sorted (most-recent-first) history entries by local calendar day,
// most recent day first. Entries keep whatever relative order they arrived in.
export function groupHistoryByDay(entries: StockHistoryEntry[]): AuditDay[] {
  const byDay = new Map<string, StockHistoryEntry[]>()

  for (const entry of entries) {
    const key = toDayKey(entry.createdAt)
    const list = byDay.get(key)
    if (list) {
      list.push(entry)
    } else {
      byDay.set(key, [entry])
    }
  }

  return [...byDay.entries()]
    .map(([dayKey, dayEntries]) => {
      const start = dayStartMs(dayKey)
      const added = dayEntries.filter((e) => e.delta > 0).reduce((sum, e) => sum + e.delta, 0)
      const removed = dayEntries
        .filter((e) => e.delta < 0)
        .reduce((sum, e) => sum + Math.abs(e.delta), 0)

      return {
        dayKey,
        dayStartMs: start,
        dayEndMs: start + DAY_MS,
        entries: dayEntries,
        added,
        removed
      }
    })
    .sort((a, b) => b.dayStartMs - a.dayStartMs)
}

export function formatDayLabel(dayKey: string, now: number = Date.now()): string {
  if (dayKey === toDayKey(now)) return 'Hoje'
  if (dayKey === toDayKey(now - DAY_MS)) return 'Ontem'

  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

export function formatNetMovement(added: number, removed: number): string {
  const net = added - removed
  const sign = net > 0 ? '+' : ''
  return `Movimento total: ${sign}${net} lentes (Adicionado: ${added}, Removido: ${removed})`
}

export function formatAuditEntryLens(entry: StockHistoryEntry): string {
  return `Lente ESF: ${formatDiopter(entry.sphereHundredths)}, CIL: ${formatDiopter(entry.cylinderHundredths)}`
}

export function formatAuditEntryTime(entry: StockHistoryEntry): string {
  return new Date(entry.createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
