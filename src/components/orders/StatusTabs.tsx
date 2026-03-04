"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Order, isPartiallyCompleteStatus } from "@/types/order"

interface StatusTabsProps {
  selectedStatus: string
  onStatusChange: (status: string) => void
  orders: Order[]
}

const statusTabs = [
  { value: 'Approved', label: 'Approved' },
  { value: 'Inprocess', label: 'In Process' },
  { value: 'Onhold', label: 'On Hold' },
  { value: 'QC Failed', label: 'QC Failed' },
  { value: 'Shipped', label: 'Shipped' },
  { value: 'Cancelled', label: 'Cancelled' },
]

export function StatusTabs({ selectedStatus, onStatusChange, orders }: StatusTabsProps) {
  // Calculate counts dynamically from the orders array
  const counts = statusTabs.reduce((acc, tab) => {
    if (tab.value === 'QC Failed') {
      acc[tab.value] = orders.filter(
        order => order.status === 'QC Failed' || isPartiallyCompleteStatus(order.status)
      ).length
    } else {
      acc[tab.value] = orders.filter(order => order.status === tab.value).length
    }
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-1 transition-colors">
      <Tabs value={selectedStatus} onValueChange={onStatusChange} className="w-full">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-1">
          {statusTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-primary hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-zinc-800 data-[state=active]:text-white dark:data-[state=active]:bg-primary dark:data-[state=active]:text-white dark:text-zinc-400 dark:hover:text-zinc-100 px-4 py-2.5 rounded-md data-[state=active]:shadow-md transition-all"
            >
              <span className="mr-2 font-medium">{tab.label}</span>
              <Badge 
                variant="secondary"
                className={selectedStatus === tab.value ? "bg-blue-500 dark:bg-blue-500 text-white dark:text-white" : "bg-gray-100 dark:bg-zinc-800/50 text-gray-700 dark:text-zinc-300 border-0"}
              >
                {counts[tab.value]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
