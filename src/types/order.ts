export type OrderStatus =
  | 'Approved'
  | 'Inprocess'
  | 'Complete'
  | 'Onhold'
  | 'QC Failed'
  | 'Shipped'
  | 'Cancelled'
  | `Line ${number} - Complete`
  | `Line ${number} - Partially Complete`

/**
 * True for any status that means Station 2 scanning has finished
 * (with or without QC failures).
 */
export function isCompleteStatus(status: OrderStatus): boolean {
  return (
    status === 'Complete' ||
    (status as string).endsWith(' - Complete') ||
    (status as string).endsWith(' - Partially Complete')
  )
}

/**
 * True when scanning finished with zero QC failures.
 */
export function isFullyCompleteStatus(status: OrderStatus): boolean {
  return status === 'Complete' || (status as string).endsWith(' - Complete')
}

/**
 * True when scanning finished but some kits failed QC.
 */
export function isPartiallyCompleteStatus(status: OrderStatus): boolean {
  return (status as string).endsWith(' - Partially Complete')
}

export type PrintRoomStatus = 'Printroom' | 'Line 1' | 'Line 2' | 'Line 3' | 'Line 4' | 'Line 5' | 'Line 6'

export type KitName = 'Colofit Kit' | 'Adx Kit' | 'A1C Kit' | 'Kidney Combo Kit'

export interface Batch {
  batchNumber: number
  size: number
  lots: LotDistribution[]
  printRoomStatus?: PrintRoomStatus
  scanStatus?: 'Complete' | 'Partially Complete'
  verificationStatus?: 'Under Verification' | 'Verified'
}

export interface LotDistribution {
  lotId: string
  quantity: number
  catalogueNumber?: string
  lotNumber?: string
  expirationDate?: string // ISO date string
}

export interface Order {
  id: string
  clientName: string
  shipTo: string
  /** When the order was placed / added to the Approved queue */
  dateSubmitted: Date
  /** When the order was moved to Inprocess — undefined until that transition occurs */
  processedDate?: Date
  orderQty: number
  customerPO: string
  shippingLabelCount: number
  returnLabelCount: number
  trfFormCount: number
  kitIdLabelCount: number
  patientLabelCount: number
  status: OrderStatus
  kitName: KitName
  kitId: number
  isApprovedByLabcorp: boolean
  batches?: Batch[]
  setupLots?: LotDistribution[]  // lot info for non-batched orders
  printRoomStatus?: PrintRoomStatus
  verificationStatus?: 'Under Verification' | 'Verified'
  /** Scan completion for non-batched orders — parallel to Batch.scanStatus. Set by
   *  Station 2 when all kits are verified with no QC failures. The order-level status
   *  stays 'Inprocess' so the order remains in the Inprocess tab until shipped. */
  scanStatus?: 'Complete' | 'Partially Complete'
}

/**
 * Represents a single row in the production/QC station tables.
 * For batched orders each assigned batch produces its own ProductionItem;
 * for non-batched orders batch is null and the full order qty is used.
 */
export interface ProductionItem {
  order: Order
  batch: Batch | null
}
