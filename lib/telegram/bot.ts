import { createAdminClient } from '@/lib/supabase/admin'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8869729548:AAEvIxXpazDPTtSKTEke5eL8KdY1lbznpWg"

export async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  if (!chatId) return;
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup || {
        inline_keyboard: [[{ text: "🚀 Buka Mini App", web_app: { url: process.env.NEXT_PUBLIC_APP_URL || "https://rekber-bang.vercel.app/" } }]]
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

// For legacy code compatibility
export async function sendTelegramNotification(userId: string, message: string) {
  return sendTelegramMessage(userId, message);
}

// Escrow Admin Notifications
export async function notifyAdminNewTransaction(adminChatIds: number[], tx: any, seller: any) {
  const text = `🚨 <b>New Transaction Request</b>
  
ID: <code>${tx.id}</code>
Title: ${tx.title}
Amount: Rp ${tx.amount.toLocaleString('id-ID')}
Seller: @${seller?.username || 'Unknown'}

<i>Admin approval required.</i>`;

  const markup = {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `approve_tx_${tx.id}` },
        { text: "❌ Reject", callback_data: `reject_tx_${tx.id}` }
      ]
    ]
  };

  for (const chatId of adminChatIds) {
    await sendTelegramMessage(chatId, text, markup);
  }
}

export async function notifyAdminPaymentUploaded(adminChatIds: number[], tx: any) {
  const text = `💰 <b>Payment Proof Uploaded</b>
  
ID: <code>${tx.id}</code>
Amount: Rp ${tx.amount.toLocaleString('id-ID')}

<i>Please verify the payment in the bank/mutation.</i>`;

  const markup = {
    inline_keyboard: [
      [
        { text: "✅ Verify Payment", callback_data: `verify_payment_${tx.id}` },
        { text: "❌ Reject Payment", callback_data: `reject_payment_${tx.id}` }
      ],
      [{ text: "🔍 Review Proof", web_app: { url: `${process.env.NEXT_PUBLIC_APP_URL}/transactions/${tx.id}` } }]
    ]
  };

  for (const chatId of adminChatIds) {
    await sendTelegramMessage(chatId, text, markup);
  }
}

export async function notifyAdminDispute(adminChatIds: number[], tx: any, reason: string) {
  const text = `⚠️ <b>Dispute Created!</b>
  
ID: <code>${tx.id}</code>
Reason: ${reason}

<i>Immediate review required.</i>`;

  const markup = {
    inline_keyboard: [
      [
        { text: "🛡 Open Dispute Center", web_app: { url: `${process.env.NEXT_PUBLIC_APP_URL}/transactions/${tx.id}` } }
      ]
    ]
  };

  for (const chatId of adminChatIds) {
    await sendTelegramMessage(chatId, text, markup);
  }
}

export async function notifyAdminDeliveryUploaded(adminChatIds: number[], tx: any) {
  const text = `📦 <b>Delivery Proof Uploaded</b>
  
ID: <code>${tx.id}</code>

Waiting for buyer to confirm receipt.`;

  for (const chatId of adminChatIds) {
    await sendTelegramMessage(chatId, text); // standard app button
  }
}

export async function notifyAdminReadyForRelease(adminChatIds: number[], tx: any) {
  const text = `🎉 <b>Transaction Ready For Release</b>
  
ID: <code>${tx.id}</code>
Buyer has confirmed receipt. Funds can be released to the seller.`;

  const markup = {
    inline_keyboard: [
      [
        { text: "💸 Release Funds", callback_data: `release_funds_${tx.id}` }
      ]
    ]
  };

  for (const chatId of adminChatIds) {
    await sendTelegramMessage(chatId, text, markup);
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text: string, showAlert: boolean = false) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: showAlert
      })
    });
  } catch (err) {
    console.error("answerCallbackQuery failed", err);
  }
}

export async function editMessageText(chatId: string | number, messageId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: 'HTML'
      })
    });
  } catch (err) {
    console.error("editMessageText failed", err);
  }
}
