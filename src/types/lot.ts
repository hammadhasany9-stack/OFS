export interface Lot {
  id: string // unique identifier
  catalogueNumber: string
  lotNumber: string
  expirationDate: Date
  quantity: number
}

export interface Batch {
  batchNumber: number
  size: number
  lots: LotDistribution[]
}

export interface LotDistribution {
  lotId: string
  quantity: number
}
