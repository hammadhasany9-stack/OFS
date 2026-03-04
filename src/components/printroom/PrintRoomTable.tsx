"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Order, Batch, PrintRoomStatus } from "@/types/order"
import { format } from "date-fns"
import { ChevronDown, ChevronRight, Printer } from "lucide-react"
import { PrintRoomAccordion } from "./PrintRoomAccordion"
import { PrintRoomBatchAccordion } from "./PrintRoomBatchAccordion"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { openTRFPrint } from "@/lib/trf-print"
import { openKitIdLabelPrint } from "@/lib/kit-id-label-print"

export type PrintRoomDisplayItem =
  | { kind: 'order'; order: Order }
  | { kind: 'batch'; order: Order; batch: Batch }

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

interface PrintRoomTableProps {
  items: PrintRoomDisplayItem[]
  selectedStatus: PrintRoomStatus
  onStatusChange: (orderId: string, newStatus: PrintRoomStatus) => void
  onBatchStatusChange: (orderId: string, batchNumber: number, newStatus: PrintRoomStatus) => void
}

// ─── Order row (Print Room tab + non-batched Line tab rows) ──────────────────

interface PrintRoomOrderRowProps {
  order: Order
  selectedStatus: PrintRoomStatus
  onStatusChange: (orderId: string, newStatus: PrintRoomStatus) => void
  onBatchStatusChange: (orderId: string, batchNumber: number, newStatus: PrintRoomStatus) => void
}

function PrintRoomOrderRow({ order, selectedStatus, onStatusChange, onBatchStatusChange }: PrintRoomOrderRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isOnPrintRoomTab = selectedStatus === 'Printroom'
  const orderStatus = order.printRoomStatus ?? 'Printroom'
  const hasBatches = order.batches && order.batches.length > 0

  return (
    <>
      <TableRow
        className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="w-[50px]">
          <button
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600 dark:text-zinc-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-zinc-400" />
            )}
          </button>
        </TableCell>

        <TableCell>
          {isOnPrintRoomTab && !hasBatches ? (
            // Non-batched order on Print Room tab: dropdown to move to a line
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Badge variant="outline" className={printRoomStatusColors[orderStatus]}>
                    {orderStatus}
                  </Badge>
                  <ChevronDown className="h-3 w-3 dark:text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="dark:bg-zinc-900 dark:border-zinc-800">
                {lineOptions.map((line) => (
                  <DropdownMenuItem
                    key={line}
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange(order.id, line)
                    }}
                    className="cursor-pointer dark:hover:bg-zinc-800 dark:text-zinc-300"
                  >
                    {line}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Batched order on Print Room tab → static "Printroom" badge (no dropdown)
            // Any order on a Line tab → static line badge
            <Badge variant="outline" className={printRoomStatusColors[isOnPrintRoomTab ? 'Printroom' : orderStatus]}>
              {isOnPrintRoomTab ? 'Printroom' : orderStatus}
            </Badge>
          )}
        </TableCell>

        <TableCell className="font-medium dark:text-zinc-200">{order.id}</TableCell>
        <TableCell className="dark:text-zinc-300">{order.kitName}</TableCell>
        <TableCell className="dark:text-zinc-300">{order.kitId}</TableCell>
        <TableCell className="dark:text-zinc-300 pl-10">{order.orderQty}</TableCell>
        <TableCell className="dark:text-zinc-300">{order.processedDate ? format(order.processedDate, 'MMM dd, yyyy HH:mm') : '—'}</TableCell>
        <TableCell className="dark:text-zinc-300">{order.clientName}</TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={8} className="p-0 bg-gray-50 dark:bg-zinc-800/50">
            {hasBatches ? (
              <div className="border-t border-gray-200 dark:border-zinc-700">
                {order.batches!.map((batch) => (
                  <PrintRoomBatchAccordion
                    key={`${order.id}-batch-${batch.batchNumber}`}
                    order={order}
                    batch={batch}
                    isOnPrintRoomTab={isOnPrintRoomTab}
                    onBatchStatusChange={(batchNumber, newStatus) =>
                      onBatchStatusChange(order.id, batchNumber, newStatus)
                    }
                  />
                ))}
              </div>
            ) : (
              <PrintRoomAccordion order={order} />
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ─── Batch row (individual batch flattened into a Line tab row) ──────────────

interface PrintRoomBatchRowProps {
  order: Order
  batch: Batch
}

function PrintRoomBatchRow({ order, batch }: PrintRoomBatchRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const batchStatus = batch.printRoomStatus ?? 'Printroom'

  return (
    <>
      <TableRow
        className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="w-[50px]">
          <button
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600 dark:text-zinc-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-zinc-400" />
            )}
          </button>
        </TableCell>

        <TableCell>
          <Badge variant="outline" className={printRoomStatusColors[batchStatus]}>
            {batchStatus}
          </Badge>
        </TableCell>

        <TableCell className="font-medium dark:text-zinc-200">
          {order.id} - Batch {batch.batchNumber}
        </TableCell>
        <TableCell className="dark:text-zinc-300">{order.kitName}</TableCell>
        <TableCell className="dark:text-zinc-300">{order.kitId}</TableCell>
        <TableCell className="dark:text-zinc-300">{batch.size}</TableCell>
        <TableCell className="dark:text-zinc-300">{order.processedDate ? format(order.processedDate, 'MMM dd, yyyy HH:mm') : '—'}</TableCell>
        <TableCell className="dark:text-zinc-300">{order.clientName}</TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={8} className="p-0 bg-gray-50 dark:bg-zinc-800/50">
            <div className="border-t border-gray-200 dark:border-zinc-700 p-6 pt-4 bg-gray-50/50 dark:bg-zinc-800/20">
              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
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
                <div className="space-y-5 w-80">
                  <div className="grid grid-cols-2 items-center">
                    <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
                      TRF Form
                    </dt>
                    <dd className="flex items-center gap-3">
                      <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{batch.size}</span>
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
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 items-center">
                    <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
                      Kit ID Label
                    </dt>
                    <dd className="flex items-center gap-3">
                      <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{batch.size}</span>
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
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ─── Table ───────────────────────────────────────────────────────────────────

export function PrintRoomTable({ items, selectedStatus, onStatusChange, onBatchStatusChange }: PrintRoomTableProps) {
  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-900 overflow-hidden transition-colors">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">STATUS</TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">ORDER ID</TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">KIT NAME</TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">KIT ID</TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">QUANTITY</TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">DATE SUBMITTED (EST)</TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">CUSTOMER</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-zinc-400">
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, index) =>
              item.kind === 'order' ? (
                <PrintRoomOrderRow
                  key={`order-${item.order.id}-${index}`}
                  order={item.order}
                  selectedStatus={selectedStatus}
                  onStatusChange={onStatusChange}
                  onBatchStatusChange={onBatchStatusChange}
                />
              ) : (
                <PrintRoomBatchRow
                  key={`batch-${item.order.id}-${item.batch.batchNumber}`}
                  order={item.order}
                  batch={item.batch}
                />
              )
            )
          )}
        </TableBody>
      </Table>
    </div>
  )
}
