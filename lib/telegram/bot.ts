import { createAdminClient } from '@/lib/supabase/admin'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8869729548:AAEvIxXpazDPTtSKTEke5eL8KdY1lbznpWg"

export async function sendTelegramNotification(userId: string, message: string) {
  if (!userId) return;
  try {
    // The user's ID in our database is typically their Telegram ID from the auth flow.
    // Or we can fetch it if needed. For now, assuming userId is the Telegram chat ID.
    const chatId = userId; 

    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: "🚀 Buka Mini App", web_app: { url: "https://rekber-bang.vercel.app/" } }]]
      }
    };

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      console.error("Telegram API error:", await res.text());
    }
  } catch (error) {
    console.error("Failed to send telegram notification", error);
  }
}
