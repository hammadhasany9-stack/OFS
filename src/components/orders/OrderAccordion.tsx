import { useState } from "react"
import { Order, Batch as OrderBatch, LotDistribution } from "@/types/order"
import { Lot, Batch } from "@/types/lot"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Printer } from "lucide-react"
import { format } from "date-fns"
import { KitIdLabelModal } from "./KitIdLabelModal"
import { openTRFPrintForOrder } from "@/lib/trf-print"
import { openKitIdLabelPrint } from "@/lib/kit-id-label-print"

interface OrderAccordionProps {
  order: Order
  isKitIdSetup: boolean
  onKitIdSetupChange: (value: boolean) => void
  onBatchesUpdate?: (orderId: string, batches: OrderBatch[]) => void
  onSetupLotsUpdate?: (orderId: string, lots: LotDistribution[]) => void
}

export function OrderAccordion({ order, isKitIdSetup, onKitIdSetupChange, onBatchesUpdate, onSetupLotsUpdate }: OrderAccordionProps) {
  const isApprovedStatus = order.status === 'Approved'
  const isShippedStatus = order.status === 'Shipped'
  const [modalOpen, setModalOpen] = useState(false)

  const handleSetupComplete = (batches: Batch[], lots: Lot[]) => {
    onKitIdSetupChange(true)

    if (batches.length === 0 && lots.length > 0) {
      // Batch splitting disabled: store lot details directly on the order so
      // the print function can access them without creating a fake batch.
      if (onSetupLotsUpdate) {
        onSetupLotsUpdate(order.id, lots.map(lot => ({
          lotId: lot.id,
          quantity: lot.quantity,
          catalogueNumber: lot.catalogueNumber,
          lotNumber: lot.lotNumber,
          expirationDate: lot.expirationDate.toISOString(),
        })))
      }
      // Ensure batches is cleared (no fake batch in the UI)
      if (onBatchesUpdate) {
        onBatchesUpdate(order.id, [])
      }
    } else {
      // Batch splitting enabled: enrich each LotDistribution with the full lot
      // details (catalogueNumber, lotNumber, expirationDate) for printing.
      if (onBatchesUpdate) {
        onBatchesUpdate(order.id, batches.map(batch => ({
          batchNumber: batch.batchNumber,
          size: batch.size,
          lots: batch.lots.map(lotDist => {
            const fullLot = lots.find(l => l.id === lotDist.lotId)
            return {
              lotId: lotDist.lotId,
              quantity: lotDist.quantity,
              catalogueNumber: fullLot?.catalogueNumber ?? '',
              lotNumber: fullLot?.lotNumber ?? '',
              expirationDate: fullLot?.expirationDate?.toISOString() ?? '',
            }
          }),
        })))
      }
    }
  }

  return (
    <div className="p-6 border-t border-gray-200 dark:border-zinc-700">
      {/* Only show setup kit id and labcorp alert for Approved status */}
      {isApprovedStatus && (
        <div className="flex items-center justify-between mb-6">
          {!isKitIdSetup ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                Setup kit id label to process the order
              </span>
              <Button 
                size="sm" 
                className="dark:bg-primary dark:hover:bg-primary/90"
                onClick={() => setModalOpen(true)}
              >
                Setup Kit ID Label
              </Button>
            </div>
          ) : (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 w-auto py-2 px-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-400 text-sm font-medium">
                  The kit ID label has been setup, you can process the order now
                </AlertDescription>
              </div>
            </Alert>
          )}
          
          {order.isApprovedByLabcorp && (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 w-auto py-2 px-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-400 text-sm">
                  Order is approved by labcorp
                </AlertDescription>
              </div>
            </Alert>
          )}
        </div>
      )}

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
              {order.processedDate ? format(order.processedDate, 'MMM dd, yyyy ; HH:mm') : '—'}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
              Customer PO
            </dt>
            <dd className="text-sm text-gray-900 dark:text-zinc-300">{order.customerPO}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
              Total Order Quantity
            </dt>
            <dd className="text-sm text-gray-900 dark:text-zinc-300">{order.orderQty}</dd>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 w-80">
          

          <div className="grid grid-cols-2 items-center">
            <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
              Shipping Label
            </dt>
            <dd className="flex items-center gap-3">
              <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{order.shippingLabelCount}</span>
              {isShippedStatus && order.shippingLabelCount > 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="items-center h-8 text-xs gap-1.5 text-primary hover:bg-primary/5 hover:text-primary dark:bg-primary/10 border-primary dark:hover:bg-primary/20 dark:text-zinc-300"
                  onClick={() => console.log(`Print ${order.shippingLabelCount} Shipping Label(s)`)}
                >
                  <Printer className="h-3 w-3" />
                  Print Shipping Label{order.shippingLabelCount > 1 ? 's' : ''}
                </Button>
              )}
            </dd>
          </div>

          <div className="grid grid-cols-2 items-center">
            <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
              Return Label
            </dt>
            <dd className="flex items-center gap-3">
              <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{order.returnLabelCount}</span>
              {isShippedStatus && order.returnLabelCount > 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/5 hover:text-primary dark:bg-primary/10 border-primary dark:hover:bg-primary/20 dark:text-zinc-300"
                  onClick={() => console.log(`Print ${order.returnLabelCount} Return Label(s)`)}
                >
                  <Printer className="h-3 w-3" />
                  Print Return Label{order.returnLabelCount > 1 ? 's' : ''}
                </Button>
              )}
            </dd>
          </div>

          <div className="grid grid-cols-2 items-center">
            <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
              TRF Form
            </dt>
            <dd className="flex items-center gap-3">
              <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{order.trfFormCount}</span>
              {isShippedStatus && order.trfFormCount > 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/5 hover:text-primary dark:bg-primary/10 border-primary dark:hover:bg-primary/20 dark:text-zinc-300"
                  onClick={() => openTRFPrintForOrder(order)}
                >
                  <Printer className="h-3 w-3" />
                  Print TRF Form{order.trfFormCount > 1 ? 's' : ''}
                </Button>
              )}
            </dd>
          </div>

          <div className="grid grid-cols-2 items-center">
            <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
              Kit ID Label
            </dt>
            <dd className="flex items-center gap-3">
              <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{order.kitIdLabelCount}</span>
              {isShippedStatus && order.kitIdLabelCount > 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/5 hover:text-primary dark:bg-primary/10 border-primary dark:hover:bg-primary/20 dark:text-zinc-300"
                  onClick={() => openKitIdLabelPrint(order)}
                >
                  <Printer className="h-3 w-3" />
                  Print Kit ID Label{order.kitIdLabelCount > 1 ? 's' : ''}
                </Button>
              )}
            </dd>
          </div>

          <div className="grid grid-cols-2 items-center">
            <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
              Patient Label
            </dt>
            <dd className="flex items-center gap-3">
              <span className="text-sm text-gray-900 dark:text-white font-medium min-w-[24px]">{order.patientLabelCount}</span>
              {isShippedStatus && order.patientLabelCount > 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/5 hover:text-primary dark:bg-primary/10 border-primary dark:hover:bg-primary/20 dark:text-zinc-300"
                  onClick={() => console.log(`Print ${order.patientLabelCount} Patient Label(s)`)}
                >
                  <Printer className="h-3 w-3" />
                  Print Patient Label{order.patientLabelCount > 1 ? 's' : ''}
                </Button>
              )}
            </dd>
          </div>
        </div>
      </div>

      <KitIdLabelModal
        order={order}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSetupComplete={handleSetupComplete}
      />
    </div>
  )
}
