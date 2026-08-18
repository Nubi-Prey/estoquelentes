# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

EstoqueLentes ("lens stock") is a personal-use Electron desktop app for managing the physical inventory of optical lens blocks at the user's optical shop (ótica). Single user, local-first, no multi-tenant/auth concerns.

Stack: TypeScript, Electron + electron-vite, React + Tailwind v4 + hand-rolled shadcn/ui-style components, better-sqlite3 + Drizzle ORM.

## Commands

```bash
npm run dev              # launch the app (electron-vite dev, HMR renderer)
npm run build             # typecheck + production build
npm run start              # preview a production build
npm run typecheck          # tsc --noEmit for both main/preload and renderer configs
npm run lint                # eslint
npm run format               # prettier --write .
npm run test                  # vitest run
npm run db:generate            # drizzle-kit generate — run after editing src/main/db/schema.ts, commit the output under drizzle/
npm run db:studio               # drizzle-kit studio, browse the schema/data
```

There is no build tool chain requirement beyond Node — `better-sqlite3` ships prebuilt N-API binaries (ABI-stable across Node and Electron), so **do not** re-add an `electron-builder install-app-deps` postinstall rebuild step; it forces a node-gyp source build that fails without Visual Studio Build Tools and isn't needed for this dependency.

## Architecture

Three-process Electron split (`src/main`, `src/preload`, `src/renderer`), plus `src/shared` for the IPC contract used by all three:

- **`src/main/db/`** — the only place `better-sqlite3`/Drizzle runs. `schema.ts` defines `lens_variants` (one row per sphere×cylinder cell) and `stock_history` (schema exists, nothing reads/writes it yet — reserved for a future audit/rollback feature). `client.ts` opens the DB in `app.getPath('userData')` and runs migrations from `drizzle/` on startup. `queries.ts` has the core `adjustVariantQuantity` **upsert** — this single function is both "change a cell's quantity" and "grow the matrix" (inserting a not-yet-seen sphere/cylinder pair is exactly how a new row/column appears).
- **`src/main/ipc/stock.ts`** — registers the two `ipcMain.handle` channels (`stock:get-all`, `stock:adjust-quantity`) defined in `src/shared/ipc.ts`.
- **`src/preload/index.ts`** — exposes `window.api.{getAllStock,adjustQuantity}` via `contextBridge`. The renderer never touches Electron/Node APIs directly.
- **`src/renderer/src/lib/matrix.ts`** — pure functions only, no React/Electron deps. Values are stored and manipulated as **integer hundredths of a diopter** (0.25 → `25`) to avoid float drift on repeated 0.25 steps; `formatDiopter`/`toHundredths` convert at the render/input boundary only. `deriveSphereRows`/`deriveCylinderColumns` compute the matrix axes from whatever data currently exists (not a fixed range) — this is what makes the matrix grow automatically. Covered by `matrix.test.ts`; this is the file most worth testing carefully if you touch axis or arithmetic logic.
- **`src/renderer/src/components/StockMatrix.tsx`** — renders one unified matrix (not two separate tables per category); `category` (positive/negative sphere) is a visual divider only, derived by sign (`sphereHundredths >= 0` → positive), matching the DB's own CHECK constraint.
- **`src/renderer/src/hooks/useStock.ts`** — optimistic local state, reconciled with the IPC response; on error it falls back to a full refetch rather than a patch/undo (deliberately simple — data volume is small and single-user).

## Domain model

Lenses are identified by two numeric axes, each stepped in increments of **0.25**:
- **Sphere (esférico)**: sign/category is explicit (not purely derived) because `sphere = 0` belongs to the *positive* category per the original spec.
- **Cylinder (cilindro)**: always ≤ 0.

Both constraints (quarter-step, cylinder ≤ 0, sphere sign matches category, quantity ≥ 0) are enforced twice: client-side in `AddVariantDialog.tsx`/`matrix.ts` for immediate feedback, and as SQLite `CHECK` constraints in `schema.ts` as the source of truth.

### Barcode format (not yet implemented — parsing logic doesn't exist yet)

12-digit barcodes encode a lens variant as `LLLL S EEE I CCC`:

| Field | Positions | Meaning |
|-------|-----------|---------|
| `LLLL` | 0-3 | Lot number — ignore |
| `S` | 4 | Sign: `1` = positive sphere, `0` = negative sphere |
| `EEE` | 5-7 | Sphere magnitude, e.g. `025` → 0.25 |
| `I` | 8 | Ignore |
| `CCC` | 9-11 | Cylinder magnitude, e.g. `025` → 0.25 |

## Current scope

Implemented (MVP): matrix view/edit with manual +/- per cell, add-new-variant dialog, dynamic row/column growth, auto-save (no explicit save step), view/edit mode toggle.

Deliberately not yet implemented (see `EstoqueLentes.md` for the full original spec): barcode scanning, history/audit UI (schema exists), import/export (JSON/SQL), rollback, sales reports.
