"use client"

import { useState, useMemo, useEffect } from "react"
import { Order } from "@/types/order"
import { Lot, Batch, LotDistribution } from "@/types/lot"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarIcon, Edit2, Trash2, Plus, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface KitIdLabelModalProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
  onSetupComplete: (batches: Batch[], lots: Lot[]) => void
}

export function KitIdLabelModal({
  order,
  open,
  onOpenChange,
  onSetupComplete,
}: KitIdLabelModalProps) {
  // Batch state
  const [batchEnabled, setBatchEnabled] = useState(false)
  const [selectedBatchSize, setSelectedBatchSize] = useState<number | null>(null)
  const [customBatchSize, setCustomBatchSize] = useState("")

  // LOT state
  const [lots, setLots] = useState<Lot[]>([])
  const [lotForms, setLotForms] = useState<Array<{ id: string; data: Partial<Lot> }>>([
    {
      id: `form-${Date.now()}`,
      data: {
        catalogueNumber: "",
        lotNumber: "",
        expirationDate: undefined,
        quantity: undefined,
      },
    },
  ])
  const [lotBeingEdited, setLotBeingEdited] = useState<string | null>(null)
  const [showLotSuccess, setShowLotSuccess] = useState(false)

  // Batch size options
  const batchSizes = [25, 50, 100, 150, 200, 250]

  // When batch split is enabled, pre-select 25 tab if order qty > 25, else pre-select custom (empty)
  useEffect(() => {
    if (!batchEnabled) return
    if (order.orderQty > 25) {
      setSelectedBatchSize(25)
      setCustomBatchSize("")
    } else {
      setSelectedBatchSize(null)
      setCustomBatchSize("")
    }
  }, [batchEnabled, order.orderQty])

  // Calculate total LOT quantity
  const totalLotQuantity = useMemo(
    () => lots.reduce((sum, lot) => sum + lot.quantity, 0),
    [lots]
  )

  // Calculate remaining quantity needed
  const remainingQuantity = order.orderQty - totalLotQuantity

  // Check if all LOT quantities match order quantity
  const isQuantityMatched = totalLotQuantity === order.orderQty

  // Check if total lot quantity exceeds order quantity
  const hasExcessQuantity = totalLotQuantity > order.orderQty

  // Get effective batch size (selected or custom)
  const effectiveBatchSize = useMemo(() => {
    if (customBatchSize && !isNaN(Number(customBatchSize))) {
      return Number(customBatchSize)
    }
    return selectedBatchSize
  }, [selectedBatchSize, customBatchSize])

  // Check if batch size exceeds order quantity
  const batchSizeExceedsOrder = effectiveBatchSize ? effectiveBatchSize > order.orderQty : false

  // Calculate batches
  const calculatedBatches = useMemo(() => {
    if (!batchEnabled || !effectiveBatchSize || effectiveBatchSize <= 0) {
      return null
    }

    const numBatches = Math.ceil(order.orderQty / effectiveBatchSize)
    const lastBatchSize = order.orderQty % effectiveBatchSize || effectiveBatchSize

    return {
      numBatches,
      batchSize: effectiveBatchSize,
      lastBatchSize,
    }
  }, [batchEnabled, effectiveBatchSize, order.orderQty])

  // Distribute LOTs across batches
  const distributeLots = useMemo((): Batch[] => {
    if (!batchEnabled || !calculatedBatches || lots.length === 0) {
      return []
    }

    const batches: Batch[] = []
    let lotIndex = 0
    let remainingFromCurrentLot = lots[0]?.quantity || 0

    for (let i = 0; i < calculatedBatches.numBatches; i++) {
      const batchSize =
        i === calculatedBatches.numBatches - 1
          ? calculatedBatches.lastBatchSize
          : calculatedBatches.batchSize

      const batchLots: LotDistribution[] = []
      let batchRemaining = batchSize

      while (batchRemaining > 0 && lotIndex < lots.length) {
        const currentLotObj = lots[lotIndex]
        const quantityToTake = Math.min(remainingFromCurrentLot, batchRemaining)

        batchLots.push({
          lotId: currentLotObj.id,
          quantity: quantityToTake,
        })

        batchRemaining -= quantityToTake
        remainingFromCurrentLot -= quantityToTake

        if (remainingFromCurrentLot === 0) {
          lotIndex++
          remainingFromCurrentLot = lots[lotIndex]?.quantity || 0
        }
      }

      batches.push({
        batchNumber: i + 1,
        size: batchSize,
        lots: batchLots,
      })
    }

    return batches
  }, [batchEnabled, calculatedBatches, lots])

  // Update LOT form data
  const updateLotForm = (formId: string, data: Partial<Lot>) => {
    setLotForms((prev) =>
      prev.map((form) => (form.id === formId ? { ...form, data: { ...form.data, ...data } } : form))
    )
  }

  // Add LOT from a specific form
  const handleAddLot = (formId: string) => {
    const form = lotForms.find((f) => f.id === formId)
    if (!form) return

    const { data } = form
    if (
      !data.catalogueNumber ||
      !data.lotNumber ||
      !data.expirationDate ||
      !data.quantity ||
      data.quantity <= 0
    ) {
      return
    }

    if (lotBeingEdited) {
      // Update existing LOT
      setLots((prev) =>
        prev.map((lot) =>
          lot.id === lotBeingEdited ? { ...(data as Lot), id: lotBeingEdited } : lot
        )
      )
      setLotBeingEdited(null)
    } else {
      // Add new LOT
      const newLot: Lot = {
        id: `lot-${Date.now()}-${Math.random()}`,
        catalogueNumber: data.catalogueNumber,
        lotNumber: data.lotNumber,
        expirationDate: data.expirationDate,
        quantity: data.quantity,
      }
      setLots((prev) => [...prev, newLot])
    }

    // Reset this form
    setLotForms((prev) =>
      prev.map((f) =>
        f.id === formId
          ? {
              ...f,
              data: {
                catalogueNumber: "",
                lotNumber: "",
                expirationDate: undefined,
                quantity: undefined,
              },
            }
          : f
      )
    )

    // Show success message
    setShowLotSuccess(true)
    setTimeout(() => setShowLotSuccess(false), 3000)
  }

  // Add LOT and create new form (plus button)
  const handleAddLotAndNewForm = (formId: string) => {
    handleAddLot(formId)
    // Add a new empty form
    setLotForms((prev) => [
      ...prev,
      {
        id: `form-${Date.now()}-${Math.random()}`,
        data: {
          catalogueNumber: "",
          lotNumber: "",
          expirationDate: undefined,
          quantity: undefined,
        },
      },
    ])
  }

  // Edit LOT
  const handleEditLot = (lot: Lot) => {
    // Update the first form with the lot data for editing
    setLotForms((prev) => {
      const updated = [...prev]
      if (updated[0]) {
        updated[0].data = lot
      }
      return updated
    })
    setLotBeingEdited(lot.id)
  }

  // Remove LOT
  const handleRemoveLot = (lotId: string) => {
    setLots((prev) => prev.filter((lot) => lot.id !== lotId))
  }

  // Setup complete
  const handleSetupComplete = () => {
    if (isQuantityMatched) {
      onSetupComplete(distributeLots, lots)
      onOpenChange(false)
    }
  }

  // Get LOT details by ID
  const getLotById = (lotId: string) => lots.find((lot) => lot.id === lotId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Setup Batches & Kit ID Label</DialogTitle>
          <DialogDescription>
            Setup kit id labels and batch sizes for your order below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Section 1: Order Information */}
          <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3">
            <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-zinc-100">
              Order Information
            </h3>
            <div className="grid grid-cols-4">
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Order ID
                </dt>
                <dd className="text-sm text-gray-900 dark:text-zinc-200 font-medium">
                  {order.id}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Kit ID
                </dt>
                <dd className="text-sm text-gray-900 dark:text-zinc-200 font-medium">
                  {order.kitId}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Kit Name
                </dt>
                <dd className="text-sm text-gray-900 dark:text-zinc-200 font-medium">
                  {order.kitName}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Order Quantity
                </dt>
                <dd className="text-sm text-gray-900 dark:text-zinc-200 font-medium">
                  {order.orderQty}
                </dd>
              </div>
            </div>
          </div>

          {/* Section 2: Batch Setup */}
          <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
                Split your orders into batches for printing
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-zinc-400">
                  {batchEnabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={batchEnabled}
                  onCheckedChange={setBatchEnabled}
                />
              </div>
            </div>

            {batchEnabled && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {batchSizes.map((size) => {
                    const isDisabled = size > order.orderQty
                    return (
                      <Button
                        key={size}
                        variant={selectedBatchSize === size ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedBatchSize(size)
                          setCustomBatchSize("")
                        }}
                        disabled={isDisabled}
                        className={cn(
                          selectedBatchSize === size &&
                            "dark:bg-primary dark:text-white",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {size}
                      </Button>
                    )
                  })}
                  <Input
                    type="number"
                    min="0"
                    placeholder="Custom"
                    value={customBatchSize}
                    onChange={(e) => {
                      const value = e.target.value
                      // Only update if value is empty or >= 0
                      if (value === "" || Number(value) >= 0) {
                        setCustomBatchSize(value)
                        setSelectedBatchSize(null)
                      }
                    }}
                    className={cn(
                      "w-24 h-9 dark:bg-zinc-800 dark:border-zinc-700",
                      selectedBatchSize === null &&
                        "ring-2 ring-primary border-primary dark:ring-primary dark:border-primary"
                    )}
                  />
                </div>

                {batchSizeExceedsOrder && (
                  <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <AlertDescription className="text-red-800 dark:text-red-400 text-sm">
                      Batch size ({effectiveBatchSize}) exceeds order quantity ({order.orderQty}). Please select a smaller batch size or use custom quantity to split the order.
                    </AlertDescription>
                  </Alert>
                )}

                {calculatedBatches && !batchSizeExceedsOrder && (
                  <div className="text-sm text-gray-600 dark:text-zinc-400">
                    <span className="font-medium">
                      {calculatedBatches.numBatches} batches
                    </span>{" "}
                    of {calculatedBatches.batchSize} items each
                    {calculatedBatches.lastBatchSize !== calculatedBatches.batchSize && (
                      <span> (last batch: {calculatedBatches.lastBatchSize} items)</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: LOT Entry */}
          <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3">
            <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-zinc-100">
              Enter LOT information for the order
            </h3>

            {showLotSuccess && (
              <Alert className="mb-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-400">
                  LOT {lotBeingEdited ? "updated" : "added"} successfully
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: LOT Input Forms */}
              <div className="space-y-3">
                {lotForms.map((form, index) => {
                  const formData = form.data
                  const isFormValid =
                    formData.catalogueNumber &&
                    formData.lotNumber &&
                    formData.expirationDate &&
                    formData.quantity &&
                    formData.quantity > 0

                  // Check if adding this lot would exceed order quantity (unless editing)
                  const wouldExceedQuantity = lotBeingEdited
                    ? false
                    : formData.quantity
                    ? totalLotQuantity + formData.quantity > order.orderQty
                    : false

                  return (
                    <div key={form.id} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3 bg-gray-50 dark:bg-zinc-800/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">
                          LOT Entry
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1 block">
                            Catalogue Number
                          </label>
                          <Input
                            placeholder="Enter catalogue number"
                            value={formData.catalogueNumber || ""}
                            onChange={(e) =>
                              updateLotForm(form.id, { catalogueNumber: e.target.value })
                            }
                            className="dark:bg-zinc-800 dark:border-zinc-700 h-8"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1 block">
                            Lot Number
                          </label>
                          <Input
                            placeholder="Enter lot number"
                            value={formData.lotNumber || ""}
                            onChange={(e) =>
                              updateLotForm(form.id, { lotNumber: e.target.value })
                            }
                            className="dark:bg-zinc-800 dark:border-zinc-700 h-8"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1 block">
                            Expiration Date
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-8 dark:bg-zinc-800 dark:border-zinc-700",
                                  !formData.expirationDate && "text-gray-500 dark:text-zinc-400"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.expirationDate ? (
                                  format(formData.expirationDate, "MM/dd/yy")
                                ) : (
                                  <span>MM/DD/YY</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 dark:bg-zinc-900 dark:border-zinc-800">
                              <Calendar
                                mode="single"
                                selected={formData.expirationDate}
                                onSelect={(date) =>
                                  updateLotForm(form.id, { expirationDate: date })
                                }
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1 block">
                            Quantity
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter quantity"
                            value={formData.quantity || ""}
                            onChange={(e) => {
                              const value = e.target.value ? Number(e.target.value) : undefined
                              // Only update if value is undefined or >= 0
                              if (value === undefined || value >= 0) {
                                updateLotForm(form.id, { quantity: value })
                              }
                            }}
                            className="dark:bg-zinc-800 dark:border-zinc-700 h-8"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAddLot(form.id)}
                            disabled={!isFormValid || wouldExceedQuantity}
                            className="flex-1 dark:bg-primary dark:hover:bg-primary/90 h-8"
                            size="sm"
                          >
                            {lotBeingEdited ? "Update LOT" : "Add LOT"}
                          </Button>
                          
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Right: Added LOTs */}
              <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3 bg-gray-50 dark:bg-zinc-800/30">
                <h4 className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-2">
                  Added LOTs
                </h4>
                {lots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-zinc-400">
                    <p className="text-sm">No LOTs added yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {lots.map((lot) => (
                      <div
                        key={lot.id}
                        className="p-2 border border-gray-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 flex-1 text-xs">
                            <div>
                              <span className="text-gray-500 dark:text-zinc-400">Cat#:</span>
                              <span className="font-medium text-gray-900 dark:text-zinc-200 ml-1">
                                {lot.catalogueNumber}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-zinc-400">LOT#:</span>
                              <span className="font-medium text-gray-900 dark:text-zinc-200 ml-1">
                                {lot.lotNumber}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-zinc-400">Exp:</span>
                              <span className="font-medium text-gray-900 dark:text-zinc-200 ml-1">
                                {format(lot.expirationDate, "MM/dd/yy")}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-zinc-400">Qty:</span>
                              <span className="font-medium text-gray-900 dark:text-zinc-200 ml-1">
                                {lot.quantity}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditLot(lot)}
                              className="h-6 w-6 dark:hover:bg-zinc-700"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveLot(lot.id)}
                              className="h-6 w-6 text-red-600 dark:text-red-400 dark:hover:bg-zinc-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200 dark:border-zinc-700">
                      <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        Total:
                      </span>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          isQuantityMatched
                            ? "text-green-600 dark:text-green-400"
                            : "text-orange-600 dark:text-orange-400"
                        )}
                      >
                        {totalLotQuantity} / {order.orderQty}
                      </span>
                    </div>

                    {!isQuantityMatched && (
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        {remainingQuantity > 0
                          ? `Remaining: ${remainingQuantity} items`
                          : `Excess: ${Math.abs(remainingQuantity)} items`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Your LOT Summary - Always visible */}
          <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3">
            <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-zinc-100">
              Your LOT Summary
            </h3>

            {/* Error Alert for Excess Quantity */}
            {hasExcessQuantity && (
              <Alert className="mb-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertDescription className="text-red-800 dark:text-red-400">
                  <strong>Error:</strong> Total LOT quantity ({totalLotQuantity}) exceeds order quantity ({order.orderQty}). 
                  You have added {totalLotQuantity - order.orderQty} items more than required. 
                  Kit ID label cannot be set up until the required quantity is fulfilled correctly.
                </AlertDescription>
              </Alert>
            )}

            {lots.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-zinc-400">
                <p className="text-sm">No LOTs added yet. Please add LOT information above.</p>
                {batchEnabled && effectiveBatchSize && !batchSizeExceedsOrder && (
                  <p className="text-sm mt-1">
                    Batch size selected: {effectiveBatchSize} items per batch
                  </p>
                )}
              </div>
            ) : (
              <>
                {batchEnabled && distributeLots.length > 0 && !batchSizeExceedsOrder ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 dark:text-zinc-400">
                      <span className="font-medium">
                        {calculatedBatches?.numBatches} batches created
                      </span>{" "}
                      with {effectiveBatchSize} items per batch
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {distributeLots.map((batch) => (
                        <div
                          key={batch.batchNumber}
                          className="border border-gray-200 dark:border-zinc-700 rounded p-2 bg-gray-50 dark:bg-zinc-800/50"
                        >
                          <h4 className="text-xs font-semibold mb-1 text-gray-900 dark:text-zinc-100">
                            Batch {batch.batchNumber}
                          </h4>
                          <div className="text-xs text-gray-600 dark:text-zinc-400 mb-1">
                            {batch.size} items
                          </div>
                          <div className="space-y-1">
                            {batch.lots.map((lotDist, idx) => {
                              const lotDetails = getLotById(lotDist.lotId)
                              return (
                                <div
                                  key={`${lotDist.lotId}-${idx}`}
                                  className="text-xs text-gray-700 dark:text-zinc-300"
                                >
                                  <div>LOT {lotDetails?.lotNumber}</div>
                                  <div className="font-medium">{lotDist.quantity} items</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {batchEnabled && effectiveBatchSize && !batchSizeExceedsOrder && (
                      <div className="text-sm text-gray-600 dark:text-zinc-400 mb-2">
                        Batch size selected: {effectiveBatchSize} items per batch 
                        {calculatedBatches && (
                          <span> ({calculatedBatches.numBatches} batches will be created)</span>
                        )}
                      </div>
                    )}
                    {lots.map((lot) => (
                      <div
                        key={lot.id}
                        className="flex justify-between p-2 border border-gray-200 dark:border-zinc-700 rounded bg-gray-50 dark:bg-zinc-800/50"
                      >
                        <span className="text-sm text-gray-700 dark:text-zinc-300">
                          LOT {lot.lotNumber} (Cat: {lot.catalogueNumber}) - Exp:{" "}
                          {format(lot.expirationDate, "MM/dd/yy")}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                          {lot.quantity} items
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-zinc-700">
                      <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                        Total:
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                        {totalLotQuantity} / {order.orderQty} items
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-center gap-3 mt-4">
          <Button
            onClick={handleSetupComplete}
            disabled={!isQuantityMatched || hasExcessQuantity}
            className="dark:bg-primary dark:hover:bg-primary/90"
            title={
              hasExcessQuantity
                ? "Cannot setup: LOT quantity exceeds order quantity"
                : !isQuantityMatched
                ? "Cannot setup: LOT quantity does not match order quantity"
                : "Setup Kit ID Label"
            }
          >
            Setup Kit ID Label
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
