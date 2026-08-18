import { useState } from 'react'
import { useStock } from '@renderer/hooks/useStock'
import { StockMatrix } from '@renderer/components/StockMatrix'
import { EditModeToggle } from '@renderer/components/EditModeToggle'
import { AddVariantDialog } from '@renderer/components/AddVariantDialog'
import { ThemeToggle } from '@renderer/components/ThemeToggle'

function App(): React.JSX.Element {
  const { variants, loading, adjust } = useStock()
  const [editMode, setEditMode] = useState(false)

  return (
    <div className="flex h-screen flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">EstoqueLentes</h1>
        <div className="flex items-center gap-4">
          <EditModeToggle editMode={editMode} onChange={setEditMode} />
          {editMode && <AddVariantDialog onAdd={adjust} />}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Carregando estoque...
          </div>
        ) : (
          <StockMatrix variants={variants} editMode={editMode} onAdjust={adjust} />
        )}
      </main>
    </div>
  )
}

export default App
