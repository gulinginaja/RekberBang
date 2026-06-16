import { createClient } from '@supabase/supabase-js'

// Use this ONLY in server-side contexts where you need to bypass RLS,
// such as creating users during initial Telegram login validation.
export const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)
