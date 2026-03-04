import { useState } from "react"
import { Order, Batch } from "@/types/order"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight } from "lucide-react"
import { format } from "date-fns"

interface BatchAccordionProps {
  order: Order
  batch: Batch
}

export function BatchAccordion({ order, batch }: BatchAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Calculate adjusted quantities based on batch size
  const batchQty = batch.size

  const scanStatusBadgeClass =
    batch.scanStatus === 'Complete'
      ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
      : batch.scanStatus === 'Partially Complete'
      ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
      : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'

  const scanStatusLabel = batch.scanStatus ?? 'Inprocess'

  return (
    <div className="border-b border-gray-200 dark:border-zinc-700 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-600 dark:text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-zinc-400" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={scanStatusBadgeClass}
          >
            {scanStatusLabel}
          </Badge>
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-gray-900 dark:text-zinc-200">
            {order.id} - Batch {batch.batchNumber}
          </span>
          <span className="ml-4 text-xs text-gray-500 dark:text-zinc-400">
            Quantity: {batchQty}
          </span>
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-6 pt-2 bg-gray-50/50 dark:bg-zinc-800/20">
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            {/* Left Column */}
            <div className="space-y-3">
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
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
                  Total Order Quantity
                </dt>
                <dd className="text-sm text-gray-900 dark:text-zinc-300 font-mono">{order.orderQty}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
                  Batch Quantity
                </dt>
                <dd className="text-sm text-gray-900 dark:text-zinc-300 font-mono">{batchQty}</dd>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6 w-80">
              

              <div className="grid grid-cols-2 items-center">
                <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
                  Shipping Label
                </dt>
                <dd className="flex items-center gap-3">
                  <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{batchQty}</span>
                </dd>
              </div>

              <div className="grid grid-cols-2 items-center">
                <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
                  Return Label
                </dt>
                <dd className="flex items-center gap-3">
                  <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{batchQty}</span>
                </dd>
              </div>

              <div className="grid grid-cols-2 items-center">
                <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
                  TRF Form
                </dt>
                <dd className="flex items-center gap-3">
                  <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{batchQty}</span>
                </dd>
              </div>

              <div className="grid grid-cols-2 items-center">
                <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
                  Kit ID Label
                </dt>
                <dd className="flex items-center gap-3">
                  <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{batchQty}</span>
                </dd>
              </div>

              <div className="grid grid-cols-2 items-center">
                <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
                  Patient Label
                </dt>
                <dd className="flex items-center gap-3">
                  <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{batchQty}</span>
                </dd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
