"use client"

import { useState } from "react"
import { Order, Batch, PrintRoomStatus } from "@/types/order"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronRight, Printer } from "lucide-react"
import { format } from "date-fns"
import { openTRFPrint } from "@/lib/trf-print"
import { openKitIdLabelPrint } from "@/lib/kit-id-label-print"

const lineOptions: PrintRoomStatus[] = ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5', 'Line 6']

const printRoomStatusColors: Record<PrintRoomStatus, string> = {
  'Printroom': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  'Line 1': 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
  'Line 2': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  'Line 3': 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
  'Line 4': 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800',
  'Line 5': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  'Line 6': 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
}

interface PrintRoomBatchAccordionProps {
  order: Order
  batch: Batch
  isOnPrintRoomTab: boolean
  onBatchStatusChange: (batchNumber: number, newStatus: PrintRoomStatus) => void
}

export function PrintRoomBatchAccordion({ order, batch, isOnPrintRoomTab, onBatchStatusChange }: PrintRoomBatchAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const batchStatus = batch.printRoomStatus ?? 'Printroom'
  const batchQty = batch.size

  return (
    <div className="border-b border-gray-200 dark:border-zinc-700 last:border-b-0">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
      >
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-600 dark:text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-zinc-400" />
          )}
        </div>

        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {isOnPrintRoomTab ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 cursor-pointer">
                  <Badge variant="outline" className={printRoomStatusColors[batchStatus]}>
                    {batchStatus}
                  </Badge>
                  <ChevronDown className="h-3 w-3 dark:text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="dark:bg-zinc-900 dark:border-zinc-800">
                {lineOptions.map((line) => (
                  <DropdownMenuItem
                    key={line}
                    onClick={() => onBatchStatusChange(batch.batchNumber, line)}
                    className="cursor-pointer dark:hover:bg-zinc-800 dark:text-zinc-300"
                  >
                    {line}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Badge variant="outline" className={printRoomStatusColors[batchStatus]}>
              {batchStatus}
            </Badge>
          )}
        </div>

        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-gray-900 dark:text-zinc-200">
            {order.id} - Batch {batch.batchNumber}
          </span>
          <span className="ml-4 text-xs text-gray-500 dark:text-zinc-400">
            Quantity: {batchQty}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 pt-2 bg-gray-50/50 dark:bg-zinc-800/20">
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            {/* Left Column */}
            <div className="space-y-4">
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
                  {order.processedDate ? format(order.processedDate, 'MMM dd, yyyy HH:mm:ss') : '—'}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
                  Customer PO
                </dt>
                <dd className="text-sm text-gray-900 dark:text-zinc-300 font-mono">{order.customerPO}</dd>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5 w-80">
              <div className="grid grid-cols-2 items-center">
                <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
                  TRF Form
                </dt>
                <dd className="flex items-center gap-3">
                  <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{batchQty}</span>
                  {batchStatus !== 'Printroom' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                      onClick={(e) => {
                        e.stopPropagation()
                        openTRFPrint(order, batch)
                      }}
                    >
                      <Printer className="h-3 w-3" />
                      Print TRF Form
                    </Button>
                  )}
                </dd>
              </div>

              <div className="grid grid-cols-2 items-center">
                <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
                  Kit ID Label
                </dt>
                <dd className="flex items-center gap-3">
                  <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{batchQty}</span>
                  {batchStatus !== 'Printroom' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                      onClick={(e) => {
                        e.stopPropagation()
                        openKitIdLabelPrint(order, batch)
                      }}
                    >
                      <Printer className="h-3 w-3" />
                      Print Kit ID Label
                    </Button>
                  )}
                </dd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
