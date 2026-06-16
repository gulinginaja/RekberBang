'use server'

import { createClient } from '@/lib/supabase/server'

export async function resolveUserByUsername(username: string) {
  const supabase = await createClient()
  
  const cleanUsername = username.replace('@', '')

  const { data, error } = await supabase
    .from('users')
    .select('id, username, first_name')
    .ilike('username', cleanUsername)
    .limit(1)
    .single()

  if (error || !data) {
    return { error: 'User not found. Ensure they have opened the Rekber Bang bot at least once.' }
  }

  return { user: data }
}

export async function acceptTerms() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('users')
    .update({ 
      terms_version: 'v1.0', 
      terms_accepted_at: new Date().toISOString() 
    })
    .eq('id', user.id)

  if (error) throw error

  // Log it
  await supabase.from('audit_logs').insert({
    transaction_id: null,
    actor_id: user.id,
    action: 'TERMS_ACCEPTED',
    metadata: { version: 'v1.0' }
  })

  return { success: true }
}
