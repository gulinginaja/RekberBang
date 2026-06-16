'use server'
import { createClient } from '@/lib/supabase/server'

export async function openDispute(transactionId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  
  // Update Tx Status
  await supabase.from('transactions').update({ status: 'DISPUTED' }).eq('id', transactionId)
  
  // Create Dispute Record
  const { data: dispute, error } = await supabase.from('disputes').insert({
    transaction_id: transactionId,
    raised_by: user.id,
    reason: reason
  }).select().single()

  if (error) throw new Error(error.message)

  await supabase.from('audit_logs').insert({
    transaction_id: transactionId,
    actor_id: user.id,
    action: 'OPEN_DISPUTE',
    metadata: { reason }
  })

  return dispute
}
