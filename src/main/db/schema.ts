import { sql } from 'drizzle-orm'
import { sqliteTable, integer, text, uniqueIndex, check } from 'drizzle-orm/sqlite-core'

export const lensVariants = sqliteTable(
  'lens_variants',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    category: text('category', { enum: ['positive', 'negative'] }).notNull(),
    // Integer hundredths of a diopter (0.25 -> 25) to avoid floating point drift.
    sphereHundredths: integer('sphere_hundredths').notNull(),
    cylinderHundredths: integer('cylinder_hundredths').notNull(),
    quantity: integer('quantity').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`)
  },
  (table) => [
    uniqueIndex('lens_variants_variant_unique').on(
      table.category,
      table.sphereHundredths,
      table.cylinderHundredths
    ),
    check('quantity_non_negative', sql`${table.quantity} >= 0`),
    check('sphere_step_quarter', sql`${table.sphereHundredths} % 25 = 0`),
    check('cylinder_step_quarter', sql`${table.cylinderHundredths} % 25 = 0`),
    check('cylinder_non_positive', sql`${table.cylinderHundredths} <= 0`),
    check(
      'sphere_sign_matches_category',
      sql`(${table.category} = 'positive' AND ${table.sphereHundredths} >= 0)
          OR (${table.category} = 'negative' AND ${table.sphereHundredths} < 0)`
    )
  ]
)

// Schema laid down now so a future history/audit UI won't need a migration to add it,
// but nothing in the MVP reads or writes this table yet.
export const stockHistory = sqliteTable('stock_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  variantId: integer('variant_id')
    .notNull()
    .references(() => lensVariants.id, { onDelete: 'cascade' }),
  delta: integer('delta').notNull(),
  resultingQuantity: integer('resulting_quantity').notNull(),
  source: text('source', { enum: ['manual', 'barcode'] })
    .notNull()
    .default('manual'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`)
})

export type LensVariant = typeof lensVariants.$inferSelect
export type NewLensVariant = typeof lensVariants.$inferInsert
export type StockHistoryEntry = typeof stockHistory.$inferSelect
