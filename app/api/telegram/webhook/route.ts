import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { answerCallbackQuery, editMessageText } from '@/lib/telegram/bot';

export async function POST(request: Request) {
  try {
    const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const update = await request.json();

    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data; // e.g., "approve_tx_uuid"
      const telegramId = callbackQuery.from.id;
      const chatId = callbackQuery.message?.chat?.id;
      const messageId = callbackQuery.message?.message_id;

      // 1. Verify user is admin
      const supabase = createAdminClient();
      const { data: adminUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('telegram_id', telegramId)
        .single();

      if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
        await answerCallbackQuery(callbackQuery.id, "Unauthorized: You are not an admin.", true);
        return NextResponse.json({ ok: true });
      }

      // 2. Handle specific actions
      if (data.startsWith('approve_tx_')) {
        const txId = data.replace('approve_tx_', '');
        // Validate state
        const { data: tx } = await supabase.from('transactions').select('status, seller_id, title').eq('id', txId).single();
        if (tx?.status !== 'PENDING_ADMIN_APPROVAL') {
          await answerCallbackQuery(callbackQuery.id, "Transaction is not pending approval.");
          return NextResponse.json({ ok: true });
        }
        
        // Update
        await supabase.from('transactions').update({ status: 'CREATED' }).eq('id', txId);
        await supabase.from('audit_logs').insert({ transaction_id: txId, actor_id: adminUser.id, action: 'TRANSACTION_APPROVED_VIA_TG' });
        
        await answerCallbackQuery(callbackQuery.id, "Transaction Approved!");
        if (chatId && messageId) await editMessageText(chatId, messageId, `✅ <b>Transaction Approved</b>\nID: <code>${txId}</code>\nApproved by admin.`);
        
        // Notify seller (requires calling normal bot function)
        // Note: we'd need another call or just rely on the UI.
        
      } else if (data.startsWith('reject_tx_')) {
        const txId = data.replace('reject_tx_', '');
        await supabase.from('transactions').update({ status: 'CANCELLED' }).eq('id', txId);
        await supabase.from('audit_logs').insert({ transaction_id: txId, actor_id: adminUser.id, action: 'TRANSACTION_REJECTED_VIA_TG' });
        await answerCallbackQuery(callbackQuery.id, "Transaction Rejected!");
        if (chatId && messageId) await editMessageText(chatId, messageId, `❌ <b>Transaction Rejected</b>\nID: <code>${txId}</code>\nRejected by admin.`);
      }

      // 3. We can add more handlers here for verify_payment, release_funds, etc.
      // But keeping it minimal for PENDING_ADMIN_APPROVAL first to prove the flow.
      
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ ok: true }); // Telegram will retry if not 200, but we usually want to swallow errors
  }
}
