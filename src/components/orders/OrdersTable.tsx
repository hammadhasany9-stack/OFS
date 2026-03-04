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
import { Order, OrderStatus, Batch, LotDistribution, isPartiallyCompleteStatus } from "@/types/order"
import { format } from "date-fns"
import { ChevronDown, ChevronRight } from "lucide-react"
import { OrderAccordion } from "./OrderAccordion"
import { BatchAccordion } from "./BatchAccordion"
import { QCFailedAccordion } from "./QCFailedAccordion"
import { useState, useEffect } from "react"

interface OrdersTableProps {
  orders: Order[]
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void
  onBatchesUpdate?: (orderId: string, batches: Batch[]) => void
  onSetupLotsUpdate?: (orderId: string, lots: LotDistribution[]) => void
  activeTab?: string
  onVerificationStatusChange?: (orderId: string, status: 'Under Verification' | 'Verified') => void
}

const statusColors: Record<string, string> = {
  'Approved': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  'Inprocess': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  'Onhold': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  'QC Failed': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  'Shipped': 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
  'Cancelled': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
}

function getStatusColor(status: OrderStatus): string {
  if (statusColors[status]) return statusColors[status]
  // Template literal statuses (Line X - Complete, Line X - Partially Complete)
  if (isPartiallyCompleteStatus(status)) return statusColors['QC Failed']
  return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
}

// Define available status transitions for each status
const statusTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  'Approved': ['Inprocess', 'Onhold', 'Cancelled'],
  'Inprocess': ['Shipped', 'Onhold', 'Cancelled'],
  'Onhold': ['Approved', 'Cancelled'],
  'QC Failed': ['Shipped', 'Onhold'],
  'Shipped': [],
  'Cancelled': [],
  'Complete': [],
}

function getAvailableTransitions(status: OrderStatus): OrderStatus[] {
  if (statusTransitions[status]) return statusTransitions[status]!
  // Partially Complete orders get same transitions as QC Failed
  if (isPartiallyCompleteStatus(status)) return ['Shipped', 'Onhold']
  return []
}

interface OrderRowProps {
  order: Order
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void
  onBatchesUpdate?: (orderId: string, batches: Batch[]) => void
  onSetupLotsUpdate?: (orderId: string, lots: LotDistribution[]) => void
  activeTab?: string
  onVerificationStatusChange?: (orderId: string, status: 'Under Verification' | 'Verified') => void
}

function OrderRow({ order, onStatusChange, onBatchesUpdate, onSetupLotsUpdate, activeTab, onVerificationStatusChange }: OrderRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isKitIdSetup, setIsKitIdSetup] = useState(false)

  const isQCFailedTab = activeTab === 'QC Failed'
  const isQCFailedOrder = order.status === 'QC Failed' || isPartiallyCompleteStatus(order.status)

  const availableTransitions = getAvailableTransitions(order.status)
  const hasDropdown = availableTransitions.length > 0

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (onStatusChange) {
      onStatusChange(order.id, newStatus)
    }
  }

  // True when all scanning is done and the order is ready to ship.
  // For batched orders: every batch must have scanStatus 'Complete'.
  // For non-batched orders: order.scanStatus must be 'Complete' (set by Station 2
  // when all kits are verified with no QC failures — status stays 'Inprocess').
  const isReadyToShip = (() => {
    if (order.status !== 'Inprocess') return false
    if (order.batches && order.batches.length > 0) {
      return order.batches.length > 0 && order.batches.every(b => b.scanStatus === 'Complete')
    }
    return order.scanStatus === 'Complete'
  })()

  // For Inprocess orders: Shipped is blocked until scanning is fully complete.
  const inprocessShippedBlocked = order.status === 'Inprocess' && !isReadyToShip

  const inprocessShippedBlockedReason = (() => {
    if (!inprocessShippedBlocked) return null
    if (order.batches && order.batches.length > 0) {
      const pending = order.batches.filter(b => b.scanStatus == null).length
      return `${pending} batch${pending !== 1 ? 'es' : ''} scan pending`
    }
    return 'Complete scanning first'
  })()

  const isStatusDisabled = (status: OrderStatus) => {
    if (order.status === 'Approved' && status === 'Inprocess' && !isKitIdSetup) {
      return true
    }
    // Disable Shipped for QC Failed / partially complete orders until verified
    if (isQCFailedOrder && status === 'Shipped' && order.verificationStatus !== 'Verified') {
      return true
    }
    // Disable Shipped for Inprocess orders until all scanning is complete
    if (status === 'Shipped' && inprocessShippedBlocked) {
      return true
    }
    return false
  }

  const getDisabledReason = (status: OrderStatus) => {
    if (order.status === 'Approved' && status === 'Inprocess' && !isKitIdSetup) {
      return 'Setup Kit ID first'
    }
    if (isQCFailedOrder && status === 'Shipped' && order.verificationStatus !== 'Verified') {
      return 'Verify failed kits first'
    }
    if (status === 'Shipped' && inprocessShippedBlocked) {
      return inprocessShippedBlockedReason
    }
    return null
  }

  const verificationStatusColors = {
    'Under Verification': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    'Verified': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  }

  const currentVerifStatus = order.verificationStatus ?? 'Under Verification'

  // Prototype: auto-verify after 30 seconds when status is Under Verification.
  // Batched orders derive their order-level verification from each batch's own
  // timer (in BatchRow), so this timer only runs for non-batched orders.
  // `order.batches` is intentionally read inside the effect without being listed
  // as a dep — batches are set once and never change while an order is QC Failed,
  // so omitting it is safe and keeps the deps array size stable.
  useEffect(() => {
    if (!isQCFailedTab || currentVerifStatus !== 'Under Verification') return
    if (order.batches && order.batches.length > 0) return // handled per-batch in BatchRow
    const timer = setTimeout(() => {
      onVerificationStatusChange?.(order.id, 'Verified')
    }, 30_000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQCFailedTab, currentVerifStatus, order.id, onVerificationStatusChange])

  // Green highlight in the Inprocess tab for orders that are ready to ship.
  const rowClassName = activeTab === 'Inprocess' && isReadyToShip
    ? "bg-green-50/60 hover:bg-green-100/60 dark:bg-green-900/10 dark:hover:bg-green-900/20 cursor-pointer transition-colors"
    : "hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"

  return (
    <>
      <TableRow
        className={rowClassName}
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
          {hasDropdown ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Badge
                    variant="outline"
                    className={getStatusColor(order.status)}
                  >
                    {isQCFailedTab && isPartiallyCompleteStatus(order.status) ? 'QC Failed' : order.status}
                  </Badge>
                  <ChevronDown className="h-3 w-3 dark:text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="dark:bg-zinc-900 dark:border-zinc-800">
                {availableTransitions.map((status) => {
                  const disabled = isStatusDisabled(status)
                  const reason = getDisabledReason(status)
                  return (
                    <DropdownMenuItem
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!disabled) {
                          handleStatusChange(status)
                        }
                      }}
                      disabled={disabled}
                      className={`dark:hover:bg-zinc-800 dark:text-zinc-300 ${
                        disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer'
                      }`}
                    >
                      {status}
                      {disabled && reason && (
                        <span className="text-xs ml-2 text-gray-500 dark:text-zinc-500">
                          ({reason})
                        </span>
                      )}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Badge
              variant="outline"
              className={getStatusColor(order.status)}
            >
              {isQCFailedTab && isPartiallyCompleteStatus(order.status) ? 'QC Failed' : order.status}
            </Badge>
          )}
        </TableCell>
        {/* Verification Status column — only in QC Failed tab */}
        {isQCFailedTab && (
          <TableCell onClick={(e) => e.stopPropagation()}>
            <Badge
              variant="outline"
              className={verificationStatusColors[currentVerifStatus]}
            >
              {currentVerifStatus}
            </Badge>
          </TableCell>
        )}
        <TableCell className="font-medium dark:text-zinc-200">{order.customerPO}</TableCell>
        <TableCell className="dark:text-zinc-300">{order.id}</TableCell>
        <TableCell className="dark:text-zinc-300">{order.kitName}</TableCell>
        <TableCell className="dark:text-zinc-300">
          {order.kitId}
        </TableCell>
        <TableCell className="dark:text-zinc-300 px-16">{order.orderQty}</TableCell>
        <TableCell className="dark:text-zinc-300">{format(order.dateSubmitted, 'MMM dd, yyyy ; HH:mm')}</TableCell>
        <TableCell className="dark:text-zinc-300">{order.clientName}</TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={isQCFailedTab ? 10 : 9} className="p-0 bg-gray-50 dark:bg-zinc-800/50">
            {/* QC Failed accordion for partially complete / QC Failed orders */}
            {isQCFailedOrder ? (
              <QCFailedAccordion order={order} />
            ) : order.status === 'Inprocess' && order.batches && order.batches.length > 0 ? (
              <div className="border-t border-gray-200 dark:border-zinc-700">
                {order.batches.map((batch) => (
                  <BatchAccordion
                    key={`${order.id}-batch-${batch.batchNumber}`}
                    order={order}
                    batch={batch}
                  />
                ))}
              </div>
            ) : (
              <OrderAccordion
                order={order}
                isKitIdSetup={isKitIdSetup}
                onKitIdSetupChange={setIsKitIdSetup}
                onBatchesUpdate={onBatchesUpdate}
                onSetupLotsUpdate={onSetupLotsUpdate}
              />
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function OrdersTable({ orders, onStatusChange, onBatchesUpdate, onSetupLotsUpdate, activeTab, onVerificationStatusChange }: OrdersTableProps) {
  const isQCFailedTab = activeTab === 'QC Failed'

  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-900 overflow-hidden transition-colors">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">STATUS</TableHead>
            {isQCFailedTab && (
              <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">VERIFICATION STATUS</TableHead>
            )}
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">CUSTOMER PO</TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">ORDER ID</TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">KIT NAME</TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">KIT ID</TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">ORDER QUANTITY</TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">DATE SUBMITTED (EST)</TableHead>
            <TableHead className="uppercase text-xs font-semibold text-gray-700 dark:text-zinc-400">CUSTOMER</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isQCFailedTab ? 10 : 9} className="text-center py-12 text-gray-500 dark:text-zinc-400">
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onStatusChange={onStatusChange}
                onBatchesUpdate={onBatchesUpdate}
                onSetupLotsUpdate={onSetupLotsUpdate}
                activeTab={activeTab}
                onVerificationStatusChange={onVerificationStatusChange}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
