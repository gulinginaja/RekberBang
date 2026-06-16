'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTransaction(data: {
  seller_id: string, title: string, description: string, 
  amount: number, fee: number, fee_split_mode: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Check Terms Acceptance
  const { data: profile } = await supabase.from('users').select('terms_accepted_at').eq('id', user.id).single()
  if (!profile?.terms_accepted_at) throw new Error("Terms not accepted")

  const { data: tx, error } = await supabase.from('transactions').insert({
    buyer_id: user.id,
    ...data,
    status: 'CREATED'
  }).select().single()

  if (error) throw new Error(error.message)

  // Audit Log
  await supabase.from('audit_logs').insert({
    transaction_id: tx.id,
    actor_id: user.id,
    action: 'CREATE_TRANSACTION',
    metadata: { initial_state: tx }
  })

  revalidatePath('/dashboard')
  return tx
}
