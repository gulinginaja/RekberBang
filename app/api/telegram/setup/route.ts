import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN is not set' }, { status: 500 });
  }

  // Get the base URL from the request or env
  const url = new URL(request.url);
  const host = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;
  const webhookUrl = `${host}/api/telegram/webhook`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${webhookUrl}`);
    const data = await res.json();
    return NextResponse.json({ success: true, webhookUrl, telegramResponse: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to set webhook', details: error }, { status: 500 });
  }
}
