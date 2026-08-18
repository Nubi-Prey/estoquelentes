import { and, eq } from 'drizzle-orm'
import { db } from './client'
import { lensVariants, type LensVariant } from './schema'
import type { AdjustQuantityRequest } from '@shared/ipc'

export function getAllVariants(): LensVariant[] {
  return db.select().from(lensVariants).all()
}

export function adjustVariantQuantity(input: AdjustQuantityRequest): LensVariant {
  const { category, sphereHundredths, cylinderHundredths, delta } = input

  const existing = db
    .select()
    .from(lensVariants)
    .where(
      and(
        eq(lensVariants.category, category),
        eq(lensVariants.sphereHundredths, sphereHundredths),
        eq(lensVariants.cylinderHundredths, cylinderHundredths)
      )
    )
    .get()

  if (!existing) {
    // A variant that doesn't exist yet is exactly how a new row/column gets created —
    // this upsert IS the dynamic-growth mechanism.
    return db
      .insert(lensVariants)
      .values({
        category,
        sphereHundredths,
        cylinderHundredths,
        quantity: Math.max(0, delta)
      })
      .returning()
      .get()
  }

  return db
    .update(lensVariants)
    .set({ quantity: Math.max(0, existing.quantity + delta), updatedAt: new Date() })
    .where(eq(lensVariants.id, existing.id))
    .returning()
    .get()
}
