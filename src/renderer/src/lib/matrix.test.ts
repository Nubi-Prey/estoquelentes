import { describe, expect, it } from 'vitest'
import {
  deriveSphereRows,
  deriveCylinderColumns,
  findVariant,
  formatDiopter,
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

describe('deriveSphereRows / deriveCylinderColumns', () => {
  it('derives distinct sorted axis values from the current data, not a fixed range', () => {
    const variants = [
      makeVariant({ sphereHundredths: 0, cylinderHundredths: 0 }),
      makeVariant({ sphereHundredths: 400, cylinderHundredths: -200 }),
      makeVariant({ sphereHundredths: -300, cylinderHundredths: -50, category: 'negative' }),
      makeVariant({ sphereHundredths: 400, cylinderHundredths: -50 })
    ]

    expect(deriveSphereRows(variants)).toEqual([400, 0, -300])
    expect(deriveCylinderColumns(variants)).toEqual([0, -50, -200])
  })

  it('grows automatically when a new sphere/cylinder value appears in the data', () => {
    const before = [makeVariant({ sphereHundredths: 400, cylinderHundredths: -200 })]
    const after = [...before, makeVariant({ sphereHundredths: 425, cylinderHundredths: -200 })]

    expect(deriveSphereRows(before)).toEqual([400])
    expect(deriveSphereRows(after)).toEqual([425, 400])
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
