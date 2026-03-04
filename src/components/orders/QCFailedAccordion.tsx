"use client"

import { useEffect, useState } from "react"
import { Order, Batch } from "@/types/order"
import { useOrders } from "@/context/OrdersContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Printer,
  ListX,
  FileWarning,
} from "lucide-react"
import { format } from "date-fns"
import { openTRFPrintQCFailed } from "@/lib/trf-print"
import { openKitIdLabelPrintQCFailed } from "@/lib/kit-id-label-print"
import { openShippingLabelPrint } from "@/lib/shipping-label-print"
import { openReturnLabelBulkPrint } from "@/lib/return-label-print"
import { openPatientLabelBulkPrint } from "@/lib/patient-label-print"

interface ScanSummary {
  verifiedCount: number
  failedCount: number
  failedRequisitions?: string[]
}

const printBtnClass =
  "h-8 text-xs gap-1.5 text-primary hover:bg-primary/5 hover:text-primary dark:bg-primary/10 border-primary dark:hover:bg-primary/20 dark:text-zinc-300"

// ── Report Document Issue modal ───────────────────────────────────────────────

const ISSUE_TYPES = [
  { id: "corrupted",      label: "Corrupted / Unreadable File" },
  { id: "barcode",        label: "Barcode Not Matching" },
  { id: "incorrect-data", label: "Incorrect Document Data" },
  { id: "other",          label: "Other" },
] as const

type IssueTypeId = (typeof ISSUE_TYPES)[number]["id"]

interface ReportIssueModalProps {
  open: boolean
  onClose: () => void
  order: Order
  batch?: Batch
  summary: ScanSummary
}

function ReportIssueModal({ open, onClose, order, batch, summary }: ReportIssueModalProps) {
  const [selectedIssues, setSelectedIssues] = useState<Set<IssueTypeId>>(new Set())
  const [otherText, setOtherText] = useState("")
  const [description, setDescription] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<{ issues?: string; description?: string }>({})

  const lineNoMatch = order.status.match(/Line\s+(\d+)/)
  const lineNo = lineNoMatch ? lineNoMatch[1] : "—"
  const statusLabel = batch
    ? `Batch ${batch.batchNumber} – ${batch.scanStatus ?? "Partially Complete"}`
    : order.status.replace(/^Line \d+ [-–] /, "")

  const isFormValid =
    selectedIssues.size > 0 &&
    (!selectedIssues.has("other") || otherText.trim().length > 0) &&
    description.trim().length > 0

  const toggleIssue = (id: IssueTypeId) => {
    setSelectedIssues((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setErrors((prev) => ({ ...prev, issues: undefined }))
  }

  const handleSubmit = () => {
    const next: typeof errors = {}
    if (selectedIssues.size === 0) {
      next.issues = "Select at least one issue type."
    } else if (selectedIssues.has("other") && !otherText.trim()) {
      next.issues = 'Please describe the "Other" issue.'
    }
    if (!description.trim()) {
      next.description = "A description is required."
    }
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    setSubmitted(true)
  }

  const handleClose = () => {
    setSelectedIssues(new Set())
    setOtherText("")
    setDescription("")
    setSubmitted(false)
    setErrors({})
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-lg dark:bg-zinc-900 dark:border-zinc-800 p-0 overflow-hidden">

        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <FileWarning className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-base leading-snug">Report Document Issue</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Submit an issue report for QC-failed documents in this order.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {submitted ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Report Submitted</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xs">
                Your document issue report for Order{" "}
                <span className="font-semibold text-gray-700 dark:text-zinc-300">{order.id}</span> has
                been recorded and will be reviewed.
              </p>
            </div>
            <Button className="mt-2 w-full max-w-[180px]" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[70vh]">
            <div className="px-6 py-5 space-y-6">

              {/* ── Section 1 – Order Information ── */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-700 text-[10px] font-bold text-gray-600 dark:text-zinc-300 flex-shrink-0">
                    1
                  </span>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
                    Order Information
                  </h3>
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 divide-y divide-gray-200 dark:divide-zinc-700 text-xs">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium text-gray-500 dark:text-zinc-400">Order ID</span>
                    <span className="font-semibold text-gray-900 dark:text-zinc-100 font-mono">{order.id}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium text-gray-500 dark:text-zinc-400">Line No.</span>
                    <span className="font-semibold text-gray-900 dark:text-zinc-100">Line {lineNo}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium text-gray-500 dark:text-zinc-400">Processed Date</span>
                    <span className="font-semibold text-gray-900 dark:text-zinc-100">
                      {order.processedDate ? `${format(order.processedDate, "MMM dd, yyyy · HH:mm:ss")} EST` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium text-gray-500 dark:text-zinc-400">Status</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">{statusLabel}</span>
                  </div>
                </div>

                {summary.failedCount > 0 && (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      <span className="font-semibold">{summary.failedCount} kit{summary.failedCount !== 1 ? "s" : ""}</span>{" "}
                      failed QC verification and require document review.
                    </p>
                  </div>
                )}
              </section>

              {/* ── Section 2 – Issue Classification ── */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-700 text-[10px] font-bold text-gray-600 dark:text-zinc-300 flex-shrink-0">
                    2
                  </span>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
                    Issue Classification
                  </h3>
                  <span className="text-[10px] font-medium text-red-500 dark:text-red-400 ml-auto">Required</span>
                </div>

                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Select all issue types that apply to this document problem.
                </p>

                <div className="flex flex-wrap gap-2">
                  {ISSUE_TYPES.map(({ id, label }) => {
                    const active = selectedIssues.has(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleIssue(id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          active
                            ? "bg-primary text-white border-primary"
                            : "bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-gray-300 dark:border-zinc-600 hover:border-primary/60 hover:text-primary dark:hover:text-primary"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                {selectedIssues.has("other") && (
                  <input
                    type="text"
                    placeholder="Please specify the other issue…"
                    value={otherText}
                    onChange={(e) => {
                      setOtherText(e.target.value)
                      setErrors((prev) => ({ ...prev, issues: undefined }))
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                  />
                )}

                {errors.issues && (
                  <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    {errors.issues}
                  </p>
                )}
              </section>

              {/* ── Section 3 – Description ── */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-700 text-[10px] font-bold text-gray-600 dark:text-zinc-300 flex-shrink-0">
                    3
                  </span>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
                    Description
                  </h3>
                  <span className="text-[10px] font-medium text-red-500 dark:text-red-400 ml-auto">Required</span>
                </div>

                <textarea
                  rows={4}
                  placeholder="Describe the issue in detail — include which documents are affected, what was scanned, and any relevant observations…"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    setErrors((prev) => ({ ...prev, description: undefined }))
                  }}
                  className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition resize-none"
                />

                {errors.description && (
                  <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    {errors.description}
                  </p>
                )}
              </section>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 flex gap-2 justify-end bg-gray-50/60 dark:bg-zinc-800/30">
              <Button
                variant="outline"
                onClick={handleClose}
                className="dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!isFormValid} className="gap-2">
                <FileWarning className="h-4 w-4" />
                Submit Report
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Inner layout shared by both non-batched and per-batch views ──────────────

interface ContentProps {
  order: Order
  batch?: Batch
  summary: ScanSummary
  isVerified: boolean
}

function AccordionContent({ order, batch, summary, isVerified }: ContentProps) {
  const { verifiedCount, failedCount, failedRequisitions } = summary
  const [failedIdsOpen, setFailedIdsOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const lineNoMatch = order.status.match(/Line\s+(\d+)/)
  const lineNo = lineNoMatch ? lineNoMatch[1] : null

  // A batch with no scanStatus is still "Inprocess" — suppress all QC-failed UI for it
  const isInprocess = !!batch && !batch.scanStatus

  return (
    <div className="grid grid-cols-2 gap-x-12 gap-y-4">

      {/* Left Column – review section + order details */}
      <div className="space-y-3">

        {/* Completion header — hidden for inprocess batches */}
        {!isInprocess && (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Scanning Partially Complete
            </p>
          </div>
        )}

        {/* Verified / failed counts — hidden for inprocess batches */}
        {!isInprocess && (
          <div className="space-y-2">
            <div className="flex items-start gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 flex-shrink-0" />
              <span className="text-gray-600 dark:text-zinc-400">
                <span className="font-semibold text-gray-800 dark:text-zinc-200">
                  {verifiedCount} kit{verifiedCount !== 1 ? "s" : ""}
                </span>{" "}
                verified — shipping labels sent to print.
              </span>
            </div>
            {failedCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-start gap-1.5 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {failedCount} scan{failedCount !== 1 ? "s" : ""} failed QC verification.
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] gap-1 px-2 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
                  onClick={() => setFailedIdsOpen(true)}
                >
                  <ListX className="h-3 w-3" />
                  Show Failed Control IDs
                </Button>
              </div>
            )}
          </div>
        )}

        

        {/* Order details */}
        
        <div className="space-y-2 pt-4">
          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
              Client Name
            </dt>
            <dd className="text-sm text-gray-900 dark:text-zinc-200 font-medium">{order.clientName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
              Ship To
            </dt>
            <dd className="text-sm text-gray-900 dark:text-zinc-300">{order.shipTo}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
              Processed Date
            </dt>
            <dd className="text-sm text-gray-900 dark:text-zinc-300">
              {order.processedDate ? format(order.processedDate, "MMM dd, yyyy HH:mm:ss") : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
              Customer PO
            </dt>
            <dd className="text-sm text-gray-900 dark:text-zinc-300">{order.customerPO}</dd>
          </div>
          
          {batch && (
            <div>
              <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
                Batch No.
              </dt>
              <dd className="text-sm text-gray-900 dark:text-zinc-300 font-medium">
                Batch {batch.batchNumber}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
              Total Order Quantity
            </dt>
            <dd className="text-sm text-gray-900 dark:text-zinc-300">{batch ? batch.size : order.orderQty}</dd>
          </div>
        </div>
        {/* Report Document Issue button — hidden for inprocess batches */}
        {!isInprocess && (
          <div className="pt-4">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-10 text-sm text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-900/20"
              onClick={() => setReportOpen(true)}
            >
              <FileWarning className="h-3.5 w-3.5" />
              Report Document Issue
            </Button>
          </div>
        )}
      </div>

      {/* Right Column – label counts + print buttons */}
      <div className="space-y-6 w-80">

        <div className="grid grid-cols-2 items-center">
          <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
            Shipping Label
          </dt>
          <dd className="flex items-center gap-3">
            <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{failedCount}</span>
            {failedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className={printBtnClass}
                disabled={!isVerified}
                title={isVerified ? undefined : "Mark order as Verified first"}
                onClick={() => openShippingLabelPrint(order, batch, failedCount)}
              >
                <Printer className="h-3 w-3" />
                Print Shipping Label{failedCount > 1 ? "s" : ""}
              </Button>
            )}
          </dd>
        </div>

        <div className="grid grid-cols-2 items-center">
          <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
            Return Label
          </dt>
          <dd className="flex items-center gap-3">
            <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{failedCount}</span>
            {failedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className={printBtnClass}
                disabled={!isVerified}
                title={isVerified ? undefined : "Mark order as Verified first"}
                onClick={() => openReturnLabelBulkPrint(order.id, failedCount)}
              >
                <Printer className="h-3 w-3" />
                Print Return Label{failedCount > 1 ? "s" : ""}
              </Button>
            )}
          </dd>
        </div>

        <div className="grid grid-cols-2 items-center">
          <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
            TRF Form
          </dt>
          <dd className="flex items-center gap-3">
            <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{failedCount}</span>
            {failedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className={printBtnClass}
                disabled={!isVerified}
                title={isVerified ? undefined : "Mark order as Verified first"}
                onClick={() => openTRFPrintQCFailed(order, batch, failedCount)}
              >
                <Printer className="h-3 w-3" />
                Print TRF Form{failedCount > 1 ? "s" : ""}
              </Button>
            )}
          </dd>
        </div>

        <div className="grid grid-cols-2 items-center">
          <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
            Kit ID Label
          </dt>
          <dd className="flex items-center gap-3">
            <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{failedCount}</span>
            {failedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className={printBtnClass}
                disabled={!isVerified}
                title={isVerified ? undefined : "Mark order as Verified first"}
                onClick={() => openKitIdLabelPrintQCFailed(order, batch, failedCount)}
              >
                <Printer className="h-3 w-3" />
                Print Kit ID Label{failedCount > 1 ? "s" : ""}
              </Button>
            )}
          </dd>
        </div>

        <div className="grid grid-cols-2 items-center">
          <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
            Patient Label
          </dt>
          <dd className="flex items-center gap-3">
            <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{failedCount}</span>
            {failedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className={printBtnClass}
                disabled={!isVerified}
                title={isVerified ? undefined : "Mark order as Verified first"}
                onClick={() => openPatientLabelBulkPrint(order.id, order.clientName, failedCount)}
              >
                <Printer className="h-3 w-3" />
                Print Patient Label{failedCount > 1 ? "s" : ""}
              </Button>
            )}
          </dd>
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
              {failedCount} kit{failedCount !== 1 ? "s" : ""} failed QC verification during Station 2 scanning.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 max-h-64 overflow-y-auto py-1 pr-1">
            {(() => {
              const validReqs = (failedRequisitions ?? []).filter(r => r.trim().length > 0)
              if (validReqs.length > 0) {
                return validReqs.map((req, idx) => (
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
              }
              return (
                <div className="py-3 space-y-1.5 text-center">
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    Requisition IDs were not captured for this session.
                  </p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500">
                    Re-scan this order in Station 2 to record the failed IDs.
                  </p>
                </div>
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

      {/* ── Report Document Issue modal ── */}
      <ReportIssueModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        order={order}
        batch={batch}
        summary={summary}
      />
    </div>
  )
}

// ── Per-batch collapsible row ─────────────────────────────────────────────────

interface BatchRowProps {
  order: Order
  batch: Batch
  summary: ScanSummary
  isVerified: boolean
}

function BatchRow({ order, batch, summary, isVerified }: BatchRowProps) {
  const [expanded, setExpanded] = useState(false)
  const { updateBatchVerificationStatus } = useOrders()

  const lineNoMatch = order.status.match(/Line\s+(\d+)/)
  const lineNo = lineNoMatch ? lineNoMatch[1] : null

  // A "Partially Complete" batch with no explicit verificationStatus is implicitly "Under Verification"
  const isQCFailedBatch = batch.scanStatus === 'Partially Complete'
  const batchVerifStatus = isQCFailedBatch
    ? (batch.verificationStatus ?? 'Under Verification')
    : undefined

  // Auto-verify the batch after 30 seconds (mirrors the order-level prototype timer)
  useEffect(() => {
    if (!isQCFailedBatch || batchVerifStatus === 'Verified') return
    const timer = setTimeout(() => {
      updateBatchVerificationStatus(order.id, batch.batchNumber, 'Verified')
    }, 30_000)
    return () => clearTimeout(timer)
  }, [isQCFailedBatch, batchVerifStatus, order.id, batch.batchNumber, updateBatchVerificationStatus])

  const scanStatusColors: Record<string, string> = {
    Complete: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    'Partially Complete': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    default: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
  }

  const verifStatusColors = {
    'Under Verification': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    Verified: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  }

  const badgeClass =
    batch.scanStatus === 'Complete'
      ? scanStatusColors.Complete
      : batch.scanStatus === 'Partially Complete'
      ? scanStatusColors['Partially Complete']
      : scanStatusColors.default

  const badgeLabel = batch.scanStatus ?? 'Inprocess'

  return (
    <div className="border-t border-gray-200 dark:border-zinc-700">
      <button
        className="w-full flex items-center gap-3 px-6 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-800 dark:text-zinc-200">
          {order.id} — Batch {batch.batchNumber}
        </span>
        {lineNo && (
          <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 px-2 py-0.5 rounded-full">
            Line {lineNo}
          </span>
        )}
        <span className="text-xs text-gray-500 dark:text-zinc-400">Qty: {batch.size}</span>
        <Badge variant="outline" className={`text-xs ${badgeClass}`}>
          {badgeLabel}
        </Badge>
        {batchVerifStatus && (
          <Badge variant="outline" className={`text-xs ${verifStatusColors[batchVerifStatus]}`}>
            {batchVerifStatus}
          </Badge>
        )}
      </button>

      {expanded && (
        <div className="px-6 pb-6 pt-2">
          <AccordionContent
            order={order}
            batch={batch}
            summary={summary}
            isVerified={isVerified}
          />
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface QCFailedAccordionProps {
  order: Order
}

export function QCFailedAccordion({ order }: QCFailedAccordionProps) {
  const hasBatches = order.batches && order.batches.length > 0
  // For non-batched orders, verification is order-level
  const orderIsVerified = order.verificationStatus === 'Verified'

  const [orderSummary, setOrderSummary] = useState<ScanSummary>({ verifiedCount: 0, failedCount: 0 })
  const [batchSummaries, setBatchSummaries] = useState<Record<number, ScanSummary>>({})

  useEffect(() => {
    if (!hasBatches) {
      const key = `medzah_station2_summary_${order.id}`
      try {
        const raw = localStorage.getItem(key)
        if (raw) setOrderSummary(JSON.parse(raw))
      } catch { /* ignore */ }
    } else {
      const summaries: Record<number, ScanSummary> = {}
      for (const batch of order.batches!) {
        const key = `medzah_station2_summary_${order.id}_batch_${batch.batchNumber}`
        try {
          const raw = localStorage.getItem(key)
          summaries[batch.batchNumber] = raw
            ? JSON.parse(raw)
            : { verifiedCount: 0, failedCount: 0 }
        } catch {
          summaries[batch.batchNumber] = { verifiedCount: 0, failedCount: 0 }
        }
      }
      setBatchSummaries(summaries)
    }
  }, [order.id, hasBatches, order.batches])

  return (
    <div className="border-t border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/20">
      {hasBatches ? (
        <div>
          {order.batches!.map((batch) => (
            <BatchRow
              key={batch.batchNumber}
              order={order}
              batch={batch}
              summary={batchSummaries[batch.batchNumber] ?? { verifiedCount: 0, failedCount: 0 }}
              // Each batch uses its own verification status for print-button gating
              isVerified={batch.verificationStatus === 'Verified'}
            />
          ))}
        </div>
      ) : (
        <div className="p-6">
          <AccordionContent
            order={order}
            summary={orderSummary}
            isVerified={orderIsVerified}
          />
        </div>
      )}
    </div>
  )
}
