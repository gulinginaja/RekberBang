'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import { User } from '@/server/db/schema'
import { cookies } from 'next/headers'

function generateDeterministicPassword(telegramId: number) {
  const secret = process.env.TELEGRAM_BOT_TOKEN || ''
  return crypto.createHmac('sha256', secret).update(telegramId.toString()).digest('hex')
}

export async function authenticateWithTelegram(initData: string) {
  if (!initData) return { error: 'No initData provided' }

  // 1. Validate the initData hash
  const urlParams = new URLSearchParams(initData)
  const hash = urlParams.get('hash')
  urlParams.delete('hash')

  // Sort keys alphabetically
  const keys = Array.from(urlParams.keys()).sort()
  const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.TELEGRAM_BOT_TOKEN || '').digest()
  const generatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (hash !== generatedHash) {
    return { error: 'Invalid Telegram hash. Authentication failed.' }
  }

  // 2. Extract user data
  const userJson = urlParams.get('user')
  if (!userJson) return { error: 'No user data found in initData.' }
  
  const tgUser = JSON.parse(userJson)
  
  // Deterministic credentials
  const email = `${tgUser.id}@tma.rekberbang.com`
  const password = generateDeterministicPassword(tgUser.id)

  const supabase = await createClient()

  // 3. Attempt Login
  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  // 4. Auto-Register if user doesn't exist
  if (error && error.message.includes('Invalid login credentials')) {
    const adminSupabase = createAdminClient()
    
    // Create user in auth.users
    const { data: newUser, error: signUpError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        telegram_id: tgUser.id,
        first_name: tgUser.first_name,
        username: tgUser.username,
        photo_url: tgUser.photo_url || null
      }
    })

    if (signUpError || !newUser.user) {
      console.error('Auto-registration failed (auth):', signUpError)
      return { error: `Failed to auto-register user: ${signUpError?.message || 'Unknown Auth Error'}` }
    }

    // Upsert into public.users (handles seeded users or partial creations)
    const tgIdStr = tgUser.id.toString()
    const superAdmins = (process.env.SUPER_ADMIN_TELEGRAM_IDS || '').split(',').map(s => s.trim())
    
    // Check if user already exists
    const { data: existingUser } = await adminSupabase.from('users').select('role').eq('telegram_id', tgUser.id).single()

    let userRole = existingUser?.role || 'user'
    
    // Env variable always overrides to super_admin
    if (superAdmins.includes(tgIdStr)) {
      userRole = 'super_admin'
    }

    const { error: insertError } = await adminSupabase.from('users').upsert({
      id: newUser.user.id,
      telegram_id: tgUser.id,
      username: tgUser.username,
      first_name: tgUser.first_name,
      photo_url: tgUser.photo_url || null,
      role: userRole
    }, { onConflict: 'telegram_id' })

    if (insertError) {
      console.error('Auto-registration failed (public):', insertError)
      return { error: `Failed to create user profile: ${insertError.message || insertError.details || 'Unknown DB Error'}` }
    }

    // Try login again after successful registration
    const retryLogin = await supabase.auth.signInWithPassword({ email, password })
    if (retryLogin.error) {
      return { error: 'Login failed after registration' }
    }
  } else if (error) {
    return { error: error.message }
  }

  return { success: true, user: tgUser }
}

export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { user: null }

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  return { user: profile as User }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function acceptTerms() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('users')
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
