export type FeeSplitMode = 'BUYER_PAYS_ALL' | 'SELLER_PAYS_ALL' | 'SPLIT_50_50' | 'CUSTOM'

export type TransactionStatus = 
  | 'CREATED'
  | 'WAITING_PAYMENT'
  | 'PAYMENT_UNDER_REVIEW'
  | 'FUNDED'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'DISPUTED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'CANCELLED'

export type DisputeStatus = 'OPEN' | 'RESOLVED_BUYER' | 'RESOLVED_SELLER' | 'ESCALATED'

export type EvidencePurpose = 'PAYMENT_PROOF' | 'DELIVERY_PROOF' | 'DISPUTE_EVIDENCE'

export interface User {
  id: string
  telegram_id: number
  username?: string
  first_name?: string
  photo_url?: string
  is_admin: boolean
  trust_score: number
  created_at: string
}

export interface Transaction {
  id: string
  buyer_id: string
  seller_id: string
  title: string
  description: string
  amount: number
  fee: number
  fee_split_mode: FeeSplitMode
  status: TransactionStatus
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  transaction_id: string
  actor_id: string
  action: string
  metadata: any
  created_at: string
}

export interface Evidence {
  id: string
  transaction_id: string
  uploaded_by: string
  file_url: string
  purpose: EvidencePurpose
  created_at: string
}
