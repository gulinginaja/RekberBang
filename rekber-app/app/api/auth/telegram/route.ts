import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { initData } = await req.json()
    if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 })

    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    urlParams.delete('hash')
    
    // Validate TMA Signature
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) throw new Error("Missing TELEGRAM_BOT_TOKEN")

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
    const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

    // Optional: in dev environment allow bypass if bot token is placeholder
    if (calculatedHash !== hash && process.env.NODE_ENV === 'production') {
       return NextResponse.json({ error: 'Invalid hash signature' }, { status: 403 })
    }

    const userStr = urlParams.get('user')
    if (!userStr) return NextResponse.json({ error: 'No user data' }, { status: 400 })
    
    const user = JSON.parse(userStr)
    const supabaseAdmin = getSupabaseAdmin()
    
    // Upsert user in database
    const { data: dbUser, error } = await supabaseAdmin.from('users').upsert({
      telegram_id: user.id,
      username: user.username || null,
      first_name: user.first_name || null,
      photo_url: user.photo_url || null,
    }, { onConflict: 'telegram_id' }).select().single()

    if (error) {
      console.error("DB Upsert error:", error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Mint Supabase JWT
    const jwtSecret = process.env.SUPABASE_JWT_SECRET
    if (!jwtSecret) throw new Error("Missing SUPABASE_JWT_SECRET")

    const token = jwt.sign(
      { 
        sub: dbUser.id, 
        role: 'authenticated',
        telegram_id: dbUser.telegram_id
      },
      jwtSecret,
      { expiresIn: '7d' }
    )

    // Set HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set('sb-access-token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 604800, // 7 days
      path: '/'
    })

    return NextResponse.json({ success: true, user: dbUser })
  } catch (error: any) {
    console.error("Auth error:", error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
