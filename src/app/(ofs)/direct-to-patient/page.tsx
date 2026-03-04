"use client"

import { PageHeader } from "@/components/layout/PageHeader"
import { StatusTabs } from "@/components/orders/StatusTabs"
import { ControlBar, FilterOptions } from "@/components/orders/ControlBar"
import { OrdersTable } from "@/components/orders/OrdersTable"
import { PaginationBar } from "@/components/orders/PaginationBar"
import { useState } from "react"
import { useOrders } from "@/context/OrdersContext"
import { isPartiallyCompleteStatus } from "@/types/order"

export default function DirectToPatientPage() {
  const { orders, updateOrderStatus, updateBatches, updateOrderSetupLots, updateVerificationStatus } = useOrders()
  const [selectedStatus, setSelectedStatus] = useState<string>('Approved')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterOptions>({
    kitId: null,
    orderId: "",
    customerPO: "",
    dateRange: undefined,
    activePreset: "all",
  })

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters)
  }

  const statusFilteredOrders = orders.filter(order => {
    if (selectedStatus === 'all') return true
    if (selectedStatus === 'QC Failed') {
      return order.status === 'QC Failed' || isPartiallyCompleteStatus(order.status)
    }
    return order.status === selectedStatus
  })

  const filteredOrders = statusFilteredOrders.filter(order => {
    const searchMatch = searchQuery === '' ||
      order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPO.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase())

    const kitMatch = filters.kitId === null || order.kitId === filters.kitId

    const orderIdMatch = filters.orderId === '' ||
      order.id.toLowerCase().includes(filters.orderId.toLowerCase())

    const customerPOMatch = filters.customerPO === '' ||
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

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950">
      <div className="container mx-auto py-8 px-6 max-w-[1600px]">
        <PageHeader
          title="Order Fulfillment – Direct to Patient"
          subtitle="Manage and ship patient kit orders"
        />

        <div className="space-y-5">
          <StatusTabs
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            orders={orders}
          />

          <ControlBar
            recordCount={filteredOrders.length}
            orders={statusFilteredOrders}
            onSearch={setSearchQuery}
            onFilterChange={handleFilterChange}
          />

          <OrdersTable
            orders={filteredOrders}
            onStatusChange={updateOrderStatus}
            onBatchesUpdate={updateBatches}
            onSetupLotsUpdate={updateOrderSetupLots}
            activeTab={selectedStatus}
            onVerificationStatusChange={updateVerificationStatus}
          />

          <PaginationBar
            currentPage={1}
            totalPages={Math.ceil(filteredOrders.length / 10)}
            totalOrders={filteredOrders.length}
          />
        </div>
      </div>
    </div>
  )
}
