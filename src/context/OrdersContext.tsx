"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { Order, OrderStatus, Batch, PrintRoomStatus } from "@/types/order"
import { mockOrders } from "@/lib/mock-data"

const STORAGE_KEY = "medzah_ofs_orders"

function serializeOrders(orders: Order[]): string {
  return JSON.stringify(orders.map(o => ({
    ...o,
    dateSubmitted: o.dateSubmitted.toISOString(),
    processedDate: o.processedDate?.toISOString() ?? null,
  })))
}

function deserializeOrders(raw: string): Order[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return mockOrders
    // Discard stale data that predates the dateSubmitted field
    if (parsed.some((o: Record<string, unknown>) => !o.dateSubmitted)) return mockOrders
    return parsed.map((o: Record<string, unknown>) => ({
      ...o,
      dateSubmitted: new Date(o.dateSubmitted as string),
      processedDate: o.processedDate ? new Date(o.processedDate as string) : undefined,
    })) as Order[]
  } catch {
    return mockOrders
  }
}

function loadOrders(): Order[] {
  if (typeof window === 'undefined') return mockOrders
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return mockOrders
  return deserializeOrders(raw)
}

interface OrdersContextValue {
  orders: Order[]
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void
  updateBatches: (orderId: string, batches: Batch[]) => void
  updateOrderSetupLots: (orderId: string, lots: Order['setupLots']) => void
  updatePrintRoomStatus: (orderId: string, newStatus: PrintRoomStatus) => void
  updateBatchPrintRoomStatus: (orderId: string, batchNumber: number, newStatus: PrintRoomStatus) => void
  updateVerificationStatus: (orderId: string, status: 'Under Verification' | 'Verified') => void
  updateBatchVerificationStatus: (orderId: string, batchNumber: number, status: 'Under Verification' | 'Verified') => void
  updateBatchScanStatus: (orderId: string, batchNumber: number, status: 'Complete' | 'Partially Complete') => void
  updateOrderScanStatus: (orderId: string, status: 'Complete' | 'Partially Complete') => void
  resetOrders: () => void
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(mockOrders)
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setOrders(loadOrders())
    setHydrated(true)
  }, [])

  // Persist to localStorage whenever orders change (after hydration)
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, serializeOrders(orders))
    }
  }, [orders, hydrated])

  const updateOrderStatus = useCallback((orderId: string, newStatus: OrderStatus) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? {
              ...order,
              status: newStatus,
              // When moving to Inprocess, default printRoomStatus to 'Printroom'
              printRoomStatus: newStatus === 'Inprocess' ? (order.printRoomStatus ?? 'Printroom') : order.printRoomStatus,
            }
          : order
      )
    )
  }, [])

  const updateBatches = useCallback((orderId: string, batches: Batch[]) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? {
              ...order,
              batches: batches.map(b => ({
                ...b,
                printRoomStatus: b.printRoomStatus ?? 'Printroom',
              })),
            }
          : order
      )
    )
  }, [])

  const updateOrderSetupLots = useCallback((orderId: string, lots: Order['setupLots']) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, setupLots: lots } : order
      )
    )
  }, [])

  const updatePrintRoomStatus = useCallback((orderId: string, newStatus: PrintRoomStatus) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, printRoomStatus: newStatus } : order
      )
    )
  }, [])

  const updateBatchPrintRoomStatus = useCallback((orderId: string, batchNumber: number, newStatus: PrintRoomStatus) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? {
              ...order,
              batches: order.batches?.map(b =>
                b.batchNumber === batchNumber ? { ...b, printRoomStatus: newStatus } : b
              ),
            }
          : order
      )
    )
  }, [])

  const updateVerificationStatus = useCallback((orderId: string, status: 'Under Verification' | 'Verified') => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, verificationStatus: status } : order
      )
    )
  }, [])

  const updateBatchVerificationStatus = useCallback((orderId: string, batchNumber: number, status: 'Under Verification' | 'Verified') => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id !== orderId) return order
        const updatedBatches = order.batches?.map(b =>
          b.batchNumber === batchNumber ? { ...b, verificationStatus: status } : b
        )
        // Re-derive the order-level verification status:
        // The order is Verified only when every batch that has QC failures is individually verified.
        const qcBatches = (updatedBatches ?? []).filter(b => b.scanStatus === 'Partially Complete')
        const orderVerif: 'Under Verification' | 'Verified' =
          qcBatches.length > 0 && qcBatches.every(b => b.verificationStatus === 'Verified')
            ? 'Verified'
            : 'Under Verification'
        return { ...order, batches: updatedBatches, verificationStatus: orderVerif }
      })
    )
  }, [])

  const updateBatchScanStatus = useCallback((orderId: string, batchNumber: number, status: 'Complete' | 'Partially Complete') => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? {
              ...order,
              batches: order.batches?.map(b =>
                b.batchNumber === batchNumber ? { ...b, scanStatus: status } : b
              ),
            }
          : order
      )
    )
  }, [])

  const updateOrderScanStatus = useCallback((orderId: string, status: 'Complete' | 'Partially Complete') => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, scanStatus: status } : order
      )
    )
  }, [])

  const resetOrders = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setOrders(mockOrders)
  }, [])

  return (
    <OrdersContext.Provider value={{ orders, updateOrderStatus, updateBatches, updateOrderSetupLots, updatePrintRoomStatus, updateBatchPrintRoomStatus, updateVerificationStatus, updateBatchVerificationStatus, updateBatchScanStatus, updateOrderScanStatus, resetOrders }}>
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider")
  return ctx
}
