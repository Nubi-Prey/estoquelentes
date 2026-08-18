import { useState } from 'react'
import { useStock } from '@renderer/hooks/useStock'
import { StockMatrix } from '@renderer/components/StockMatrix'
import { EditModeToggle } from '@renderer/components/EditModeToggle'
import { AddVariantDialog } from '@renderer/components/AddVariantDialog'
import { ThemeToggle } from '@renderer/components/ThemeToggle'
import { CategoryToggle } from '@renderer/components/CategoryToggle'
import type { LensCategory } from '@shared/ipc'

function App(): React.JSX.Element {
  const { variants, loading, adjust } = useStock()
  const [editMode, setEditMode] = useState(false)
  const [category, setCategory] = useState<LensCategory>('positive')

  return (
    <div className="flex h-screen flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">EstoqueLentes</h1>
        <div className="flex items-center gap-4">
          <EditModeToggle editMode={editMode} onChange={setEditMode} />
          {editMode && <AddVariantDialog defaultCategory={category} onAdd={adjust} />}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-2 overflow-auto">
        <div className="flex justify-end">
          <CategoryToggle category={category} onChange={setCategory} />
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Carregando estoque...
          </div>
        ) : (
          <StockMatrix
            variants={variants}
            category={category}
            editMode={editMode}
            onAdjust={adjust}
          />
        )}
      </main>
    </div>
  )
}

export default App
