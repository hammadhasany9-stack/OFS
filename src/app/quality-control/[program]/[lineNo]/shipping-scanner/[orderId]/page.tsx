"use client"

import { use, useEffect, useRef, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  ScanBarcode,
  CheckCircle2,
  KeyboardIcon,
  AlertTriangle,
  XCircle,
  Package,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useOrders } from "@/context/OrdersContext"
import { useNavGuard } from "@/context/NavGuardContext"
import type { Order, Batch } from "@/types/order"
import { isCompleteStatus } from "@/types/order"

const PROGRAM_LABELS: Record<string, string> = {
  "single-site": "Single Site",
  "direct-to-patient": "Direct to Patient",
  "at-home": "At-Home",
}

type ScanPhase = "return-label" | "trf-form"

interface ScannedPair {
  returnLabelRaw: string
  trfRaw: string
  patientName: string
  requisitionNo: string
  patientDob: string
}

/** Shape of a TRF entry as stored by Station 1 in localStorage */
interface S1TRFEntry {
  barcodeRaw: string
  patientName: string
  requisitionNo: string
  patientDob: string
}

/** Parse the order-info barcode on the return label: ORDER_ID|KIT_NAME|KIT_ID */
function parseReturnLabelBarcode(raw: string): { orderId: string; kitName: string; kitId: string } | null {
  const parts = raw.trim().split("|")
  if (parts.length >= 3) {
    return { orderId: parts[0].trim(), kitName: parts[1].trim(), kitId: parts[2].trim() }
  }
  return null
}

/** Parse TRF barcode: PATIENT_NAME|REQUISITION_NO|DOB */
function parseTRFBarcode(raw: string): { patientName: string; requisitionNo: string; patientDob: string } | null {
  const parts = raw.trim().split("|")
  if (parts.length >= 3) {
    return {
      patientName: parts[0].trim(),
      requisitionNo: parts[1].trim(),
      patientDob: parts[2].trim(),
    }
  }
  return null
}

function station2StorageKey(orderId: string, batchParam: string | null) {
  return `medzah_station2_scan_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
}

interface PageProps {
  params: Promise<{ program: string; lineNo: string; orderId: string }>
}

export default function ShippingScannerPage({ params }: PageProps) {
  const { program, lineNo, orderId } = use(params)
  const searchParams = useSearchParams()
  const batchParam = searchParams.get("batch")

  const router = useRouter()
  const { orders, updateOrderStatus, updateVerificationStatus, updateBatchScanStatus, updateOrderScanStatus } = useOrders()
  const { setGuard } = useNavGuard()

  const order = orders.find((o) => o.id === orderId) as Order | undefined
  const batch: Batch | undefined =
    batchParam && order?.batches
      ? order.batches.find((b) => b.batchNumber === Number(batchParam))
      : undefined

  const totalQty = batch ? batch.size : (order?.orderQty ?? 0)
  const programLabel = PROGRAM_LABELS[program] ?? program
  const backHref = `/quality-control/${program}/${lineNo}`

  // ── Core state ──
  const [scannedPairs, setScannedPairs] = useState<ScannedPair[]>([])
  const [qcFailedCount, setQcFailedCount] = useState(0)
  const [failedRequisitions, setFailedRequisitions] = useState<string[]>([])
  const [currentPhase, setCurrentPhase] = useState<ScanPhase>("return-label")

  // Effective total = original qty minus skipped (QC-failed) kits
  const effectiveTotalQty = totalQty - qcFailedCount

  // Pending verified return-label data waiting for TRF scan
  const pendingReturnRef = useRef<{ raw: string } | null>(null)
  // Holds the requisition number (or raw barcode) for the kit currently failing QC
  const pendingFailedReqRef = useRef<string>("")

  // ── S1 restriction + validation state ──
  const [s1ScannedCount, setS1ScannedCount] = useState(0)
  const [s1ScannedEntries, setS1ScannedEntries] = useState<S1TRFEntry[]>([])
  const [s1BlockedOpen, setS1BlockedOpen] = useState(false)

  // ── Modal state ──
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [verifyData, setVerifyData] = useState<{ orderId: string; kitName: string; kitId: string } | null>(null)
  const [mismatchModalOpen, setMismatchModalOpen] = useState(false)
  const [qcFailedModalOpen, setQcFailedModalOpen] = useState(false)
  const [qcFailedReason, setQcFailedReason] = useState<"invalid" | "s1-mismatch">("invalid")
  const [manualOpen, setManualOpen] = useState(false)
  const [manualValue, setManualValue] = useState("")
  const [manualError, setManualError] = useState("")
  const [backConfirmOpen, setBackConfirmOpen] = useState(false)
  const [backConfirmDest, setBackConfirmDest] = useState("")

  const completionFiredRef = useRef(false)
  const keyBuffer = useRef("")
  const keyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Updated synchronously inside handleBarcode before any modal open so that even
  // a stale handleKeyDown closure stops processing immediately.
  const scanBlockedRef = useRef(false)

  const shippingAnchorRef = useRef<HTMLAnchorElement>(null)

  // Complete when every kit has been either verified or failed
  const isComplete = totalQty > 0 && (scannedPairs.length + qcFailedCount) >= totalQty

  // ── Nav guard ──
  useEffect(() => {
    if ((scannedPairs.length > 0 || qcFailedCount > 0) && !isComplete) {
      setGuard(() => {
        setBackConfirmDest("/production-team")
        setBackConfirmOpen(true)
      })
    } else {
      setGuard(null)
    }
    return () => setGuard(null)
  }, [scannedPairs.length, qcFailedCount, isComplete, setGuard])

  // ── Restore progress from localStorage ──
  useEffect(() => {
    const key = station2StorageKey(orderId, batchParam)
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const stored = JSON.parse(raw) as { pairs: ScannedPair[]; qcFailedCount: number; failedRequisitions?: string[] }
        if (stored && Array.isArray(stored.pairs)) {
          if (stored.pairs.length > 0) setScannedPairs(stored.pairs)
          if (stored.qcFailedCount > 0) setQcFailedCount(stored.qcFailedCount)
          if (Array.isArray(stored.failedRequisitions) && stored.failedRequisitions.length > 0)
            setFailedRequisitions(stored.failedRequisitions)
          setCurrentPhase("return-label")
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Persist progress ──
  useEffect(() => {
    if (scannedPairs.length === 0 && qcFailedCount === 0) return
    const key = station2StorageKey(orderId, batchParam)
    localStorage.setItem(key, JSON.stringify({ pairs: scannedPairs, qcFailedCount, failedRequisitions }))
  }, [scannedPairs, qcFailedCount, failedRequisitions, orderId, batchParam])

  // ── Cleanup on complete + mark order status ──
  // No QC failures → "Line X - Complete"
  // Any QC failures → "Line X - Partially Complete"
  useEffect(() => {
    if (!isComplete) {
      completionFiredRef.current = false
      return
    }
    if (completionFiredRef.current) return
    completionFiredRef.current = true
    const key = station2StorageKey(orderId, batchParam)
    localStorage.removeItem(key)
    // Persist a summary so the QC accordion can read final counts
    const summaryKey = `medzah_station2_summary_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
    localStorage.setItem(summaryKey, JSON.stringify({ verifiedCount: scannedPairs.length, failedCount: qcFailedCount, failedRequisitions }))
    // Clean up Station 1's data — S1's scan key and summary are only consumed by
    // Station 2, so clearing them here ensures the next scan session starts with the
    // restriction correctly applied (Station 2 blocked until Station 1 scans fresh).
    const s1ScanKey = `medzah_trf_scan_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
    const s1SummaryKey = `medzah_trf_summary_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
    localStorage.removeItem(s1ScanKey)
    localStorage.removeItem(s1SummaryKey)
    if (batchParam) {
      // Per-batch order: update the individual batch's scan status.
      // Only escalate the order-level status when this batch has QC failures;
      // a clean batch keeps the order in Inprocess so remaining batches can
      // still be processed from the Inprocess tab.
      if (qcFailedCount > 0) {
        updateBatchScanStatus(orderId, Number(batchParam), 'Partially Complete')
        if (!isCompleteStatus(order?.status ?? 'Approved')) {
          updateOrderStatus(orderId, `Line ${Number(lineNo)} - Partially Complete`)
        }
        updateVerificationStatus(orderId, 'Under Verification')
      } else {
        updateBatchScanStatus(orderId, Number(batchParam), 'Complete')
        // No order-level status change — order stays Inprocess until the
        // operator reviews all batches and advances the order manually.
      }
    } else {
      // Non-batched order.
      if (qcFailedCount > 0) {
        // With QC failures: move status to 'Line X - Partially Complete' so the order
        // appears in the QC Failed tab for verification — existing behaviour unchanged.
        if (!isCompleteStatus(order?.status ?? 'Approved')) {
          updateOrderStatus(orderId, `Line ${Number(lineNo)} - Partially Complete`)
        }
        updateVerificationStatus(orderId, 'Under Verification')
      } else {
        // No failures: order stays 'Inprocess' so it remains visible in the Inprocess
        // tab. Set scanStatus to 'Complete' so the OFS table can highlight it in green
        // and enable the Shipped button.
        updateOrderScanStatus(orderId, 'Complete')
      }
    }
  }, [isComplete, scannedPairs.length, qcFailedCount, failedRequisitions, order?.status, orderId, batchParam, lineNo, updateOrderStatus, updateOrderScanStatus, updateVerificationStatus, updateBatchScanStatus])

  // Read how many TRF forms Station 1 has scanned, along with the full entry list
  // so Station 2 can validate each TRF barcode against what S1 actually scanned.
  // Always prefer the active in-progress scan key over the completed-session summary
  // so that stale summary data from a previous session never silently bypasses the
  // restriction and makes Station 2 appear unrestricted when it should be paused.
  const readS1Progress = useCallback(() => {
    const scanKey = `medzah_trf_scan_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
    const summaryKey = `medzah_trf_summary_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
    try {
      // Prefer the in-progress scan array (current session data)
      const raw = localStorage.getItem(scanKey)
      if (raw) {
        const stored = JSON.parse(raw) as S1TRFEntry[]
        setS1ScannedCount(Array.isArray(stored) ? stored.length : 0)
        setS1ScannedEntries(Array.isArray(stored) ? stored : [])
        return
      }
      // Fall back to the completed-session summary only when no in-progress key exists
      // (S1 finished all TRFs before S2 in the current session)
      const summaryRaw = localStorage.getItem(summaryKey)
      if (summaryRaw) {
        const s = JSON.parse(summaryRaw) as { scannedCount: number; entries?: S1TRFEntry[] }
        setS1ScannedCount(s.scannedCount ?? 0)
        setS1ScannedEntries(Array.isArray(s.entries) ? s.entries : [])
        return
      }
      setS1ScannedCount(0)
      setS1ScannedEntries([])
    } catch {
      setS1ScannedCount(0)
      setS1ScannedEntries([])
    }
  }, [orderId, batchParam])

  // Poll Station 1 progress every 3 seconds
  useEffect(() => {
    readS1Progress()
    const interval = setInterval(readS1Progress, 3000)
    return () => clearInterval(interval)
  }, [readS1Progress])

  // Also react immediately to cross-tab localStorage changes from Station 1
  useEffect(() => {
    const scanKey = `medzah_trf_scan_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
    const summaryKey = `medzah_trf_summary_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
    const handleStorage = (e: StorageEvent) => {
      if (e.key === scanKey || e.key === summaryKey) readS1Progress()
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [orderId, batchParam, readS1Progress])

  const openPrintTab = (url: string) => {
    const a = document.createElement("a")
    a.href = url
    a.target = "_blank"
    a.rel = "noopener noreferrer"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // ── Handle a scanned barcode ──
  const handleBarcode = useCallback(
    (raw: string) => {
      if (isComplete || verifyModalOpen || mismatchModalOpen || qcFailedModalOpen) return

      if (currentPhase === "return-label") {
        // Restriction: S1 must have scanned the next TRF before S2 can start processing it.
        const s2ProcessedCount = scannedPairs.length + qcFailedCount
        if (s1ScannedCount <= s2ProcessedCount) {
          scanBlockedRef.current = true
          setS1BlockedOpen(true)
          return
        }

        const parsed = parseReturnLabelBarcode(raw)
        if (!parsed) {
          scanBlockedRef.current = true
          setMismatchModalOpen(true)
          return
        }

        const orderIdMatch = parsed.orderId.toLowerCase() === (order?.id ?? "").toLowerCase()
        const kitNameMatch = parsed.kitName.toLowerCase() === (order?.kitName ?? "").toLowerCase()
        const kitIdMatch = parsed.kitId === String(order?.kitId ?? "")

        if (!orderIdMatch || !kitNameMatch || !kitIdMatch) {
          scanBlockedRef.current = true
          setMismatchModalOpen(true)
          return
        }

        // Valid return label — show verification modal
        scanBlockedRef.current = true
        pendingReturnRef.current = { raw }
        setVerifyData({ orderId: parsed.orderId, kitName: parsed.kitName, kitId: parsed.kitId })
        setVerifyModalOpen(true)
      } else {
        // TRF phase
        const parsed = parseTRFBarcode(raw)
        if (!parsed) {
          pendingReturnRef.current = null
          pendingFailedReqRef.current = raw
          scanBlockedRef.current = true
          setQcFailedReason("invalid")
          setQcFailedModalOpen(true)
          return
        }

        // Reject duplicate requisition numbers within this scanning session
        const alreadyUsedReqs = new Set(scannedPairs.map((p) => p.requisitionNo))
        if (alreadyUsedReqs.has(parsed.requisitionNo)) {
          pendingReturnRef.current = null
          pendingFailedReqRef.current = parsed.requisitionNo
          scanBlockedRef.current = true
          setQcFailedReason("invalid")
          setQcFailedModalOpen(true)
          return
        }

        // Validate TRF data against what Station 1 scanned for this kit position.
        const currentKitIndex = scannedPairs.length + qcFailedCount
        const expectedTRF = s1ScannedEntries[currentKitIndex]
        if (expectedTRF) {
          const nameMatch = parsed.patientName.toLowerCase() === expectedTRF.patientName.toLowerCase()
          const reqMatch = parsed.requisitionNo === expectedTRF.requisitionNo
          const dobMatch = parsed.patientDob === expectedTRF.patientDob
          if (!nameMatch || !reqMatch || !dobMatch) {
            pendingReturnRef.current = null
            pendingFailedReqRef.current = parsed.requisitionNo
            scanBlockedRef.current = true
            setQcFailedReason("s1-mismatch")
            setQcFailedModalOpen(true)
            return
          }
        }

        // Valid TRF — open shipping label and record pair
        const pair: ScannedPair = {
          returnLabelRaw: pendingReturnRef.current?.raw ?? raw,
          trfRaw: raw,
          patientName: parsed.patientName,
          requisitionNo: parsed.requisitionNo,
          patientDob: parsed.patientDob,
        }
        setScannedPairs((prev) => [...prev, pair])
        pendingReturnRef.current = null
        setCurrentPhase("return-label")

        const qs = `name=${encodeURIComponent(parsed.patientName)}&req=${encodeURIComponent(parsed.requisitionNo)}&dob=${encodeURIComponent(parsed.patientDob)}&orderId=${encodeURIComponent(order?.id ?? orderId)}&kitName=${encodeURIComponent(order?.kitName ?? "")}&kitId=${encodeURIComponent(String(order?.kitId ?? ""))}`

        if (shippingAnchorRef.current) {
          shippingAnchorRef.current.href = `/print/shipping-label?${qs}`
          shippingAnchorRef.current.click()
        }
      }
    },
    [
      isComplete,
      verifyModalOpen,
      mismatchModalOpen,
      qcFailedModalOpen,
      currentPhase,
      order,
      orderId,
      scannedPairs,
      qcFailedCount,
      s1ScannedCount,
      s1ScannedEntries,
    ]
  )

  // ── Confirm verification modal → move to TRF phase ──
  const handleVerifyConfirm = () => {
    setVerifyModalOpen(false)
    setVerifyData(null)
    setCurrentPhase("trf-form")
  }

  // ── Physical barcode scanner keyboard listener ──
  useEffect(() => {
    if (isComplete || manualOpen || backConfirmOpen || verifyModalOpen || mismatchModalOpen || qcFailedModalOpen || s1BlockedOpen) return

    // All modals are closed — reset the synchronous block so scanning can resume
    scanBlockedRef.current = false

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key === "Tab" || e.key === "Escape") return
      // Synchronous ref check: blocks any key processing the moment a modal is opened,
      // even before React has re-rendered and removed this listener.
      if (scanBlockedRef.current) return

      if (e.key === "Enter") {
        const value = keyBuffer.current.trim()
        keyBuffer.current = ""
        if (keyTimer.current) clearTimeout(keyTimer.current)
        if (value.length > 0) handleBarcode(value)
        return
      }

      if (e.key.length === 1) {
        keyBuffer.current += e.key
        if (keyTimer.current) clearTimeout(keyTimer.current)
        keyTimer.current = setTimeout(() => {
          const value = keyBuffer.current.trim()
          keyBuffer.current = ""
          if (value.length >= 4) handleBarcode(value)
        }, 100)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (keyTimer.current) clearTimeout(keyTimer.current)
    }
  }, [isComplete, manualOpen, backConfirmOpen, verifyModalOpen, mismatchModalOpen, qcFailedModalOpen, s1BlockedOpen, handleBarcode])

  // When any error / status modal is visible the physical scanner's trailing Enter key can
  // propagate to the auto-focused dialog button and instantly dismiss it.
  // This capture-phase listener intercepts Enter before Radix UI Dialog receives it,
  // preventing the default button-activation action so the modal stays open.
  useEffect(() => {
    if (!qcFailedModalOpen && !mismatchModalOpen && !verifyModalOpen && !s1BlockedOpen) return
    const preventEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter") e.preventDefault()
    }
    window.addEventListener("keydown", preventEnter, true)
    return () => window.removeEventListener("keydown", preventEnter, true)
  }, [qcFailedModalOpen, mismatchModalOpen, verifyModalOpen, s1BlockedOpen])

  const handleManualSubmit = () => {
    if (!manualValue.trim()) {
      setManualError("Please enter a barcode value.")
      return
    }
    setManualError("")
    handleBarcode(manualValue.trim())
    setManualValue("")
    setManualOpen(false)
  }

  const handleBackClick = () => {
    if ((scannedPairs.length > 0 || qcFailedCount > 0) && !isComplete) {
      setBackConfirmDest(backHref)
      setBackConfirmOpen(true)
    } else {
      router.push(backHref)
    }
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-500 dark:text-zinc-400">Order not found.</p>
          <Button variant="outline" onClick={() => router.push(backHref)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </div>
      </div>
    )
  }

  const returnLabelCount = scannedPairs.length + (currentPhase === "trf-form" ? 1 : 0)
  const trfFormsCount = scannedPairs.length
  // The denominator shown in counters reflects only the remaining valid kits
  const displayTotal = effectiveTotalQty

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950">
      {/* Hidden anchor for shipping label print */}
      <a ref={shippingAnchorRef} target="_blank" rel="noopener noreferrer" style={{ display: "none" }} />

      <div className="container mx-auto py-8 px-6 max-w-[1600px]">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between mb-8">
          <div className="space-y-1">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </button>
            <p className="text-sm font-medium text-primary">{programLabel}</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 leading-tight">
              Production Scanner{" "}
              <span className="text-base font-semibold text-gray-700 dark:text-zinc-400">
                (Station 2)
              </span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Scan the return label then the TRF form to generate the shipping label
            </p>
          </div>

          {/* ── Dual counters ── */}
          <div className="flex gap-8 mt-16">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 mb-1">
                {/*<Tag className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500" />*/}
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                  Return Labels
                </p>
              </div>
              <p className="text-3xl font-bold text-primary tabular-nums">
                {returnLabelCount}
                <span className="text-xl font-semibold text-gray-400 dark:text-zinc-500">
                  /{displayTotal}
                </span>
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 mb-1">
                {/*<Package className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500" />*/}
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                  TRF Forms
                </p>
              </div>
              <p className="text-3xl font-bold text-primary tabular-nums">
                {trfFormsCount}
                <span className="text-xl font-semibold text-gray-400 dark:text-zinc-500">
                  /{displayTotal}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Main card ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          {isComplete ? (
            /* Success state */
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-5">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                  All Scans Completed
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  {scannedPairs.length} kit{scannedPairs.length !== 1 ? "s" : ""} verified and shipping label{scannedPairs.length !== 1 ? "s" : ""} sent to print.
                  {qcFailedCount > 0 && (
                    <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                      {qcFailedCount} kit{qcFailedCount !== 1 ? "s" : ""} skipped due to TRF mismatch.
                    </span>
                  )}
                </p>
              </div>
              <Button onClick={() => router.push(backHref)} className="gap-2 mt-2">
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </Button>
            </div>
          ) : (
            /* Scanning state */
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-4">
              <div className="text-gray-300 dark:text-zinc-700">
                <ScanBarcode className="h-20 w-20" strokeWidth={1.2} />
              </div>

              <div className="space-y-2">
                {currentPhase === "return-label" ? (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                      {scannedPairs.length > 0 ? "Scan Next Return Label" : "Scan Return Label"}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-xs">
                      {scannedPairs.length > 0
                        ? `${scannedPairs.length} of ${effectiveTotalQty} kits complete — scan the return label for kit ${scannedPairs.length + 1}.`
                        : "Scan the return label printed in Station 1 to verify the order details before proceeding."}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                      Return Label Verified — Scan TRF Form
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-xs">
                      Order verified. Now scan the TRF form barcode to generate the shipping label.
                    </p>
                  </>
                )}
              </div>

              {/* Phase indicator */}
              <div className="flex items-center gap-3 mt-1">
                <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
                  currentPhase === "return-label"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                }`}>
                  {currentPhase === "return-label" ? (
                    <ScanBarcode className="h-3 w-3" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  Return Label
                </div>
                <div className="h-px w-4 bg-gray-300 dark:bg-zinc-600" />
                <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
                  currentPhase === "trf-form"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700"
                }`}>
                  {currentPhase === "trf-form" && <ScanBarcode className="h-3 w-3" />}
                  TRF Form
                </div>
              </div>

              {/* Station 1 restriction banner — shown when S2 is waiting for S1 to scan the next TRF */}
              {currentPhase === "return-label" && s1ScannedCount <= scannedPairs.length + qcFailedCount && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300 max-w-sm text-left">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    <span className="font-semibold">Scanning paused</span> — waiting for Station 1 to
                    scan the next TRF form before Station 2 can continue.
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                className="gap-2 dark:border-zinc-700 dark:hover:bg-zinc-800 mt-2"
                disabled={currentPhase === "return-label" && s1ScannedCount <= scannedPairs.length + qcFailedCount}
                onClick={() => {
                  setManualValue("")
                  setManualError("")
                  setManualOpen(true)
                }}
              >
                <KeyboardIcon className="h-4 w-4" />
                {currentPhase === "return-label"
                  ? "Enter Return Label Barcode Manually"
                  : "Enter TRF Barcode Manually"}
              </Button>
            </div>
          )}
        </div>

        {/* ── Scanned log ── */}
        {scannedPairs.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
              Scanned pairs
            </h3>
            <div className="space-y-1.5">
              {scannedPairs.map((pair, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="font-medium text-gray-900 dark:text-zinc-100 w-6 tabular-nums">
                    {idx + 1}.
                  </span>
                  <span className="text-gray-900 dark:text-zinc-100 font-medium">
                    {pair.patientName}
                  </span>
                  <span className="text-gray-400 dark:text-zinc-500">·</span>
                  <span className="text-gray-600 dark:text-zinc-400">
                    Req: {pair.requisitionNo}
                  </span>
                  <span className="text-gray-400 dark:text-zinc-500">·</span>
                  <span className="text-gray-600 dark:text-zinc-400">
                    DOB: {pair.patientDob}
                  </span>
                  <div className="ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs dark:border-zinc-700 dark:hover:bg-zinc-800"
                      onClick={() => {
                        const qs = `name=${encodeURIComponent(pair.patientName)}&req=${encodeURIComponent(pair.requisitionNo)}&dob=${encodeURIComponent(pair.patientDob)}&orderId=${encodeURIComponent(order?.id ?? orderId)}&kitName=${encodeURIComponent(order?.kitName ?? "")}&kitId=${encodeURIComponent(String(order?.kitId ?? ""))}`
                        openPrintTab(`/print/shipping-label?${qs}`)
                      }}
                    >
                      Reprint Shipping Label
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Station 1 restriction dialog — shown when S1 hasn't scanned the next TRF yet ── */}
      <Dialog open={s1BlockedOpen} onOpenChange={setS1BlockedOpen}>
        <DialogContent className="max-w-sm dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle className="leading-snug">Waiting for Station 1</DialogTitle>
            </div>
            <DialogDescription className="pt-1">
              Station 1 has not yet scanned the next TRF form. Station 2 cannot begin processing
              the next kit until Station 1 completes scanning its return label and TRF form.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-1">
            <Button onClick={() => setS1BlockedOpen(false)} className="w-full">
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Order Verification Modal ── */}
      <Dialog open={verifyModalOpen} onOpenChange={(open) => { if (!open) setVerifyModalOpen(false) }}>
        <DialogContent className="max-w-sm dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="leading-snug">Order Verified</DialogTitle>
            </div>
            <DialogDescription className="pt-1">
              The return label matches this order. Verify the details below, then scan the TRF form.
            </DialogDescription>
          </DialogHeader>

          {verifyData && (
            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Order ID</span>
                <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">{verifyData.orderId}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Kit Name</span>
                <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">{verifyData.kitName}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Kit ID</span>
                <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">{verifyData.kitId}</span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-1">
            <Button onClick={handleVerifyConfirm} className="w-full gap-2">
              <ScanBarcode className="h-4 w-4" />
              Confirmed — Scan TRF Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Return Label Mismatch Modal ── */}
      <Dialog open={mismatchModalOpen} onOpenChange={setMismatchModalOpen}>
        <DialogContent
          className="max-w-sm dark:bg-zinc-900 dark:border-zinc-800"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle className="leading-snug">Return Label Mismatch</DialogTitle>
            </div>
            <DialogDescription className="pt-1">
              The scanned return label does not match this order. Please locate the correct return label
              printed for{" "}
              <span className="font-semibold text-gray-900 dark:text-zinc-100">
                Order {order?.id}
              </span>{" "}
              and scan it again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-1">
            <Button onClick={() => setMismatchModalOpen(false)} className="w-full gap-2">
              <ScanBarcode className="h-4 w-4" />
              Scan Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QC Failed Modal ── */}
      <Dialog open={qcFailedModalOpen} onOpenChange={setQcFailedModalOpen}>
        <DialogContent
          className="max-w-sm dark:bg-zinc-900 dark:border-zinc-800"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle className="leading-snug">
                {qcFailedReason === "s1-mismatch"
                  ? "TRF Data Mismatch with Station 1"
                  : "TRF Form Does Not Match"}
              </DialogTitle>
            </div>
            <DialogDescription className="pt-1">
              {qcFailedReason === "s1-mismatch"
                ? "The scanned TRF form data does not match the TRF form scanned in Station 1. The patient name, requisition number, or date of birth is incorrect."
                : "The scanned TRF form could not be verified. TRF form details not matching with the shipment label"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              This kit has been <span className="font-semibold">flagged for QC review</span>. The
              order quantity has been reduced by 1. Scanning will continue for the remaining kits.
            </p>
          </div>

          <DialogFooter className="mt-1">
            <Button
              onClick={() => {
                // Capture the ref value synchronously BEFORE clearing it.
                // Using a functional updater that references pendingFailedReqRef.current
                // directly would read "" (already cleared) when React runs the updater.
                const failedReq = pendingFailedReqRef.current
                pendingFailedReqRef.current = ""
                setQcFailedCount((prev) => prev + 1)
                if (failedReq) {
                  setFailedRequisitions((prev) => [...prev, failedReq])
                }
                setCurrentPhase("return-label")
                setQcFailedModalOpen(false)
              }}
              className="w-full gap-2"
            >
              <ScanBarcode className="h-4 w-4" />
              Continue Scanning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Back navigation guard ── */}
      <Dialog open={backConfirmOpen} onOpenChange={setBackConfirmOpen}>
        <DialogContent className="max-w-sm dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle className="leading-snug">Leave scanning session?</DialogTitle>
            </div>
            <DialogDescription className="pt-1">
              You&apos;ve completed{" "}
              <span className="font-semibold text-gray-900 dark:text-zinc-100">
                {scannedPairs.length} of {effectiveTotalQty}
              </span>{" "}
              kits. Your progress will be saved — you can return to this order and continue from where
              you left off.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-1">
            <Button
              variant="outline"
              onClick={() => setBackConfirmOpen(false)}
              className="dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Continue Scanning
            </Button>
            <Button variant="destructive" onClick={() => router.push(backConfirmDest)}>
              Leave Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manual entry modal ── */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-sm dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle>Enter Barcode Manually</DialogTitle>
            <DialogDescription>
              {currentPhase === "return-label"
                ? "Type or paste the return label barcode value (ORDER_ID|KIT_NAME|KIT_ID)."
                : "Type or paste the TRF barcode value (PATIENT_NAME|REQUISITION_NO|DOB)."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <Input
              placeholder={
                currentPhase === "return-label"
                  ? "e.g. ORD-001|Colofit Kit|3564567"
                  : "e.g. John Doe|12011-1-3-01|25/3/1996"
              }
              value={manualValue}
              onChange={(e) => {
                setManualValue(e.target.value)
                setManualError("")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleManualSubmit()
              }}
              autoFocus
              className="dark:bg-zinc-800 dark:border-zinc-700"
            />
            {manualError && (
              <p className="text-xs text-red-600 dark:text-red-400">{manualError}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Format:{" "}
              <code className="bg-gray-100 dark:bg-zinc-800 px-1 rounded text-xs">
                {currentPhase === "return-label"
                  ? "ORDER_ID|KIT_NAME|KIT_ID"
                  : "PATIENT_NAME|REQUISITION_NO|DOB"}
              </code>
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setManualOpen(false)}
              className="dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button onClick={handleManualSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
