import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { describe, expect, it } from 'vitest'
import * as schema from './schema'
import { getAllVariants, adjustVariantQuantity, type Db } from './queries'

function createTestDb(): Db {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, '../../../drizzle') })
  return db
}

describe('adjustVariantQuantity', () => {
  it('creates a new variant when none exists yet (the dynamic-growth mechanism)', () => {
    const db = createTestDb()

    const result = adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 425,
      cylinderHundredths: -50,
      delta: 1
    })

    expect(result.quantity).toBe(1)
    expect(getAllVariants(db)).toHaveLength(1)
  })

  it('increments an existing variant instead of creating a duplicate row', () => {
    const db = createTestDb()
    const input = { category: 'positive' as const, sphereHundredths: 0, cylinderHundredths: 0 }

    adjustVariantQuantity(db, { ...input, delta: 2 })
    const result = adjustVariantQuantity(db, { ...input, delta: 3 })

    expect(result.quantity).toBe(5)
    expect(getAllVariants(db)).toHaveLength(1)
  })

  it('clamps quantity at zero, never goes negative', () => {
    const db = createTestDb()
    const input = { category: 'positive' as const, sphereHundredths: 0, cylinderHundredths: 0 }

    adjustVariantQuantity(db, { ...input, delta: 1 })
    const result = adjustVariantQuantity(db, { ...input, delta: -5 })

    expect(result.quantity).toBe(0)
  })
})
