import { useCallback, useEffect, useState } from 'react'
import type { MonthlySalesSummary, TopSellingVariant } from '@shared/ipc'

interface UseSalesReportResult {
  monthlySummary: MonthlySalesSummary[]
  topSellers: TopSellingVariant[]
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  loading: boolean
  refetch: () => Promise<void>
}

export function useSalesReport(): UseSalesReportResult {
  const [monthlySummary, setMonthlySummary] = useState<MonthlySalesSummary[]>([])
  const [topSellers, setTopSellers] = useState<TopSellingVariant[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    window.api
      .getSalesReport(selectedMonth ? { monthKey: selectedMonth } : undefined)
      .then((res) => {
        if (!active) return
        setMonthlySummary(res.monthlySummary)
        setTopSellers(res.topSellers)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedMonth])

  const refetch = useCallback(async () => {
    const res = await window.api.getSalesReport(
      selectedMonth ? { monthKey: selectedMonth } : undefined
    )
    setMonthlySummary(res.monthlySummary)
    setTopSellers(res.topSellers)
    setLoading(false)
  }, [selectedMonth])

  return {
    monthlySummary,
    topSellers,
    selectedMonth,
    setSelectedMonth,
    loading,
    refetch
  }
}
