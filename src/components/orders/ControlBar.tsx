"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Search, Filter, Calendar as CalendarIcon, ChevronDown, X } from "lucide-react"
import { useState } from "react"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { DateRange } from "react-day-picker"
import { Order } from "@/types/order"
import { Separator } from "@/components/ui/separator"

export interface FilterOptions {
  kitId: number | null
  orderId: string
  customerPO: string
  dateRange: { from?: Date; to?: Date } | undefined
  activePreset: string
}

interface ControlBarProps {
  recordCount: number
  orders: Order[]
  onSearch: (query: string) => void
  onFilterChange: (filters: FilterOptions) => void
}

const PROCESSED_PRESETS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "last7" },
  { label: "Last 30 days", value: "last30" },
  { label: "Custom range", value: "custom" },
]

function resolvePresetRange(value: string): DateRange | undefined {
  const today = new Date()
  switch (value) {
    case "today":
      return { from: startOfDay(today), to: endOfDay(today) }
    case "last7":
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) }
    case "last30":
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) }
    default:
      return undefined
  }
}

export function ControlBar({ recordCount, orders, onSearch, onFilterChange }: ControlBarProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [activePreset, setActivePreset] = useState("all")
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    kitId: null,
    orderId: "",
    customerPO: "",
    dateRange: undefined,
    activePreset: "all",
  })

  const uniqueKits = Array.from(
    new Map(orders.map(order => [`${order.kitId}`, { id: order.kitId, name: order.kitName }])).values()
  )

  const selectedKit = uniqueKits.find(kit => kit.id === filters.kitId)

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters, dateRange, activePreset }
    setFilters(updatedFilters)
    onFilterChange(updatedFilters)
  }

  const handleClearFilters = () => {
    const clearedFilters: FilterOptions = {
      kitId: null,
      orderId: "",
      customerPO: "",
      dateRange,
      activePreset,
    }
    setFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  const hasActiveFilters = filters.kitId !== null || filters.orderId !== "" || filters.customerPO !== ""

  const handlePresetSelect = (preset: typeof PROCESSED_PRESETS[number]) => {
    const resolvedRange = preset.value !== "custom" ? resolvePresetRange(preset.value) : dateRange
    setActivePreset(preset.value)
    setDateRange(resolvedRange)
    const updatedFilters: FilterOptions = {
      ...filters,
      dateRange: resolvedRange,
      activePreset: preset.value,
    }
    setFilters(updatedFilters)
    onFilterChange(updatedFilters)
    if (preset.value !== "custom") {
      setFilterPopoverOpen(false)
    }
  }

  const processedLabel = (() => {
    if (activePreset === "custom" && dateRange?.from) {
      return dateRange.to
        ? `${format(dateRange.from, "MMM dd")} – ${format(dateRange.to, "MMM dd")}`
        : format(dateRange.from, "MMM dd, yyyy")
    }
    const preset = PROCESSED_PRESETS.find(p => p.value === activePreset)
    return `Processed: ${preset?.label ?? "All"}`
  })()

  const isProcessedActive = activePreset !== "all"

  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm transition-colors">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1.5 text-sm font-semibold bg-gray-100 dark:bg-zinc-800 dark:text-zinc-300">
            {recordCount} records
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Combined Processed + Date Range filter */}
          <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`gap-2 h-10 min-w-[190px] justify-between dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300 ${isProcessedActive ? "bg-primary/10 dark:bg-primary/20 border-primary dark:border-primary text-primary dark:text-white" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate">{processedLabel}</span>
                </div>
                <ChevronDown className="h-4 w-4 flex-shrink-0 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 dark:bg-zinc-900 dark:border-zinc-800"
              align="end"
              sideOffset={6}
            >
              <div className="flex divide-x dark:divide-zinc-800">
                {/* Preset list */}
                <div className="flex flex-col p-2 min-w-[160px]">
                  <p className="text-[11px] font-semibold text-muted-foreground dark:text-zinc-500 uppercase tracking-wide px-2 py-1 mb-1">
                    Processed
                  </p>
                  {PROCESSED_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handlePresetSelect(preset)}
                      className={`text-left text-sm px-3 py-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-zinc-300 ${
                        activePreset === preset.value
                          ? "bg-primary/10 dark:bg-primary/20 text-primary dark:text-white font-medium"
                          : ""
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Inline calendar — revealed only when Custom range is selected */}
                {activePreset === "custom" && (
                  <div className="p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground dark:text-zinc-500 uppercase tracking-wide px-1 pb-2">
                      Select date range
                    </p>
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range)
                        const updatedFilters: FilterOptions = {
                          ...filters,
                          dateRange: range,
                          activePreset: "custom",
                        }
                        setFilters(updatedFilters)
                        onFilterChange(updatedFilters)
                        if (range?.from && range?.to) {
                          setFilterPopoverOpen(false)
                        }
                      }}
                      numberOfMonths={2}
                      className="dark:bg-zinc-900"
                    />
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button 
            variant="outline" 
            className={`gap-2 h-10 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300 ${showFilters || hasActiveFilters ? 'bg-primary/10 dark:bg-primary/60 border-primary dark:border-primary text-primary dark:text-white' : ''}`}
            onClick={() => setShowFilters(!showFilters)
            }
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filters</span>
            {hasActiveFilters && (
              <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-[10px]">
                {[filters.kitId !== null, filters.orderId !== "", filters.customerPO !== ""].filter(Boolean).length}
              </Badge>
            )}
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-zinc-500" />
            <Input
              placeholder="Search orders..."
              className="pl-9 w-64 h-10 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:placeholder:text-zinc-500"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showFilters && (
        <>
          <Separator className="dark:bg-zinc-800" />
          <div className="p-4 bg-gray-50 dark:bg-zinc-900/50">
            <div className="flex items-end gap-4">
              <div className="flex-1 grid grid-cols-3 gap-4">
                {/* Kit Dropdown */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-zinc-400 uppercase">
                    Kit
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between h-10 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300"
                      >
                        <span className="text-sm truncate">
                          {selectedKit ? `${selectedKit.id} - ${selectedKit.name}` : "Select kit"}
                        </span>
                        <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[250px] dark:bg-zinc-900 dark:border-zinc-800">
                      <DropdownMenuItem 
                        onClick={() => handleFilterChange({ kitId: null })}
                        className="dark:hover:bg-zinc-800 dark:text-zinc-300"
                      >
                        All Kits
                      </DropdownMenuItem>
                      {uniqueKits.map((kit) => (
                        <DropdownMenuItem 
                          key={kit.id}
                          onClick={() => handleFilterChange({ kitId: kit.id })}
                          className="dark:hover:bg-zinc-800 dark:text-zinc-300"
                        >
                          {kit.id} - {kit.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Order ID */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-zinc-400 uppercase">
                    Order ID
                  </label>
                  <Input
                    placeholder="Search by Order ID"
                    value={filters.orderId}
                    onChange={(e) => handleFilterChange({ orderId: e.target.value })}
                    className="h-10 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:placeholder:text-zinc-500"
                  />
                </div>

                {/* Customer PO */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-zinc-400 uppercase">
                    Customer PO
                  </label>
                  <Input
                    placeholder="Search by Customer PO"
                    value={filters.customerPO}
                    onChange={(e) => handleFilterChange({ customerPO: e.target.value })}
                    className="h-10 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:placeholder:text-zinc-500"
                  />
                </div>
              </div>

              {/* Clear Filter Button */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-7 h-10 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
