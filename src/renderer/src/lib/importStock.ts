import type { ImportVariantItem, LensCategory } from '@shared/ipc'
import { isQuarterStep } from './matrix'

export interface ParseResult {
  items: ImportVariantItem[]
  error?: string
}

function normalizeItem(raw: {
  category?: string
  sphereHundredths?: number
  sphere?: number
  cylinderHundredths?: number
  cylinder?: number
  quantity?: number
}): ImportVariantItem | { error: string } {
  // Sphere resolution
  let sphereHundredths: number
  if (typeof raw.sphereHundredths === 'number') {
    sphereHundredths = raw.sphereHundredths
  } else if (typeof raw.sphere === 'number') {
    sphereHundredths = Math.round(raw.sphere * 100)
  } else {
    return { error: 'Campo esférico ausente ou inválido.' }
  }
  sphereHundredths = sphereHundredths || 0

  // Cylinder resolution
  let cylinderHundredths: number
  if (typeof raw.cylinderHundredths === 'number') {
    cylinderHundredths = raw.cylinderHundredths
  } else if (typeof raw.cylinder === 'number') {
    cylinderHundredths = Math.round(raw.cylinder * 100)
  } else {
    return { error: 'Campo cilindro ausente ou inválido.' }
  }
  cylinderHundredths = cylinderHundredths || 0

  // Category resolution
  let category: LensCategory
  if (raw.category === 'positive' || raw.category === 'negative') {
    category = raw.category
  } else {
    category = sphereHundredths >= 0 ? 'positive' : 'negative'
  }

  // Quantity resolution
  const quantity = Math.max(0, Math.floor(raw.quantity ?? 0))

  // Validations
  if (!isQuarterStep(sphereHundredths)) {
    return { error: `Esférico ${sphereHundredths / 100} não é múltiplo de 0.25.` }
  }
  if (!isQuarterStep(cylinderHundredths)) {
    return { error: `Cilindro ${cylinderHundredths / 100} não é múltiplo de 0.25.` }
  }
  if (cylinderHundredths > 0) {
    return { error: `Cilindro não pode ser positivo (${cylinderHundredths / 100}).` }
  }
  if (category === 'positive' && sphereHundredths < 0) {
    return { error: `Esférico negativo (${sphereHundredths / 100}) na categoria positiva.` }
  }
  if (category === 'negative' && sphereHundredths >= 0) {
    return { error: `Esférico positivo ou zero (${sphereHundredths / 100}) na categoria negativa.` }
  }

  return { category, sphereHundredths, cylinderHundredths, quantity }
}

export function parseStockJson(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) return { items: [], error: 'Conteúdo JSON vazio.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { items: [], error: 'Sintaxe JSON inválida.' }
  }

  if (!Array.isArray(parsed)) {
    return { items: [], error: 'JSON esperado deve ser uma lista de lentes.' }
  }

  const items: ImportVariantItem[] = []
  for (let i = 0; i < parsed.length; i++) {
    const raw = parsed[i]
    if (typeof raw !== 'object' || raw === null) {
      return { items: [], error: `Item na posição ${i + 1} não é um objeto válido.` }
    }
    const result = normalizeItem(raw as Parameters<typeof normalizeItem>[0])
    if ('error' in result) {
      return { items: [], error: `Erro na linha ${i + 1}: ${result.error}` }
    }
    items.push(result)
  }

  return { items }
}

export function parseStockSql(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) return { items: [], error: 'Conteúdo SQL vazio.' }

  // Match: ('positive', 0, 0, 2) or ('negative', -25, -50, 1)
  const rowRegex = /\(\s*'(positive|negative)'\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(\d+)\s*\)/g
  const items: ImportVariantItem[] = []
  let match: RegExpExecArray | null

  while ((match = rowRegex.exec(trimmed)) !== null) {
    const [, categoryStr, sphereStr, cylStr, qtyStr] = match
    const category = categoryStr as LensCategory
    const sphereHundredths = Number.parseInt(sphereStr, 10) || 0
    const cylinderHundredths = Number.parseInt(cylStr, 10) || 0
    const quantity = Number.parseInt(qtyStr, 10) || 0

    const result = normalizeItem({ category, sphereHundredths, cylinderHundredths, quantity })
    if ('error' in result) {
      return { items: [], error: `Linha SQL inválida: ${result.error}` }
    }
    items.push(result)
  }

  if (items.length === 0) {
    return {
      items: [],
      error: 'Nenhum comando INSERT INTO lens_variants válido encontrado no SQL.'
    }
  }

  return { items }
}

export function parseStockContent(text: string): ParseResult {
  const trimmed = text.trim()
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return parseStockJson(trimmed)
  }
  return parseStockSql(trimmed)
}
