"use client"

import { use, useEffect, useRef, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ScanBarcode, CheckCircle2, KeyboardIcon, Printer, AlertTriangle } from "lucide-react"
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

interface ScannedEntry {
  barcodeRaw: string
  patientName: string
  requisitionNo: string
  patientDob: string
}

/** Parse pipe-delimited TRF barcode: PATIENT_NAME|REQUISITION_NO|DOB
 *  Fallback: treat entire string as requisition no. with a placeholder name. */
function parseTRFBarcode(raw: string): Omit<ScannedEntry, "barcodeRaw"> {
  const parts = raw.trim().split("|")
  if (parts.length >= 3) {
    return {
      patientName: parts[0].trim(),
      requisitionNo: parts[1].trim(),
      patientDob: parts[2].trim(),
    }
  }
  return {
    patientName: "Patient",
    requisitionNo: raw.trim() || "—",
    patientDob: "—",
  }
}

function scanStorageKey(orderId: string, batchParam: string | null) {
  return `medzah_trf_scan_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
}

interface PageProps {
  params: Promise<{ program: string; lineNo: string; orderId: string }>
}

export default function TRFScannerPage({ params }: PageProps) {
  const { program, lineNo, orderId } = use(params)
  const searchParams = useSearchParams()
  const batchParam = searchParams.get("batch")

  const router = useRouter()
  const { orders } = useOrders()
  const { setGuard } = useNavGuard()

  const order = orders.find((o) => o.id === orderId) as Order | undefined
  const batch: Batch | undefined =
    batchParam && order?.batches
      ? order.batches.find((b) => b.batchNumber === Number(batchParam))
      : undefined

  const totalTRF = batch ? batch.size : (order?.trfFormCount ?? 0)
  const programLabel = PROGRAM_LABELS[program] ?? program
  const backHref = `/production/${program}/${lineNo}`

  const [scanned, setScanned] = useState<ScannedEntry[]>([])
  const [manualOpen, setManualOpen] = useState(false)
  const [manualValue, setManualValue] = useState("")
  const [manualError, setManualError] = useState("")
  const [backConfirmOpen, setBackConfirmOpen] = useState(false)
  const [backConfirmDest, setBackConfirmDest] = useState("")
  const [s2CompletedCount, setS2CompletedCount] = useState(0)
  const [s2BlockedOpen, setS2BlockedOpen] = useState(false)

  const keyBuffer = useRef("")
  const keyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hidden anchor elements — programmatic .click() on <a target="_blank"> within
  // a user gesture opens multiple tabs without hitting window.open's
  // one-popup-per-gesture restriction.
  const returnAnchorRef = useRef<HTMLAnchorElement>(null)
  const patientAnchorRef = useRef<HTMLAnchorElement>(null)

  // Order is already complete if status was set in a previous session (any completed variant)
  const isComplete =
    (scanned.length >= totalTRF && totalTRF > 0) || (order ? isCompleteStatus(order.status) : false)

  // Register a nav guard while scanning is in progress so the top-nav
  // "Back to Workstation" button also triggers the confirmation dialog.
  // Clear the guard when scanning is complete or hasn't started.
  useEffect(() => {
    if (scanned.length > 0 && !isComplete) {
      setGuard(() => {
        setBackConfirmDest("/production-team")
        setBackConfirmOpen(true)
      })
    } else {
      setGuard(null)
    }
    return () => setGuard(null)
  }, [scanned.length, isComplete, setGuard])

  // Restore scan progress from localStorage after mount.
  // If there is no S1 in-progress data this is a fresh session — clear any stale S2
  // summary left over from the previous completed session so that s2CompletedCount
  // starts at 0 and the S1→S2 restriction is enforced from the very first scan.
  useEffect(() => {
    const key = scanStorageKey(orderId, batchParam)
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const stored = JSON.parse(raw) as ScannedEntry[]
        if (Array.isArray(stored) && stored.length > 0) setScanned(stored)
      } else {
        // No S1 in-progress data → fresh session. Purge the S2 summary so it
        // cannot inflate s2CompletedCount and silently bypass the restriction.
        const s2SummaryKey = `medzah_station2_summary_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
        localStorage.removeItem(s2SummaryKey)
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist scan progress to localStorage whenever scanned list changes
  useEffect(() => {
    if (scanned.length === 0) return
    const key = scanStorageKey(orderId, batchParam)
    localStorage.setItem(key, JSON.stringify(scanned))
  }, [scanned, orderId, batchParam])

  // When complete: clear the localStorage progress entry and save a summary that
  // includes the full scanned entries so Station 2 can validate each TRF against them.
  // Order status is set to "Complete" by Station 2 once it finishes its own scanning.
  useEffect(() => {
    if (!isComplete) return
    const key = scanStorageKey(orderId, batchParam)
    localStorage.removeItem(key)
    const s1SummaryKey = `medzah_trf_summary_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
    localStorage.setItem(s1SummaryKey, JSON.stringify({ scannedCount: scanned.length, entries: scanned }))
  }, [isComplete, scanned, orderId, batchParam])

  // Read how many kits Station 2 has fully processed (verified pairs + qc-failed).
  // Always prefer the active in-progress scan key over the completed-session summary
  // so that stale summary data from a previous session never silently bypasses the
  // restriction.
  const readS2Progress = useCallback(() => {
    const scanKey = `medzah_station2_scan_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
    const summaryKey = `medzah_station2_summary_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
    try {
      // Prefer the in-progress scan key (current session data)
      const raw = localStorage.getItem(scanKey)
      if (raw) {
        const stored = JSON.parse(raw) as { pairs: unknown[]; qcFailedCount: number }
        const count =
          (Array.isArray(stored.pairs) ? stored.pairs.length : 0) +
          (typeof stored.qcFailedCount === "number" ? stored.qcFailedCount : 0)
        setS2CompletedCount(count)
        return
      }
      // Fall back to the completed-session summary only when no in-progress data exists
      // (Station 2 finished its scanning before Station 1 in the current session)
      const summaryRaw = localStorage.getItem(summaryKey)
      if (summaryRaw) {
        const s = JSON.parse(summaryRaw) as { verifiedCount: number; failedCount: number }
        setS2CompletedCount((s.verifiedCount ?? 0) + (s.failedCount ?? 0))
        return
      }
      setS2CompletedCount(0)
    } catch {
      setS2CompletedCount(0)
    }
  }, [orderId, batchParam])

  // Poll Station 2 progress every 3 seconds
  useEffect(() => {
    readS2Progress()
    const interval = setInterval(readS2Progress, 3000)
    return () => clearInterval(interval)
  }, [readS2Progress])

  // Also react immediately to cross-tab localStorage changes from Station 2
  useEffect(() => {
    const scanKey = `medzah_station2_scan_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
    const summaryKey = `medzah_station2_summary_${orderId}${batchParam ? `_batch_${batchParam}` : ""}`
    const handleStorage = (e: StorageEvent) => {
      if (e.key === scanKey || e.key === summaryKey) readS2Progress()
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [orderId, batchParam, readS2Progress])

  const openPrintTab = (url: string) => {
    const a = document.createElement("a")
    a.href = url
    a.target = "_blank"
    a.rel = "noopener noreferrer"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleBarcode = useCallback(
    (raw: string) => {
      if (scanned.length >= totalTRF) return

      // Restriction: Station 2 must process the previous TRF before the next can be scanned.
      // scanned.length represents how many have been sent to S2 already; S2 must have
      // completed at least that many before S1 is allowed to scan another.
      if (scanned.length > s2CompletedCount) {
        setS2BlockedOpen(true)
        return
      }

      const parsed = parseTRFBarcode(raw)
      const entry: ScannedEntry = { barcodeRaw: raw, ...parsed }
      setScanned((prev) => [...prev, entry])

      const qs = `name=${encodeURIComponent(parsed.patientName)}&req=${encodeURIComponent(parsed.requisitionNo)}&dob=${encodeURIComponent(parsed.patientDob)}`
      const orderQs = `&orderId=${encodeURIComponent(order?.id ?? orderId)}&kitName=${encodeURIComponent(order?.kitName ?? "")}&kitId=${encodeURIComponent(String(order?.kitId ?? ""))}`

      // Click both anchors synchronously. Unlike window.open(), programmatic
      // anchor clicks within a user gesture are not subject to the
      // one-popup-per-gesture consumption rule, so both tabs open.
      if (returnAnchorRef.current) {
        returnAnchorRef.current.href = `/print/return-label?${qs}${orderQs}`
        returnAnchorRef.current.click()
      }
      if (patientAnchorRef.current) {
        patientAnchorRef.current.href = `/print/patient-label?${qs}`
        patientAnchorRef.current.click()
      }
    },
    [scanned.length, totalTRF, s2CompletedCount]
  )

  // Physical barcode scanner keyboard listener
  useEffect(() => {
    if (isComplete || manualOpen || backConfirmOpen || s2BlockedOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier-key combos (Ctrl+C etc.)
      if (e.ctrlKey || e.altKey || e.metaKey) return
      // Ignore Tab, Escape
      if (e.key === "Tab" || e.key === "Escape") return

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
        // Auto-flush after 100 ms of inactivity (handles scanners that don't send Enter)
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
  }, [isComplete, manualOpen, backConfirmOpen, s2BlockedOpen, handleBarcode])

  // Prevent the scanner's trailing Enter from activating auto-focused dialog buttons
  // and instantly dismissing block / back-confirm modals.
  useEffect(() => {
    if (!s2BlockedOpen && !backConfirmOpen) return
    const preventEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter") e.preventDefault()
    }
    window.addEventListener("keydown", preventEnter, true)
    return () => window.removeEventListener("keydown", preventEnter, true)
  }, [s2BlockedOpen, backConfirmOpen])

  const handleManualSubmit = () => {
    if (!manualValue.trim()) {
      setManualError("Please enter a barcode ID.")
      return
    }
    setManualError("")
    handleBarcode(manualValue.trim())
    setManualValue("")
    setManualOpen(false)
  }

  // Show confirmation only when a scan is in progress; navigate directly otherwise
  const handleBackClick = () => {
    if (scanned.length > 0 && !isComplete) {
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

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950">
      {/* Hidden anchors used to open both label tabs simultaneously */}
      <a ref={returnAnchorRef} target="_blank" rel="noopener noreferrer" style={{ display: "none" }} />
      <a ref={patientAnchorRef} target="_blank" rel="noopener noreferrer" style={{ display: "none" }} />

      <div className="container mx-auto py-8 px-6 max-w-[1600px]">

        {/* Page header */}
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
                (Station 1)
              </span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Scan a TRF form to obtain return label
            </p>
          </div>

          {/* Scanned TRF count */}
          <div className="text-right mt-16">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-2">
              Scanned TRF Forms
            </p>
            <p className="text-3xl font-bold text-primary tabular-nums">
              {scanned.length}
              <span className="text-xl font-semibold text-gray-400 dark:text-zinc-500">
                /{totalTRF}
              </span>
            </p>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          {isComplete ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-5">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                  All TRF Forms Scanned
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  {totalTRF} return label{totalTRF !== 1 ? "s" : ""} and patient label
                  {totalTRF !== 1 ? "s" : ""} have been generated and sent to print.
                </p>
              </div>
              <Button onClick={() => router.push(backHref)} className="gap-2 mt-2">
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </Button>
            </div>
          ) : (
            /* ── Scanning state ── */
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-4">
              {/* Barcode icon */}
              <div className="text-gray-300 dark:text-zinc-700">
                <ScanBarcode className="h-20 w-20" strokeWidth={1.2} />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                  {scanned.length > 0 ? "Resume Scanning TRF Barcodes" : "Scan TRF Barcodes"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-xs">
                  {scanned.length > 0
                    ? `${scanned.length} of ${totalTRF} scanned — ${totalTRF - scanned.length} remaining. Continue scanning to complete this order.`
                    : "Easily scan the TRF form barcode to access all relevant information or enter the code\u00a0ID manually."}
                </p>
              </div>

              {/* Station 2 restriction banner — shown when S2 hasn't processed the previous TRF yet */}
              {scanned.length > 0 && scanned.length > s2CompletedCount && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300 max-w-sm text-left">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    <span className="font-semibold">Scanning paused</span> — waiting for Station 2 to
                    complete processing the previous TRF before the next one can be scanned.
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                className="gap-2 dark:border-zinc-700 dark:hover:bg-zinc-800"
                disabled={scanned.length > 0 && scanned.length > s2CompletedCount}
                onClick={() => {
                  setManualValue("")
                  setManualError("")
                  setManualOpen(true)
                }}
              >
                <KeyboardIcon className="h-4 w-4" />
                Enter Barcode ID Manually
              </Button>
            </div>
          )}
        </div>

        {/* Scanned log */}
        {scanned.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
              Scanned entries
            </h3>
            <div className="space-y-1.5">
              {scanned.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="font-medium text-gray-900 dark:text-zinc-100 w-6 tabular-nums">
                    {idx + 1}.
                  </span>
                  <span className="text-gray-900 dark:text-zinc-100 font-medium">
                    {entry.patientName}
                  </span>
                  <span className="text-gray-400 dark:text-zinc-500">·</span>
                  <span className="text-gray-600 dark:text-zinc-400">
                    Req: {entry.requisitionNo}
                  </span>
                  <span className="text-gray-400 dark:text-zinc-500">·</span>
                  <span className="text-gray-600 dark:text-zinc-400">DOB: {entry.patientDob}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs dark:border-zinc-700 dark:hover:bg-zinc-800"
                      onClick={() => {
                        const qs = `name=${encodeURIComponent(entry.patientName)}&req=${encodeURIComponent(entry.requisitionNo)}&dob=${encodeURIComponent(entry.patientDob)}`
                        openPrintTab(`/print/return-label?${qs}`)
                      }}
                    >
                      <Printer className="h-3 w-3" />
                      Return Label
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs dark:border-zinc-700 dark:hover:bg-zinc-800"
                      onClick={() => {
                        const qs = `name=${encodeURIComponent(entry.patientName)}&req=${encodeURIComponent(entry.requisitionNo)}&dob=${encodeURIComponent(entry.patientDob)}`
                        openPrintTab(`/print/patient-label?${qs}`)
                      }}
                    >
                      <Printer className="h-3 w-3" />
                      Patient Label
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Back navigation confirmation dialog — shown only when scanning is in progress */}
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
              You&apos;ve scanned{" "}
              <span className="font-semibold text-gray-900 dark:text-zinc-100">
                {scanned.length} of {totalTRF}
              </span>{" "}
              TRF forms. Your progress will be saved — you can return to this order and continue
              from where you left off.
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
            <Button
              variant="destructive"
              onClick={() => router.push(backConfirmDest)}
            >
              Leave Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
       </Dialog>

      {/* Station 2 restriction dialog — shown when S2 hasn't finished the previous TRF */}
      <Dialog open={s2BlockedOpen} onOpenChange={setS2BlockedOpen}>
        <DialogContent className="max-w-sm dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle className="leading-snug">Waiting for Station 2</DialogTitle>
            </div>
            <DialogDescription className="pt-1">
              Station 2 has not yet finished processing the previous TRF form. The next TRF cannot
              be scanned until Station 2 completes scanning the return label and TRF form for the
              current kit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-1">
            <Button onClick={() => setS2BlockedOpen(false)} className="w-full">
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual entry modal */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-sm dark:bg-zinc-900 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle>Enter Barcode ID Manually</DialogTitle>
            <DialogDescription>
              Type or paste the TRF barcode value below and click Submit to process it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <Input
              placeholder="e.g. John Doe|12011-1-3-01|25/3/1996"
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
                PATIENT_NAME|REQUISITION_NO|DOB
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
