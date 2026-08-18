import { useCallback, useEffect, useMemo, useState } from 'react'
import { groupHistoryByDay } from '@renderer/lib/auditLog'
import type { StockHistoryEntry } from '@shared/ipc'

interface UseAuditLogResult {
  days: ReturnType<typeof groupHistoryByDay>
  loading: boolean
  refetch: () => Promise<void>
}

export function useAuditLog(): UseAuditLogResult {
  const [entries, setEntries] = useState<StockHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.getStockHistory().then((data) => {
      setEntries(data)
      setLoading(false)
    })
  }, [])

  const refetch = useCallback(async (): Promise<void> => {
    setEntries(await window.api.getStockHistory())
  }, [])

  const days = useMemo(() => groupHistoryByDay(entries), [entries])

  return { days, loading, refetch }
}
