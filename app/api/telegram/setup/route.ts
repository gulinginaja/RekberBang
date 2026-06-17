import { NextResponse } from 'next/server';
import { setTelegramWebhook } from '@/lib/telegram';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const host = url.host;
    const protocol = url.protocol; // http: or https:
    
    // Construct the webhook URL dynamically based on the current deployment host
    const webhookUrl = `${protocol}//${host}/api/telegram/webhook`;

    // Alternatively, you can force a specific domain if defined in .env
    const finalUrl = process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/telegram/webhook`
      : webhookUrl;

    const result = await setTelegramWebhook(finalUrl);

    if (result && result.ok) {
      return NextResponse.json({ 
        success: true, 
        message: "Webhook successfully registered!", 
        url: finalUrl 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: "Failed to register webhook", 
        error: result 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Setup Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
