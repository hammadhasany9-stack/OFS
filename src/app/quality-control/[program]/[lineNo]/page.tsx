"use client"

import { use } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { ProductionTable } from "@/components/production/ProductionTable"
import { useOrders } from "@/context/OrdersContext"
import { PrintRoomStatus, ProductionItem } from "@/types/order"
import { isCompleteStatus } from "@/types/order"

const PROGRAM_LABELS: Record<string, string> = {
  "single-site": "Single Site",
  "direct-to-patient": "Direct to Patient",
  "at-home": "At-Home",
}

const LINE_BADGE_COLORS: Record<string, string> = {
  "1": "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800",
  "2": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  "3": "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800",
  "4": "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800",
  "5": "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "6": "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800",
}

interface PageProps {
  params: Promise<{ program: string; lineNo: string }>
}

export default function QualityControlStationPage({ params }: PageProps) {
  const { program, lineNo } = use(params)
  const { orders } = useOrders()

  const programLabel = PROGRAM_LABELS[program] ?? program
  const lineBadgeColor = LINE_BADGE_COLORS[lineNo]
  const lineStatus = `Line ${lineNo}` as PrintRoomStatus

  const lineItems: ProductionItem[] = orders.flatMap((order) => {
    if (order.status !== "Inprocess" && !isCompleteStatus(order.status)) return []
    if (order.batches && order.batches.length > 0) {
      return order.batches
        .filter((b) => (b.printRoomStatus ?? "Printroom") === lineStatus)
        .map((b): ProductionItem => ({ order, batch: b }))
    }
    if ((order.printRoomStatus ?? "Printroom") === lineStatus) {
      return [{ order, batch: null }]
    }
    return []
  })

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950">
      <div className="container mx-auto py-8 px-6 max-w-[1600px]">
        <PageHeader
          title={`Quality Control (station 2) – ${programLabel}`}
          subtitle={`Line ${lineNo}`}
          subtitleBadge
          subtitleBadgeClassName={lineBadgeColor}
          subtext="Scan your orders TRF forms to generate Return label and patient label"
        />
        <ProductionTable
          items={lineItems}
          lineNo={lineNo}
          stationType="quality-control"
        />
      </div>
    </div>
  )
}
