import { describe, expect, it } from 'vitest'
import {
  buildQuarterStepRange,
  deriveSphereRows,
  deriveCylinderColumns,
  findVariant,
  formatDiopter,
  getStockStatus,
  isQuarterStep,
  toHundredths
} from './matrix'
import type { StockVariant } from '@shared/ipc'

function makeVariant(overrides: Partial<StockVariant>): StockVariant {
  return {
    id: 1,
    category: 'positive',
    sphereHundredths: 0,
    cylinderHundredths: 0,
    quantity: 1,
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  }
}

describe('toHundredths / formatDiopter', () => {
  it('round-trips typical quarter-step values without float drift', () => {
    expect(toHundredths('0.25')).toBe(25)
    expect(toHundredths('-3')).toBe(-300)
    expect(toHundredths('+4.25')).toBe(425)
    expect(formatDiopter(25)).toBe('+0.25')
    expect(formatDiopter(-300)).toBe('-3.00')
    expect(formatDiopter(0)).toBe('0.00')
  })
})

describe('isQuarterStep', () => {
  it('accepts multiples of 25 hundredths (0.25 diopter steps)', () => {
    expect(isQuarterStep(0)).toBe(true)
    expect(isQuarterStep(25)).toBe(true)
    expect(isQuarterStep(-300)).toBe(true)
  })

  it('rejects values off the 0.25 step', () => {
    expect(isQuarterStep(10)).toBe(false)
    expect(isQuarterStep(126)).toBe(false)
  })
})

describe('buildQuarterStepRange', () => {
  it('builds an inclusive range stepped by 0.25 (25 hundredths)', () => {
    expect(buildQuarterStepRange(-100, 0)).toEqual([-100, -75, -50, -25, 0])
  })
})

describe('deriveSphereRows / deriveCylinderColumns', () => {
  it('always includes the full baseline grid for the category, even with zero stock', () => {
    // Ordered by distance from zero: positive counts up (0, 0.25, ...), negative
    // counts down from the value closest to zero (-0.25, -0.50, ...).
    expect(deriveSphereRows([], 'positive')).toEqual(buildQuarterStepRange(0, 400))
    expect(deriveSphereRows([], 'negative')).toEqual(
      buildQuarterStepRange(-300, -25).sort((a, b) => b - a)
    )
    expect(deriveCylinderColumns([], 'positive')).toEqual(
      buildQuarterStepRange(-200, 0).sort((a, b) => b - a)
    )
  })

  it('starts at zero and moves away from it, regardless of sign', () => {
    expect(deriveSphereRows([], 'positive').slice(0, 3)).toEqual([0, 25, 50])
    expect(deriveSphereRows([], 'negative').slice(0, 3)).toEqual([-25, -50, -75])
  })

  it('only counts variants belonging to the requested category', () => {
    const variants = [
      makeVariant({ category: 'positive', sphereHundredths: 0, cylinderHundredths: 0 }),
      makeVariant({ category: 'negative', sphereHundredths: -300, cylinderHundredths: -50 })
    ]

    // -300 must not leak into the positive axis just because it's in the data
    expect(deriveSphereRows(variants, 'positive')).not.toContain(-300)
    expect(deriveSphereRows(variants, 'negative')).toContain(-300)
  })

  it('grows past the baseline when a variant falls outside the known range', () => {
    const variants = [
      makeVariant({ category: 'positive', sphereHundredths: 425, cylinderHundredths: -225 })
    ]

    expect(deriveSphereRows(variants, 'positive').at(-1)).toBe(425)
    expect(deriveCylinderColumns(variants, 'positive')[0]).toBe(0)
    expect(deriveCylinderColumns(variants, 'positive').at(-1)).toBe(-225)
  })
})

describe('getStockStatus', () => {
  it('classifies zero as out of stock, regardless of target', () => {
    expect(getStockStatus(0, 3)).toBe('outOfStock')
    expect(getStockStatus(0, 0)).toBe('outOfStock')
  })

  it('classifies a positive quantity under the target as below target', () => {
    expect(getStockStatus(1, 3)).toBe('belowTarget')
    expect(getStockStatus(2, 3)).toBe('belowTarget')
  })

  it('classifies a quantity at or above the target as at target', () => {
    expect(getStockStatus(3, 3)).toBe('atTarget')
    expect(getStockStatus(10, 3)).toBe('atTarget')
  })
})

describe('findVariant', () => {
  it('finds the variant at a given sphere/cylinder cell', () => {
    const target = makeVariant({ sphereHundredths: 25, cylinderHundredths: -25, quantity: 7 })
    const variants = [makeVariant({ sphereHundredths: 0, cylinderHundredths: 0 }), target]

    expect(findVariant(variants, 25, -25)).toBe(target)
    expect(findVariant(variants, 50, -25)).toBeUndefined()
  })
})
