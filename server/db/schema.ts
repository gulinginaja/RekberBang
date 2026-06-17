export type FeeSplitMode = 'BUYER_PAYS_ALL' | 'SELLER_PAYS_ALL' | 'SPLIT_50_50' | 'CUSTOM'

export type TransactionStatus = 
  | 'PENDING_ADMIN_APPROVAL'
  | 'CREATED'
  | 'WAITING_PAYMENT'
  | 'PAYMENT_UNDER_REVIEW'
  | 'FUNDED'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'CONFIRMED'
  | 'DISPUTED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'RESOLVED_PARTIAL'
  | 'COMPLETED'
  | 'CANCELLED'

export type DisputeStatus = 'OPEN' | 'RESOLVED_BUYER' | 'RESOLVED_SELLER' | 'ESCALATED'

export type EvidencePurpose = 'PAYMENT_PROOF' | 'DELIVERY_PROOF' | 'DISPUTE_EVIDENCE'

export type UserRole = 'user' | 'admin' | 'super_admin'

export interface User {
  id: string
  telegram_id: number
  username?: string
  first_name?: string
  photo_url?: string
  role: UserRole
  trust_score: number
  created_at: string
  terms_accepted_at?: string | null
}

export interface PaymentMethod {
  id: string
  bank_name: string
  account_number: string
  account_holder: string
  is_active: boolean
  created_at: string
}

export interface QrisSetting {
  id: string
  image_url: string
  is_active: boolean
  created_at: string
}

export interface Transaction {
  id: string
  buyer_id: string | null
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
  file_url: string | null
  purpose: EvidencePurpose
  created_at: string
  
  // Privacy & OCR Metadata
  proof_hash?: string | null
  nominal?: number | null
  sender_name?: string | null
  sender_account?: string | null
  recipient_name?: string | null
  recipient_account?: string | null
  bank_name?: string | null
  transfer_date?: string | null
  transfer_time?: string | null
  verification_status?: string | null
  verified_by?: string | null
  verified_at?: string | null
  expires_at?: string | null
}
