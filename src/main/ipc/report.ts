import { ipcMain } from 'electron'
import { IPC_CHANNELS, type SalesReportRequest, type SalesReportResponse } from '@shared/ipc'
import { db } from '../db/client'
import { getMonthlySales, getSalesSummary, getTopSellingVariants } from '../db/queries'

export function registerReportIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.REPORT_GET_SALES,
    (_event, req?: SalesReportRequest): SalesReportResponse => {
      const monthlySummary = getMonthlySales(db)
      const filter = {
        periodKey: req?.periodKey ?? req?.monthKey,
        startDate: req?.startDate,
        endDate: req?.endDate
      }
      const topSellers = getTopSellingVariants(db, filter)
      const summary = getSalesSummary(db, filter)
      return { monthlySummary, topSellers, summary }
    }
  )
}
