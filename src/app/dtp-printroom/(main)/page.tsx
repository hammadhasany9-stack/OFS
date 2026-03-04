"use client"

import { PageHeader } from "@/components/layout/PageHeader"
import { PrintRoomStatusTabs } from "@/components/printroom/PrintRoomStatusTabs"
import { PrintRoomTable, PrintRoomDisplayItem } from "@/components/printroom/PrintRoomTable"
import { ControlBar, FilterOptions } from "@/components/orders/ControlBar"
import { PaginationBar } from "@/components/orders/PaginationBar"
import { useOrders } from "@/context/OrdersContext"
import { useState } from "react"
import { PrintRoomStatus } from "@/types/order"

export default function DtpPrintRoomPage() {
  const { orders, updatePrintRoomStatus, updateBatchPrintRoomStatus } = useOrders()
  const [selectedStatus, setSelectedStatus] = useState<PrintRoomStatus>('Printroom')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterOptions>({
    kitId: null,
    orderId: "",
    customerPO: "",
    dateRange: undefined,
    activePreset: "all",
  })

  // Only show orders that are Inprocess in OFS
  const inprocessOrders = orders.filter(order => order.status === 'Inprocess')

  // Filter by print room status tab
  const tabFilteredOrders = inprocessOrders.filter(order => {
    if (order.batches && order.batches.length > 0) {
      // For batched orders: show if any batch matches the selected tab
      return order.batches.some(
        (b) => (b.printRoomStatus ?? 'Printroom') === selectedStatus
      )
    }
    return (order.printRoomStatus ?? 'Printroom') === selectedStatus
  })

  // Apply search and filters
  const filteredOrders = tabFilteredOrders.filter(order => {
    const searchMatch =
      searchQuery === '' ||
      order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPO.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase())

    const kitMatch = filters.kitId === null || order.kitId === filters.kitId

    const orderIdMatch =
      filters.orderId === '' ||
      order.id.toLowerCase().includes(filters.orderId.toLowerCase())

    const customerPOMatch =
      filters.customerPO === '' ||
      order.customerPO.toLowerCase().includes(filters.customerPO.toLowerCase())

    const dateRangeMatch = (() => {
      if (!filters.dateRange?.from) return true
      const d = new Date(order.dateSubmitted)
      d.setHours(0, 0, 0, 0)
      const from = new Date(filters.dateRange.from)
      from.setHours(0, 0, 0, 0)
      if (filters.dateRange.to) {
        const to = new Date(filters.dateRange.to)
        to.setHours(23, 59, 59, 999)
        return d >= from && d <= to
      }
      return d.getTime() === from.getTime()
    })()

    return searchMatch && kitMatch && orderIdMatch && customerPOMatch && dateRangeMatch
  })

  // Build display items:
  // - Print Room tab: one item per order (full order row, batches expand underneath)
  // - Line tabs: one item per order (non-batched) OR one item per matching batch (batched)
  const displayItems: PrintRoomDisplayItem[] = []

  for (const order of filteredOrders) {
    if (selectedStatus === 'Printroom') {
      displayItems.push({ kind: 'order', order })
    } else {
      if (order.batches && order.batches.length > 0) {
        // Flatten: each batch that matches this line becomes its own row
        for (const batch of order.batches) {
          if ((batch.printRoomStatus ?? 'Printroom') === selectedStatus) {
            displayItems.push({ kind: 'batch', order, batch })
          }
        }
      } else {
        displayItems.push({ kind: 'order', order })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950">
      <div className="container mx-auto py-8 px-6 max-w-[1600px]">
        <PageHeader
          title="Print Room – Direct to Patient"
          subtitle="Manage production line assignments"
        />

        <div className="space-y-5">
          <PrintRoomStatusTabs
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            orders={inprocessOrders}
          />

          <ControlBar
            recordCount={displayItems.length}
            orders={tabFilteredOrders}
            onSearch={setSearchQuery}
            onFilterChange={setFilters}
          />

          <PrintRoomTable
            items={displayItems}
            selectedStatus={selectedStatus}
            onStatusChange={updatePrintRoomStatus}
            onBatchStatusChange={updateBatchPrintRoomStatus}
          />

          <PaginationBar
            currentPage={1}
            totalPages={Math.ceil(displayItems.length / 10)}
            totalOrders={displayItems.length}
          />
        </div>
      </div>
    </div>
  )
}
