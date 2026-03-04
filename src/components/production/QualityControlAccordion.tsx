"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ProductionItem } from "@/types/order"
import { isCompleteStatus, isPartiallyCompleteStatus } from "@/types/order"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScanLine, CheckCircle2, AlertTriangle, ListX } from "lucide-react"
import { format } from "date-fns"

interface QualityControlAccordionProps {
  item: ProductionItem
}

export function QualityControlAccordion({ item }: QualityControlAccordionProps) {
  const { order, batch } = item
  const totalQty = batch ? batch.size : order.orderQty
  const displayQty = totalQty
  const router = useRouter()
  const params = useParams<{ program: string; lineNo: string }>()

  // Read persisted scan progress from localStorage (client-side only)
  const [pairsCount, setPairsCount] = useState<number | null>(null)
  const [qcFailedCount, setQcFailedCount] = useState<number>(0)
  const [completionSummary, setCompletionSummary] = useState<{
    verifiedCount: number
    failedCount: number
    failedRequisitions?: string[]
  } | null>(null)
  const [failedIdsOpen, setFailedIdsOpen] = useState(false)

  useEffect(() => {
    const key = `medzah_station2_scan_${order.id}${batch ? `_batch_${batch.batchNumber}` : ""}`
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const stored = JSON.parse(raw) as { pairs: unknown[]; qcFailedCount: number }
        setPairsCount(Array.isArray(stored.pairs) ? stored.pairs.length : 0)
        setQcFailedCount(typeof stored.qcFailedCount === "number" ? stored.qcFailedCount : 0)
      } else {
        setPairsCount(0)
        setQcFailedCount(0)
      }
    } catch {
      setPairsCount(0)
      setQcFailedCount(0)
    }
  }, [order.id, batch])

  // For non-batched orders: check the order-level status (handles the partially-complete /
  // QC-failed path where status is set to 'Line X - Partially Complete') OR the
  // order.scanStatus field (handles the no-failure path where status stays 'Inprocess'
  // but Station 2 marks the order as scan-complete).
  // For batched orders the order stays 'Inprocess' until all batches are reviewed,
  // so use only the batch's own scanStatus — never fall back to the order-level
  // status, which reflects all batches combined and would falsely mark an
  // unscanned batch as complete when another batch in the same order is done.
  const isItemComplete =
    batch !== null
      ? (batch.scanStatus === 'Complete' || batch.scanStatus === 'Partially Complete')
      : isCompleteStatus(order.status) || order.scanStatus === 'Complete'

  const isItemPartial =
    batch !== null
      ? batch.scanStatus === 'Partially Complete'
      : isPartiallyCompleteStatus(order.status)

  // Read completion summary when order/batch is marked as any completed state
  useEffect(() => {
    if (!isItemComplete) return
    const summaryKey = `medzah_station2_summary_${order.id}${batch ? `_batch_${batch.batchNumber}` : ""}`
    try {
      const raw = localStorage.getItem(summaryKey)
      if (raw) setCompletionSummary(JSON.parse(raw))
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, order.status, order.scanStatus, batch?.scanStatus, batch?.batchNumber])

  const handleStartScanning = () => {
    const { program, lineNo } = params
    const batchQuery = batch ? `?batch=${batch.batchNumber}` : ""
    router.push(`/quality-control/${program}/${lineNo}/shipping-scanner/${order.id}${batchQuery}`)
  }

  const scanned = pairsCount ?? 0
  const processedKits = scanned + qcFailedCount
  const hasProgress = pairsCount !== null && processedKits > 0
  const remaining = totalQty - processedKits
  const progressPct = totalQty > 0 ? Math.min((processedKits / totalQty) * 100, 100) : 0

  return (
    <div className="p-6 border-t border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/20">
      <div className="grid grid-cols-2 gap-x-12 gap-y-4">
        {/* Left Column – scanning action or completion state */}
        <div className="justify-center gap-4 space-y-4">
          {isItemComplete ? (
            <div className="flex flex-col gap-6">
              {/* Header — amber when partially complete, green when fully complete */}
              <div className="flex items-center gap-2">
                {isItemPartial ? (
                  <>
                    <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      Scanning Partially Complete
                    </p>
                  </>
                ) : (
                  <>
                    <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Scanning Complete
                    </p>
                  </>
                )}
              </div>

              {completionSummary ? (
                <div className="space-y-3">
                  {/* Verified count */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-zinc-400">
                      <span className="font-semibold text-gray-800 dark:text-zinc-200">
                        {completionSummary.verifiedCount} kit{completionSummary.verifiedCount !== 1 ? "s" : ""}
                      </span>{" "}
                      verified — shipping labels sent to print.
                    </span>
                  </div>

                  {/* Failed count (only when > 0) */}
                  {completionSummary.failedCount > 0 && (
                    <div className="flex items-start gap-1.5 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <div className="space-y-1">
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {completionSummary.failedCount} scan{completionSummary.failedCount !== 1 ? "s" : ""} failed QC verification.
                        </span>
                        <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">
                          Failed scan documents can be viewed and printed directly from the{" "}
                          <span className="font-semibold text-gray-700 dark:text-zinc-300">QC Failed</span>{" "}
                          tab in the OFS system after the system has verified them.
                        </p>
                      </div>
                    </div>
                  )}
                  
      {isItemPartial && completionSummary && completionSummary.failedCount > 0 && (
        <div className="pt-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
            onClick={() => setFailedIdsOpen(true)}
          >
            <ListX className="h-4 w-4" />
            Show Failed Control IDs
            <span className="ml-0.5 text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
              {completionSummary.failedCount}
            </span>
          </Button>
        </div>
      )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                  All kits have been verified and shipping labels have been sent to print successfully.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <ScanLine className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <p className="text-sm text-gray-600 dark:text-zinc-400">
                  {hasProgress ? "Scanning in progress — resume below" : "Click to scan return labels and TRF forms"}
                </p>
              </div>
              <Button
                size="sm"
                className="self-start gap-1.5 text-sm"
                onClick={handleStartScanning}
              >
                <ScanLine className="h-4 w-4" />
                {hasProgress ? "Resume Scanning" : "Start scanning shipping labels"}
              </Button>

              {/* Scan progress widget — only shown when there is partial progress */}
              {hasProgress && (
                <div className="pt-1 space-y-2 max-w-[220px]">
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {scanned} verified
                    </span>
                    {qcFailedCount > 0 && (
                      <>
                        <span className="text-gray-300 dark:text-zinc-600">|</span>
                        <span className="text-amber-600 dark:text-amber-400">
                          {qcFailedCount} skipped
                        </span>
                      </>
                    )}
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

     

      {/* ── Failed Control IDs modal ── */}
      <Dialog open={failedIdsOpen} onOpenChange={setFailedIdsOpen}>
        <DialogContent className="max-w-sm dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <ListX className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle className="leading-snug">Failed Control IDs</DialogTitle>
            </div>
            <DialogDescription className="pt-1">
              {completionSummary?.failedCount ?? 0} kit{(completionSummary?.failedCount ?? 0) !== 1 ? "s" : ""} failed QC verification during Station 2 scanning.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 max-h-64 overflow-y-auto py-1 pr-1">
            {(() => {
              const reqs = (completionSummary?.failedRequisitions ?? []).filter(r => r.trim().length > 0)
              return reqs.length > 0 ? (
                reqs.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg"
                  >
                    <span className="text-xs font-semibold text-amber-500 dark:text-amber-400 tabular-nums w-5 flex-shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="text-sm font-mono text-amber-900 dark:text-amber-200 break-all">
                      {req}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-4">
                  No requisition numbers recorded.
                </p>
              )
            })()}
          </div>

          <DialogFooter className="mt-1">
            <Button onClick={() => setFailedIdsOpen(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
