
const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Standard Inline Menu for the Bot
 */
export const defaultInlineMenu = {
  inline_keyboard: [
    [
      { text: "🚀 Buka Mini App Rekber", web_app: { url: "https://gulinginaja.github.io/RekberBang/" } }
    ],
    [
      { text: "📊 Statistik Rekber", callback_data: "menu_stats" },
      { text: "🚪 Cek Status Room", callback_data: "menu_rooms" }
    ],
    [
      { text: "❓ Panduan Penggunaan", callback_data: "menu_guide" },
      { text: "📞 Hubungi Admin", callback_data: "menu_admin" }
    ]
  ]
};

/**
 * Send a message to a Telegram Chat
 */
export async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup: any = null) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN is not set.");
    return null;
  }

  const payload: any = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error("Telegram API Error:", data.description);
    }
    return data;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return null;
  }
}

/**
 * Answer a callback query (removes loading state on inline buttons)
 */
export async function answerTelegramCallbackQuery(callbackQueryId: string, text?: string, showAlert?: boolean) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;

  const payload: any = {
    callback_query_id: callbackQueryId,
  };

  if (text) payload.text = text;
  if (showAlert) payload.show_alert = showAlert;

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to answer callback query:", error);
    return null;
  }
}

/**
 * Register Webhook URL with Telegram
 */
export async function setTelegramWebhook(url: string) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to set webhook:", error);
    return null;
  }
}
