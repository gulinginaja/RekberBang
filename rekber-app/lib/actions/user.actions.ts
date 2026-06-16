'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function acceptTerms() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('users')
    .update({ 
      terms_accepted_at: new Date().toISOString(),
      terms_version: 1 
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  return { success: true }
}
