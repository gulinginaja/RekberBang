export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
}

export interface WebAppInitData {
  query_id?: string
  user?: TelegramUser
  receiver?: TelegramUser
  chat_type?: string
  chat_instance?: string
  start_param?: string
  can_send_after?: number
  auth_date: number
  hash: string
}

export function parseInitData(initData: string): WebAppInitData | null {
  try {
    const searchParams = new URLSearchParams(initData)
    const result: any = {}
    
    for (const [key, value] of searchParams.entries()) {
      if (key === 'user' || key === 'receiver') {
        result[key] = JSON.parse(value)
      } else if (key === 'auth_date' || key === 'can_send_after') {
        result[key] = parseInt(value, 10)
      } else {
        result[key] = value
      }
    }
    
    return result as WebAppInitData
  } catch (error) {
    console.error('Failed to parse initData', error)
    return null
  }
}
