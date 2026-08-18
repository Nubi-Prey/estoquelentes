import { useCallback, useState } from 'react'
import { DEFAULT_STOCK_TARGET } from '@renderer/lib/matrix'
import { getInitialStockTarget, persistStockTarget } from '@renderer/lib/stockTarget'

interface UseStockTargetResult {
  target: number
  setTarget: (next: number) => void
}

export function useStockTarget(): UseStockTargetResult {
  const [target, setTargetState] = useState<number>(() =>
    getInitialStockTarget(DEFAULT_STOCK_TARGET)
  )

  const setTarget = useCallback((next: number) => {
    setTargetState(next)
    persistStockTarget(next)
  }, [])

  return { target, setTarget }
}
