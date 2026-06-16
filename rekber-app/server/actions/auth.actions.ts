'use server'

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function authenticateWithTelegram(initData: string) {
  if (!initData) {
    return { error: 'No initData provided' }
  }

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
    return { error: 'Invalid Telegram hash' }
  }

  // 2. Extract user data
  const userJson = urlParams.get('user')
  if (!userJson) return { error: 'No user data' }
  
  const tgUser = JSON.parse(userJson)

  const supabase = await createClient()

  // 3. Upsert user in Supabase (Using service role ideally if modifying restricted fields, 
  // but for now relying on a custom RPC or secure endpoint if possible).
  // Note: For MVP, we'll assume we have an RPC function `handle_tg_login` 
  // that takes the telegram data and returns a custom JWT, OR we use Supabase Auth admin API.
  
  // As this is a foundation plan, we'll place a placeholder for the actual Supabase Auth logic here.
  // Implementation will depend on whether using Custom Auth Provider or Custom JWTs.
  
  return { success: true, user: tgUser }
}
