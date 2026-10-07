import { ipcMain } from 'electron'
import { IPC_CHANNELS, type SalesReportResponse } from '@shared/ipc'
import { db } from '../db/client'
import { getMonthlySales, getTopSellingVariants } from '../db/queries'

export function registerReportIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.REPORT_GET_SALES,
    (_event, req?: { monthKey?: string }): SalesReportResponse => {
      const monthlySummary = getMonthlySales(db)
      const topSellers = getTopSellingVariants(db, req?.monthKey)
      return { monthlySummary, topSellers }
    }
  )
}
