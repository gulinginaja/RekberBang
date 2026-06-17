'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function changeUserRole(userId: string, newRole: 'user' | 'admin' | 'super_admin') {
  const supabase = await createClient()
  
  // Verify current user is super_admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (currentUser?.role !== 'super_admin') {
    return { error: 'Unauthorized: Only super admins can change roles' }
  }

  // Update target user
  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) {
    console.error('Failed to change role:', error)
    return { error: 'Database error while updating role' }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function addAdminByTelegramId(telegramId: number) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (currentUser?.role !== 'super_admin') {
    return { error: 'Unauthorized: Only super admins can add admins' }
  }

  // Find user by telegram ID
  const { data: targetUser } = await supabase.from('users').select('id, role').eq('telegram_id', telegramId).single()
  
  if (!targetUser) {
    return { error: 'User not found. The user must log in to the Mini App at least once before they can be made an admin.' }
  }

  if (targetUser.role !== 'user') {
    return { error: `User is already an ${targetUser.role}` }
  }

  const { error } = await supabase.from('users').update({ role: 'admin' }).eq('id', targetUser.id)

  if (error) {
    return { error: 'Failed to update user role' }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function addPaymentMethod(data: { bank_name: string, account_number: string, account_holder: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (currentUser?.role !== 'super_admin') return { error: 'Unauthorized' }

  const { error } = await supabase.from('payment_methods').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function togglePaymentMethodStatus(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (currentUser?.role !== 'super_admin') return { error: 'Unauthorized' }

  const { error } = await supabase.from('payment_methods').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function deletePaymentMethod(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (currentUser?.role !== 'super_admin') return { error: 'Unauthorized' }

  const { error } = await supabase.from('payment_methods').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function addQrisSetting(imageUrl: string, name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (currentUser?.role !== 'super_admin') return { error: 'Unauthorized' }

  const { error } = await supabase.from('qris_settings').insert({ image_url: imageUrl, name })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function toggleQrisStatus(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (currentUser?.role !== 'super_admin') return { error: 'Unauthorized' }

  const { error } = await supabase.from('qris_settings').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteQrisSetting(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (currentUser?.role !== 'super_admin') return { error: 'Unauthorized' }

  const { error } = await supabase.from('qris_settings').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}
