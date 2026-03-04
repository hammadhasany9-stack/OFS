"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ProductionItem, PrintRoomStatus } from "@/types/order"
import { isFullyCompleteStatus, isPartiallyCompleteStatus } from "@/types/order"
import { format } from "date-fns"
import { ChevronDown, ChevronRight } from "lucide-react"
import { ProductionAccordion } from "./ProductionAccordion"
import { QualityControlAccordion } from "./QualityControlAccordion"

const lineColors: Record<PrintRoomStatus, string> = {
  'Printroom': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  'Line 1': 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
  'Line 2': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  'Line 3': 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
  'Line 4': 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800',
  'Line 5': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  'Line 6': 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
}

interface ProductionTableProps {
  items: ProductionItem[]
  lineNo: string
  stationType: "production" | "quality-control"
}

interface ProductionRowProps {
  item: ProductionItem
  lineNo: string
  stationType: "production" | "quality-control"
}

function ProductionRow({ item, lineNo, stationType }: ProductionRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { order, batch } = item
  const displayQty = batch ? batch.size : order.orderQty

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
        <TableCell className="dark:text-zinc-300">{order.kitName}</TableCell>
        <TableCell className="dark:text-zinc-300">{order.kitId}</TableCell>
        <TableCell className="font-medium dark:text-zinc-200">
          {batch ? `${order.id} - Batch ${batch.batchNumber}` : order.id}
        </TableCell>
        <TableCell className="dark:text-zinc-300 pl-16">{displayQty}</TableCell>
        <TableCell className="dark:text-zinc-300">
          {order.processedDate ? format(order.processedDate, "MMM dd, yyyy ; HH:mm") : '—'}
        </TableCell>
        <TableCell>
          {(() => {
            // For batched items use the individual batch scan status so each
            // batch reflects its own Station 2 outcome independently of the
            // order-level status (which stays Inprocess until all batches are done).
            const batchComplete = batch?.scanStatus === 'Complete'
            const batchPartial = batch?.scanStatus === 'Partially Complete'

            // Station 1 (production): a partially-complete batch means QC failed in
            // Station 2 — Station 1's work is done, so it always shows Complete.
            // Station 2 (quality-control): shows the actual partial status.
            const showComplete =
              batchComplete ||
              (batchPartial && stationType === "production") ||
              (!batch && (
                isFullyCompleteStatus(order.status) ||
                order.scanStatus === 'Complete' ||
                (isPartiallyCompleteStatus(order.status) && stationType === "production")
              ))

            const showPartial =
              (batchPartial && stationType === "quality-control") ||
              (!batch && isPartiallyCompleteStatus(order.status) && stationType === "quality-control")

            if (showComplete) {
              return (
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 whitespace-nowrap"
                >
                  Line {lineNo} – Complete
                </Badge>
              )
            }
            if (showPartial) {
              return (
                <Badge
                  variant="outline"
                  className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 whitespace-nowrap"
                >
                  Line {lineNo} – Partially Complete
                </Badge>
              )
            }
            return (
              <Badge
                variant="outline"
                className={`${lineColors[`Line ${lineNo}` as PrintRoomStatus] ?? lineColors['Printroom']} whitespace-nowrap`}
              >
                Line {lineNo} – Inprocess
              </Badge>
            )
          })()}
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell
            colSpan={7}
            className="p-0 bg-gray-50 dark:bg-zinc-800/50"
          >
            {stationType === "production" ? (
              <ProductionAccordion item={item} />
            ) : (
              <QualityControlAccordion item={item} />
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function ProductionTable({
  items,
  lineNo,
  stationType,
}: ProductionTableProps) {
  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-900 overflow-hidden transition-colors">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
            <TableHead className="w-[50px]" />
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">
              KIT NAME
            </TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">
              KIT ID
            </TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">
              ORDER ID
            </TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">
              ORDER QUANTITY
            </TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">
              DATE SUBMITTED (EST)
            </TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">
              STATUS
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-12 text-gray-500 dark:text-zinc-400"
              >
                No orders found for Line {lineNo}
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <ProductionRow
                key={item.batch ? `${item.order.id}-batch-${item.batch.batchNumber}` : item.order.id}
                item={item}
                lineNo={lineNo}
                stationType={stationType}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
