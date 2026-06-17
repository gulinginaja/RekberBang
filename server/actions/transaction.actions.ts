'use server'

import { createClient } from '@/lib/supabase/server'
import { TransactionStatus, FeeSplitMode } from '@/server/db/schema'
import { resolveUserByUsername } from '@/lib/actions/user.actions'
import { sendTelegramNotification } from '@/lib/telegram/bot'

const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "1638657267"

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
  fee_split_mode?: FeeSplitMode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (params.amount <= 0) return { error: 'Amount must be greater than 0' }

  const { data: tx, error } = await supabase.from('transactions').insert({
    title: params.title,
    description: params.description,
    amount: params.amount,
    seller_id: user.id,
    buyer_id: null,
    fee_split_mode: params.fee_split_mode || 'SPLIT_50_50',
    status: 'CREATED'
  }).select().single()

  if (error) return { error: error.message }

  await logAuditAction(supabase, tx.id, user.id, 'TRANSACTION_CREATED', { amount: params.amount })

  return { success: true, transaction: tx }
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
      seller:seller_id (id, username, first_name),
      evidences (*),
      disputes (*),
      dispute_messages (*, sender:sender_id(username, is_admin))
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

export async function acceptTransactionInvite(transactionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: tx, error: fetchErr } = await supabase.from('transactions').select('*').eq('id', transactionId).single()
  if (fetchErr || !tx) return { error: 'Transaction not found' }

  if (tx.seller_id === user.id) return { error: 'Seller cannot accept their own invite' }
  if (tx.buyer_id !== null) return { error: 'Transaction already has a buyer' }
  if (tx.status !== 'CREATED') return { error: 'Transaction is no longer open for invites' }

  const { error: updateErr } = await supabase.from('transactions')
    .update({ buyer_id: user.id, status: 'WAITING_PAYMENT', updated_at: new Date().toISOString() })
    .eq('id', transactionId)

  if (updateErr) return { error: updateErr.message }

  await logAuditAction(supabase, transactionId, user.id, 'TRANSACTION_ACCEPTED_BY_BUYER')

  await sendTelegramNotification(tx.seller_id, `✅ <b>PEMBELI BERGABUNG</b>\n\nPembeli telah menerima undangan transaksi Anda: <b>${tx.title}</b>.\nStatus: Menunggu Pembeli melakukan pembayaran ke Rekber.`)

  return { success: true }
}

export async function submitPaymentProof(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const transactionId = formData.get('transactionId') as string
  const file = formData.get('file') as File

  if (!transactionId || !file) return { error: 'Missing parameters' }
  if (file.size > 5 * 1024 * 1024) return { error: 'File size must be less than 5MB' }

  // Validate state
  const { data: tx, error: txError } = await supabase.from('transactions').select('*').eq('id', transactionId).single()
  if (txError || !tx) return { error: 'Transaction not found' }
  if (tx.buyer_id !== user.id) return { error: 'Only the buyer can upload payment proof' }
  if (tx.status !== 'WAITING_PAYMENT' && tx.status !== 'PAYMENT_UNDER_REVIEW') {
    return { error: 'Transaction is not awaiting payment' }
  }

  // Upload file
  const fileExt = file.name.split('.').pop()
  const fileName = `${transactionId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('rekber_evidence')
    .upload(fileName, file, { upsert: false })

  if (uploadError) return { error: `Upload failed: ${uploadError.message}` }

  // Record evidence
  const { error: evError } = await supabase.from('evidences').insert({
    transaction_id: transactionId,
    uploader_id: user.id,
    file_url: uploadData.path,
    file_type: file.type,
    description: 'Payment Proof'
  })
  if (evError) return { error: evError.message }

  // Update transaction status
  const { error: updateErr } = await supabase.from('transactions')
    .update({ status: 'PAYMENT_UNDER_REVIEW', updated_at: new Date().toISOString() })
    .eq('id', transactionId)
  if (updateErr) return { error: updateErr.message }

  await logAuditAction(supabase, transactionId, user.id, 'PAYMENT_PROOF_UPLOADED')
  
  await sendTelegramNotification(ADMIN_CHAT_ID, `📸 <b>BUKTI TRANSFER DIUNGGAH</b>\n\nTransaksi: <b>${tx.title}</b>\nPembeli mengunggah bukti transfer. Silakan verifikasi di Dashboard Admin.`)
  await sendTelegramNotification(tx.seller_id, `⏳ <b>MENUNGGU VERIFIKASI ADMIN</b>\n\nPembeli telah mentransfer dana untuk <b>${tx.title}</b>. Menunggu Admin memverifikasi pembayaran.`)

  return { success: true }
}

export async function verifyPayment(transactionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Admin Check
  const { data: publicUser } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!publicUser?.is_admin) return { error: 'Forbidden' }

  const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single()
  if (!tx || tx.status !== 'PAYMENT_UNDER_REVIEW') return { error: 'Invalid transaction status' }

  const { error: updateErr } = await supabase.from('transactions')
    .update({ status: 'FUNDED', updated_at: new Date().toISOString() })
    .eq('id', transactionId)

  if (updateErr) return { error: updateErr.message }
  await logAuditAction(supabase, transactionId, user.id, 'PAYMENT_APPROVED_BY_ADMIN')
  
  await sendTelegramNotification(tx.buyer_id, `🛡️ <b>PEMBAYARAN DIVERIFIKASI</b>\n\nDana untuk <b>${tx.title}</b> telah diamankan oleh Admin.`)
  await sendTelegramNotification(tx.seller_id, `🚚 <b>DANA AMAN, SILAKAN KIRIM BARANG</b>\n\nDana untuk <b>${tx.title}</b> telah diamankan. Silakan kirim produk/jasa ke pembeli sekarang!`)

  return { success: true }
}

export async function rejectPayment(transactionId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: publicUser } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!publicUser?.is_admin) return { error: 'Forbidden' }

  const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single()
  if (!tx || tx.status !== 'PAYMENT_UNDER_REVIEW') return { error: 'Invalid transaction status' }

  const { error: updateErr } = await supabase.from('transactions')
    .update({ status: 'WAITING_PAYMENT', updated_at: new Date().toISOString() })
    .eq('id', transactionId)

  if (updateErr) return { error: updateErr.message }
  await logAuditAction(supabase, transactionId, user.id, 'PAYMENT_REJECTED_BY_ADMIN', { reason })
  return { success: true }
}

// ==========================================
// Final Stages: Delivery, Dispute & Release
// ==========================================

export async function submitDeliveryEvidence(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const transactionId = formData.get('transactionId') as string
  const notes = formData.get('notes') as string
  const file = formData.get('file') as File

  if (!transactionId || !file) return { error: 'Missing parameters' }
  if (file.size > 5 * 1024 * 1024) return { error: 'File size must be less than 5MB' }

  const { data: tx, error: txError } = await supabase.from('transactions').select('*').eq('id', transactionId).single()
  if (txError || !tx) return { error: 'Transaction not found' }
  if (tx.seller_id !== user.id) return { error: 'Only the seller can upload delivery evidence' }
  if (tx.status !== 'FUNDED') return { error: 'Transaction is not funded' }

  const fileExt = file.name.split('.').pop()
  const fileName = `deliveries/${transactionId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('rekber_evidence')
    .upload(fileName, file, { upsert: false })

  if (uploadError) return { error: `Upload failed: ${uploadError.message}` }

  const { error: evError } = await supabase.from('evidences').insert({
    transaction_id: transactionId,
    uploader_id: user.id,
    file_url: uploadData.path,
    file_type: file.type,
    description: `Delivery Proof: ${notes || 'No notes'}`
  })
  if (evError) return { error: evError.message }

  const { error: updateErr } = await supabase.from('transactions')
    .update({ status: 'DELIVERING', updated_at: new Date().toISOString() })
    .eq('id', transactionId)
  if (updateErr) return { error: updateErr.message }

  await logAuditAction(supabase, transactionId, user.id, 'SELLER_DELIVERY_SUBMITTED')
  
  await sendTelegramNotification(tx.buyer_id, `📦 <b>BARANG DIKIRIM</b>\n\nPenjual telah mengirimkan pesanan: <b>${tx.title}</b>.\nSilakan periksa dan konfirmasi penerimaan di aplikasi.`)

  return { success: true }
}

export async function confirmDelivery(transactionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single()
  if (!tx || tx.status !== 'DELIVERING') return { error: 'Transaction is not in delivery' }
  if (tx.buyer_id !== user.id) return { error: 'Only the buyer can confirm delivery' }

  const { error } = await supabase.from('transactions')
    .update({ status: 'DELIVERED', updated_at: new Date().toISOString() })
    .eq('id', transactionId)

  if (error) return { error: error.message }
  await logAuditAction(supabase, transactionId, user.id, 'BUYER_CONFIRMED_DELIVERY')
  
  await sendTelegramNotification(tx.seller_id, `🎉 <b>PEMBELI MENGKONFIRMASI PENERIMAAN</b>\n\nPembeli telah menerima pesanan: <b>${tx.title}</b>.\nDana siap dicairkan oleh Admin.`)
  await sendTelegramNotification(ADMIN_CHAT_ID, `💸 <b>DANA SIAP DILEPAS</b>\n\nTransaksi <b>${tx.title}</b> selesai. Silakan cairkan dana ke Penjual.`)

  return { success: true }
}

export async function requestClarification(transactionId: string, message: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single()
  if (!tx || !['DELIVERING', 'DELIVERED'].includes(tx.status)) return { error: 'Cannot request clarification at this stage' }
  if (tx.buyer_id !== user.id && tx.seller_id !== user.id) return { error: 'Unauthorized' }

  await logAuditAction(supabase, transactionId, user.id, 'CLARIFICATION_REQUESTED', { message })
  return { success: true }
}

export async function raiseDispute(transactionId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single()
  if (!tx || !['DELIVERING', 'DELIVERED'].includes(tx.status)) return { error: 'Cannot dispute at this stage' }
  if (tx.buyer_id !== user.id && tx.seller_id !== user.id) return { error: 'Unauthorized' }

  // Create dispute record
  const { error: disputeErr } = await supabase.from('disputes').insert({
    transaction_id: transactionId,
    raiser_id: user.id,
    reason: reason
  })
  if (disputeErr) return { error: disputeErr.message }

  // Update status
  const { error } = await supabase.from('transactions')
    .update({ status: 'DISPUTED', updated_at: new Date().toISOString() })
    .eq('id', transactionId)

  if (error) return { error: error.message }
  await logAuditAction(supabase, transactionId, user.id, 'DISPUTE_RAISED', { reason })
  
  const opponentId = tx.buyer_id === user.id ? tx.seller_id : tx.buyer_id;
  await sendTelegramNotification(opponentId, `⚠️ <b>DISPUTE DIAJUKAN</b>\n\nPihak lawan mengajukan dispute untuk transaksi <b>${tx.title}</b>. Dana dibekukan. Admin akan memediasi.`)
  await sendTelegramNotification(ADMIN_CHAT_ID, `⚖️ <b>DISPUTE BARU!</b>\n\nTransaksi <b>${tx.title}</b> sedang bermasalah. Mohon segera periksa Dispute Center.`)

  return { success: true }
}

export async function resolveDispute(
  transactionId: string, 
  resolution: 'RELEASE_TO_SELLER' | 'REFUND_TO_BUYER' | 'PARTIAL_SETTLEMENT', 
  notes: string,
  sellerAmount?: number,
  buyerAmount?: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: publicUser } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!publicUser?.is_admin) return { error: 'Forbidden' }

  const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single()
  if (!tx || tx.status !== 'DISPUTED') return { error: 'Transaction is not disputed' }

  const newStatus = resolution === 'RELEASE_TO_SELLER' ? 'RELEASED' : 
                    resolution === 'REFUND_TO_BUYER' ? 'REFUNDED' : 'RESOLVED_PARTIAL'

  const { error } = await supabase.from('transactions')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', transactionId)
  if (error) return { error: error.message }

  await supabase.from('disputes')
    .update({ 
      status: 'RESOLVED', 
      resolution_notes: notes, 
      resolved_by: user.id, 
      resolved_at: new Date().toISOString(),
      settlement_seller_amount: sellerAmount || 0,
      settlement_buyer_amount: buyerAmount || 0
    })
    .eq('transaction_id', transactionId)

  await logAuditAction(supabase, transactionId, user.id, 'DISPUTE_RESOLVED', { resolution, notes, sellerAmount, buyerAmount })
  
  await sendTelegramNotification(tx.buyer_id, `⚖️ <b>DISPUTE SELESAI</b>\n\nResolusi untuk <b>${tx.title}</b> telah diputuskan oleh Admin. Cek aplikasi untuk detailnya.`)
  await sendTelegramNotification(tx.seller_id, `⚖️ <b>DISPUTE SELESAI</b>\n\nResolusi untuk <b>${tx.title}</b> telah diputuskan oleh Admin. Cek aplikasi untuk detailnya.`)

  return { success: true }
}

export async function sendDisputeMessage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const transactionId = formData.get('transactionId') as string
  const message = formData.get('message') as string
  const file = formData.get('file') as File | null
  const isInternal = formData.get('isInternal') === 'true'

  if (!transactionId || (!message && !file)) return { error: 'Message or file is required' }

  // Admin Check
  const { data: publicUser } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  const isAdmin = publicUser?.is_admin === true

  if (isInternal && !isAdmin) return { error: 'Only admins can send internal notes' }

  let attachmentUrl = null
  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return { error: 'File too large' }
    const fileExt = file.name.split('.').pop()
    const fileName = `disputes/${transactionId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('rekber_evidence')
      .upload(fileName, file, { upsert: false })
      
    if (uploadError) return { error: uploadError.message }
    attachmentUrl = uploadData.path
  }

  const { error } = await supabase.from('dispute_messages').insert({
    transaction_id: transactionId,
    sender_id: user.id,
    message: message,
    attachment_url: attachmentUrl,
    is_internal_note: isInternal
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function releaseFunds(transactionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: publicUser } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!publicUser?.is_admin) return { error: 'Forbidden' }

  const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single()
  if (!tx || tx.status !== 'DELIVERED') return { error: 'Cannot release funds for this status' }

  const { error } = await supabase.from('transactions')
    .update({ status: 'RELEASED', updated_at: new Date().toISOString() })
    .eq('id', transactionId)

  if (error) return { error: error.message }
  await logAuditAction(supabase, transactionId, user.id, 'FUNDS_RELEASED_BY_ADMIN')
  return { success: true }
}

