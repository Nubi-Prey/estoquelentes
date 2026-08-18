import { useCallback, useEffect, useState } from 'react'
import type { AdjustQuantityRequest, StockVariant } from '@shared/ipc'

function applyOptimisticDelta(
  variants: StockVariant[],
  req: AdjustQuantityRequest
): StockVariant[] {
  const index = variants.findIndex(
    (v) =>
      v.category === req.category &&
      v.sphereHundredths === req.sphereHundredths &&
      v.cylinderHundredths === req.cylinderHundredths
  )

  if (index === -1) {
    const placeholder: StockVariant = {
      id: -Date.now(),
      category: req.category,
      sphereHundredths: req.sphereHundredths,
      cylinderHundredths: req.cylinderHundredths,
      quantity: Math.max(0, req.delta),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    return [...variants, placeholder]
  }

  const next = [...variants]
  next[index] = { ...next[index], quantity: Math.max(0, next[index].quantity + req.delta) }
  return next
}

function mergeCanonical(variants: StockVariant[], canonical: StockVariant): StockVariant[] {
  const index = variants.findIndex(
    (v) =>
      v.category === canonical.category &&
      v.sphereHundredths === canonical.sphereHundredths &&
      v.cylinderHundredths === canonical.cylinderHundredths
  )

  if (index === -1) return [...variants, canonical]

  const next = [...variants]
  next[index] = canonical
  return next
}

interface UseStockResult {
  variants: StockVariant[]
  loading: boolean
  adjust: (req: AdjustQuantityRequest) => Promise<void>
}

export function useStock(): UseStockResult {
  const [variants, setVariants] = useState<StockVariant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.getAllStock().then((data) => {
      setVariants(data)
      setLoading(false)
    })
  }, [])

  const adjust = useCallback(async (req: AdjustQuantityRequest): Promise<void> => {
    setVariants((prev) => applyOptimisticDelta(prev, req))

    try {
      const canonical = await window.api.adjustQuantity(req)
      setVariants((prev) => mergeCanonical(prev, canonical))
    } catch {
      setVariants(await window.api.getAllStock())
    }
  }, [])

  return { variants, loading, adjust }
}
