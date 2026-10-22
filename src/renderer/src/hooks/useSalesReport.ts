import { useCallback, useEffect, useState } from 'react'
import type { MonthlySalesSummary, TopSellingVariant } from '@shared/ipc'

export interface UseSalesReportResult {
  monthlySummary: MonthlySalesSummary[]
  topSellers: TopSellingVariant[]
  selectedDate: string
  setSelectedDate: (date: string) => void
  endDate: string
  setEndDate: (date: string) => void
  summary?: {
    totalSold: number
    totalAdded: number
  }
  loading: boolean
  refetch: () => Promise<void>
}

export function useSalesReport(): UseSalesReportResult {
  const [monthlySummary, setMonthlySummary] = useState<MonthlySalesSummary[]>([])
  const [topSellers, setTopSellers] = useState<TopSellingVariant[]>([])
  const [summary, setSummary] = useState<{ totalSold: number; totalAdded: number } | undefined>()
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const buildRequest = useCallback(() => {
    if (selectedDate && endDate) {
      return { startDate: selectedDate, endDate }
    }
    if (selectedDate) {
      return { periodKey: selectedDate }
    }
    return undefined
  }, [selectedDate, endDate])

  useEffect(() => {
    let active = true
    window.api.getSalesReport(buildRequest()).then((res) => {
      if (!active) return
      setMonthlySummary(res.monthlySummary)
      setTopSellers(res.topSellers)
      setSummary(res.summary)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [buildRequest])

  const refetch = useCallback(async () => {
    const res = await window.api.getSalesReport(buildRequest())
    setMonthlySummary(res.monthlySummary)
    setTopSellers(res.topSellers)
    setSummary(res.summary)
    setLoading(false)
  }, [buildRequest])

  return {
    monthlySummary,
    topSellers,
    selectedDate,
    setSelectedDate,
    endDate,
    setEndDate,
    summary,
    loading,
    refetch
  }
}
