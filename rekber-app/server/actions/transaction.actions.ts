'use server'

import { createClient } from '@/lib/supabase/server'
import { TransactionStatus, FeeSplitMode } from '@/server/db/schema'

/**
 * Internal helper to log actions to the audit_logs table.
 */
async function logAuditAction(supabase: any, transactionId: string, actorId: string, action: string, metadata: any = {}) {
  const { error } = await supabase.from('audit_logs').insert({
    transaction_id: transactionId,
    actor_id: actorId,
    action,
    metadata
  })
  
  if (error) {
    console.error('Failed to write audit log:', error)
    // Depending on strictness, you might want to throw here to abort the parent transaction.
    // However, Supabase RPC or pg_cron might be needed for true atomic cross-table transactions 
    // unless using a Postgres function. We'll log it for MVP.
  }
}

/**
 * Validates state transitions based on the strict state machine rules.
 */
function isValidTransition(currentStatus: TransactionStatus, nextStatus: TransactionStatus, isAdmin: boolean = false): boolean {
  if (isAdmin) {
    // Admins have override privileges for dispute resolution and funding
    const adminAllowed = [
      'PAYMENT_UNDER_REVIEW', 'FUNDED', 'RELEASED', 'REFUNDED', 'DISPUTED', 'CANCELLED'
    ]
    if (adminAllowed.includes(nextStatus)) return true
  }

  const allowedTransitions: Record<TransactionStatus, TransactionStatus[]> = {
    'CREATED': ['WAITING_PAYMENT', 'CANCELLED'], // Waiting acceptance is now skipped, seller goes straight to WAITING_PAYMENT upon accept
    'WAITING_PAYMENT': ['PAYMENT_UNDER_REVIEW', 'CANCELLED'],
    'PAYMENT_UNDER_REVIEW': ['FUNDED'], // Admin only, but mapped here
    'FUNDED': ['DELIVERING'],
    'DELIVERING': ['DELIVERED', 'DISPUTED'],
    'DELIVERED': ['RELEASED', 'DISPUTED'], // Buyer releases implicitly via Confirm
    'DISPUTED': ['RELEASED', 'REFUNDED'],
    'RELEASED': [],
    'REFUNDED': [],
    'CANCELLED': []
  }

  return allowedTransitions[currentStatus]?.includes(nextStatus) ?? false
}

export async function createTransaction(params: {
  title: string
  description: string
  amount: number
  seller_id: string
  fee_split_mode?: FeeSplitMode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (params.amount <= 0) return { error: 'Amount must be greater than 0' }
  if (user.id === params.seller_id) return { error: 'Buyer and Seller cannot be the same' }

  // Create the transaction
  const { data: tx, error } = await supabase.from('transactions').insert({
    title: params.title,
    description: params.description,
    amount: params.amount,
    buyer_id: user.id,
    seller_id: params.seller_id,
    fee_split_mode: params.fee_split_mode || 'SPLIT_50_50',
    status: 'CREATED'
  }).select().single()

  if (error) return { error: error.message }

  // Log creation
  await logAuditAction(supabase, tx.id, user.id, 'TRANSACTION_CREATED', { amount: params.amount })

  return { success: true, transaction: tx }
}

export async function acceptTransaction(transactionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Fetch current state
  const { data: tx, error: fetchErr } = await supabase.from('transactions').select('*').eq('id', transactionId).single()
  if (fetchErr || !tx) return { error: 'Transaction not found' }

  if (tx.seller_id !== user.id) return { error: 'Only the seller can accept the transaction' }
  
  if (!isValidTransition(tx.status, 'WAITING_PAYMENT')) {
    return { error: `Invalid state transition from ${tx.status} to WAITING_PAYMENT` }
  }

  const { error: updateErr } = await supabase.from('transactions')
    .update({ status: 'WAITING_PAYMENT', updated_at: new Date().toISOString() })
    .eq('id', transactionId)

  if (updateErr) return { error: updateErr.message }

  await logAuditAction(supabase, transactionId, user.id, 'TRANSACTION_ACCEPTED')

  return { success: true }
}

export async function cancelTransaction(transactionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: tx, error: fetchErr } = await supabase.from('transactions').select('*').eq('id', transactionId).single()
  if (fetchErr || !tx) return { error: 'Transaction not found' }

  // Check permissions (buyer or seller can cancel before funding)
  if (tx.buyer_id !== user.id && tx.seller_id !== user.id) {
    return { error: 'Unauthorized to cancel this transaction' }
  }

  if (!isValidTransition(tx.status, 'CANCELLED')) {
    return { error: `Cannot cancel a transaction in status ${tx.status}` }
  }

  const { error: updateErr } = await supabase.from('transactions')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('id', transactionId)

  if (updateErr) return { error: updateErr.message }

  await logAuditAction(supabase, transactionId, user.id, 'TRANSACTION_CANCELLED')

  return { success: true }
}

export async function getTransactionDetail(transactionId: string) {
  const supabase = await createClient()
  
  const { data: tx, error } = await supabase.from('transactions')
    .select(`
      *,
      buyer:buyer_id (id, username, first_name),
      seller:seller_id (id, username, first_name)
    `)
    .eq('id', transactionId)
    .single()

  if (error) return { error: error.message }
  return { transaction: tx }
}

export async function getTransactionTimeline(transactionId: string) {
  const supabase = await createClient()
  
  const { data: logs, error } = await supabase.from('audit_logs')
    .select(`
      *,
      actor:actor_id (username, first_name)
    `)
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { logs }
}
