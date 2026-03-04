"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ProductionItem } from "@/types/order"
import { isCompleteStatus } from "@/types/order"
import { Button } from "@/components/ui/button"
import { ScanLine, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"

interface ProductionAccordionProps {
  item: ProductionItem
}

export function ProductionAccordion({ item }: ProductionAccordionProps) {
  const { order, batch } = item
  const displayQty = batch ? batch.size : order.orderQty
  const totalTRF = batch ? batch.size : order.trfFormCount
  const router = useRouter()
  const params = useParams<{ program: string; lineNo: string }>()

  // Read persisted scan progress from localStorage (client-side only)
  const [scanCount, setScanCount] = useState<number | null>(null)
  // Track whether Station 1 has fully completed (summary key written by trf-scanner on completion)
  const [s1SummaryCount, setS1SummaryCount] = useState<number | null>(null)
  useEffect(() => {
    const key = `medzah_trf_scan_${order.id}${batch ? `_batch_${batch.batchNumber}` : ""}`
    const summaryKey = `medzah_trf_summary_${order.id}${batch ? `_batch_${batch.batchNumber}` : ""}`
    try {
      const raw = localStorage.getItem(key)
      setScanCount(raw ? (JSON.parse(raw) as unknown[]).length : 0)
    } catch {
      setScanCount(0)
    }
    try {
      const summaryRaw = localStorage.getItem(summaryKey)
      if (summaryRaw) {
        const summary = JSON.parse(summaryRaw) as { scannedCount: number }
        setS1SummaryCount(summary.scannedCount ?? 0)
      } else {
        setS1SummaryCount(0)
      }
    } catch {
      setS1SummaryCount(0)
    }
  }, [order.id, batch])

  const handleStartScanning = () => {
    const base = `/production/${params.program}/${params.lineNo}/trf-scanner/${order.id}`
    const url = batch ? `${base}?batch=${batch.batchNumber}` : base
    router.push(url)
  }

  const hasProgress = scanCount !== null && scanCount > 0
  const remaining = totalTRF - (scanCount ?? 0)
  const progressPct = totalTRF > 0 ? Math.min(((scanCount ?? 0) / totalTRF) * 100, 100) : 0

  // Station 1 is locally complete when the trf-scanner has written its summary key
  // (it deletes the in-progress key on completion, so scanCount alone cannot detect this).
  const s1ScanComplete = s1SummaryCount !== null && totalTRF > 0 && s1SummaryCount >= totalTRF

  // For non-batched orders: complete when S1 localStorage summary exists (S1 done,
  // S2 not yet started), OR when order.scanStatus is set (S2 finished with no failures),
  // OR when order-level status reflects any completed state (e.g. partially complete).
  // For batched orders the order stays 'Inprocess' until all batches are reviewed,
  // so use only the batch's own scanStatus — never fall back to the order-level
  // status, which reflects all batches combined and would falsely mark an
  // unscanned batch as complete when another batch in the same order is done.
  const isItemComplete =
    batch !== null
      ? (batch.scanStatus === 'Complete' || batch.scanStatus === 'Partially Complete') || s1ScanComplete
      : isCompleteStatus(order.status) || s1ScanComplete || order.scanStatus === 'Complete'

  return (
    <div className="p-6 border-t border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/20">
      <div className="grid grid-cols-2 gap-x-12 gap-y-4">
        {/* Left Column – scanning action or completion state */}
        <div className="justify-center gap-4 space-y-4">
          {isItemComplete ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Scanning Complete
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                All TRF forms have been scanned and labels have been sent to print successfully.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <ScanLine className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <p className="text-sm text-gray-600 dark:text-zinc-400">
                  {hasProgress ? "Scanning in progress — resume below" : "Click to scan TRF forms"}
                </p>
              </div>
              <Button
                size="sm"
                className="self-start gap-1.5 text-sm"
                onClick={handleStartScanning}
              >
                <ScanLine className="h-4 w-4" />
                {hasProgress ? "Resume Scanning" : "Start scanning return labels"}
              </Button>

              {/* Scan progress widget — only shown when there is partial progress */}
              {hasProgress && (
                <div className="pt-1 space-y-2 max-w-[220px]">
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  {/* Counts row */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {scanCount} scanned
                    </span>
                    <span className="text-gray-300 dark:text-zinc-600">|</span>
                    <span className="text-gray-500 dark:text-zinc-400">
                      {remaining} remaining
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column – order details */}
        <div className="space-y-3">
          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
              Client Name
            </dt>
            <dd className="text-sm text-gray-900 dark:text-zinc-200 font-medium">
              {order.clientName}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
              Ship To
            </dt>
            <dd className="text-sm text-gray-900 dark:text-zinc-300">{order.shipTo}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
              Processed Date
            </dt>
            <dd className="text-sm text-gray-900 dark:text-zinc-300">
              {order.processedDate ? format(order.processedDate, "MMM dd, yyyy HH:mm:ss") : '—'}
            </dd>
          </div>

          {batch && (
            <div>
              <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                Total Order Quantity
              </dt>
              <dd className="text-sm text-gray-900 dark:text-zinc-300 font-medium">
                {order.orderQty}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
              {batch ? `Batch ${batch.batchNumber} Quantity` : "Total Order Quantity"}
            </dt>
            <dd className="text-sm text-gray-900 dark:text-zinc-300 font-medium">
              {displayQty}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
              PO No.
            </dt>
            <dd className="text-sm text-gray-900 dark:text-zinc-300">
              {order.customerPO}
            </dd>
          </div>
        </div>
      </div>
    </div>
  )
}
