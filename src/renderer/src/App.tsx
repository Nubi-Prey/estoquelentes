import { useState } from 'react'
import { Sidebar, type AppView } from '@renderer/components/Sidebar'
import { InventoryView } from '@renderer/components/InventoryView'
import { ReportView } from '@renderer/components/ReportView'
import { AuditView } from '@renderer/components/AuditView'
import { SettingsView } from '@renderer/components/SettingsView'

function App(): React.JSX.Element {
  const [view, setView] = useState<AppView>('inventory')

  return (
    <div className="flex h-screen">
      <Sidebar view={view} onChange={setView} />

      <main className="flex-1 overflow-hidden">
        {view === 'inventory' && <InventoryView />}
        {view === 'report' && <ReportView />}
        {view === 'audit' && <AuditView />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  )
}

export default App
