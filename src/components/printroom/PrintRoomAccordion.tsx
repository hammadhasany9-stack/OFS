import { Order } from "@/types/order"
import { format } from "date-fns"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { openTRFPrintForOrder } from "@/lib/trf-print"
import { openKitIdLabelPrint } from "@/lib/kit-id-label-print"

interface PrintRoomAccordionProps {
  order: Order
}

export function PrintRoomAccordion({ order }: PrintRoomAccordionProps) {
  const isOnLine = order.printRoomStatus && order.printRoomStatus !== 'Printroom'

  return (
    <div className="p-6 border-t border-gray-200 dark:border-zinc-700">
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
              <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">
                {order.trfFormCount}
              </span>
              {isOnLine && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  onClick={(e) => {
                    e.stopPropagation()
                    openTRFPrintForOrder(order)
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
              <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">
                {order.kitIdLabelCount}
              </span>
              {isOnLine && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  onClick={(e) => {
                    e.stopPropagation()
                    openKitIdLabelPrint(order)
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
  )
}
