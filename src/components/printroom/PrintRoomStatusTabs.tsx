"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Order, PrintRoomStatus } from "@/types/order"

interface PrintRoomStatusTabsProps {
  selectedStatus: PrintRoomStatus
  onStatusChange: (status: PrintRoomStatus) => void
  orders: Order[]
}

const printRoomTabs: { value: PrintRoomStatus; label: string }[] = [
  { value: 'Printroom', label: 'Print Room' },
  { value: 'Line 1', label: 'Line 1' },
  { value: 'Line 2', label: 'Line 2' },
  { value: 'Line 3', label: 'Line 3' },
  { value: 'Line 4', label: 'Line 4' },
  { value: 'Line 5', label: 'Line 5' },
  { value: 'Line 6', label: 'Line 6' },
]

function getTabCounts(orders: Order[]): Record<PrintRoomStatus, number> {
  const counts: Record<PrintRoomStatus, number> = {
    'Printroom': 0,
    'Line 1': 0,
    'Line 2': 0,
    'Line 3': 0,
    'Line 4': 0,
    'Line 5': 0,
    'Line 6': 0,
  }

  for (const order of orders) {
    if (order.batches && order.batches.length > 0) {
      // Count each batch individually
      for (const batch of order.batches) {
        const status = batch.printRoomStatus ?? 'Printroom'
        counts[status]++
      }
    } else {
      const status = order.printRoomStatus ?? 'Printroom'
      counts[status]++
    }
  }

  return counts
}

export function PrintRoomStatusTabs({ selectedStatus, onStatusChange, orders }: PrintRoomStatusTabsProps) {
  const counts = getTabCounts(orders)

  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-1 transition-colors">
      <Tabs value={selectedStatus} onValueChange={(v) => onStatusChange(v as PrintRoomStatus)} className="w-full">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-1">
          {printRoomTabs.map((tab) => (
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
