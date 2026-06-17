import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendTelegramMessage, answerTelegramCallbackQuery, defaultInlineMenu } from '@/lib/telegram';

export async function POST(req: Request) {
  try {
    const update = await req.json();

    // 1. Handle Inline Callback Queries
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      // Acknowledge the callback immediately
      await answerTelegramCallbackQuery(callbackQuery.id);

      if (data === "menu_stats") {
        await handleStatsCommand(chatId);
      } else if (data === "menu_rooms") {
        await handleRoomsCommand(chatId);
      } else if (data === "menu_guide") {
        await handleGuideCommand(chatId);
      } else if (data === "menu_admin") {
        await handleAdminCommand(chatId);
      }
      
      return NextResponse.json({ ok: true });
    }

    // 2. Handle Direct Text Messages
    if (update.message && update.message.text) {
      const msg = update.message;
      const text = msg.text.trim();
      const chatId = msg.chat.id;

      if (text === '/start') {
        const welcomeMsg = `<b>👋 SELAMAT DATANG DI REKBER BANG!</b>\n\n` +
          `Sistem Escrow Teraman & Tercepat di Telegram untuk melindungi transaksi jual-beli Anda.\n\n` +
          `🛡️ <i>Fitur Utama:</i>\n` +
          `• <b>Uang 100% Aman</b> ditahan di sistem.\n` +
          `• <b>Dispute Center</b> (Resolusi Sengketa) jika bermasalah.\n` +
          `• <b>Realtime State Machine</b> (Tanpa nunggu chat admin manual!)\n\n` +
          `👇 <b>Klik tombol di bawah untuk Membuka Aplikasi Mini & Memulai Transaksi:</b>`;

        await sendTelegramMessage(chatId, welcomeMsg, defaultInlineMenu);
      } else if (text === '/stats') {
        await handleStatsCommand(chatId);
      } else if (text === '/rooms') {
        await handleRoomsCommand(chatId);
      } else if (text === '/guide') {
        await handleGuideCommand(chatId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function handleStatsCommand(chatId: number) {
  const supabase = createClient();
  const { data: dbStats, error } = await supabase.from('rekber_stats').select('*').single();
  
  if (!error && dbStats) {
    const statsMsg = `<b>📊 STATISTIK LIVE REKBER BANG</b>\n\n` +
      `• 💸 <b>Total Volume Escrow:</b>\n` +
      `  👉 <code>Rp ${Number(dbStats.total_volume || 0).toLocaleString('id-ID')}</code>\n\n` +
      `• 🤝 <b>Total Transaksi Sukses:</b>\n` +
      `  👉 <b>${Number(dbStats.total_transactions || 0).toLocaleString('id-ID')} Transaksi</b>\n\n` +
      `🛡️ <i>Transaksi Anda dijamin aman menggunakan perlindungan rekening penampungan Admin!</i>`;
    await sendTelegramMessage(chatId, statsMsg, defaultInlineMenu);
  } else {
    await sendTelegramMessage(chatId, `⚠️ <b>Gagal memuat statistik.</b> Silakan coba beberapa saat lagi.`, defaultInlineMenu);
  }
}

async function handleRoomsCommand(chatId: number) {
  const supabase = createClient();
  const { data: dbRooms, error } = await supabase.from('rekber_rooms').select('*').order('id');
  
  if (!error && dbRooms && dbRooms.length > 0) {
    let roomsMsg = `<b>🚪 STATUS LIVE ROOM REKBER BANG</b>\n\nBerikut adalah status aktif dari kelima kamar transaksi:\n\n`;
    
    dbRooms.forEach((room: any) => {
      let statusEmoji = '⚪';
      let statusText = 'KOSONG';
      let details = '<i>Siap digunakan</i>';
      
      if (room.status === 'half') {
        statusEmoji = '🟡';
        statusText = 'ONLINE (1/2)';
        const inside = room.buyer ? `Pembeli: ${room.buyer}` : `Penjual: ${room.seller}`;
        details = `⏳ Menunggu lawan main | ${inside}`;
      } else if (room.status === 'locked') {
        statusEmoji = '🔴';
        statusText = 'LOCKED (2/2)';
        details = `👥 <code>${room.buyer}</code> ⇄ <code>${room.seller}</code>\n` +
          `   💰 Nominal: <b>Rp ${Number(room.nominal).toLocaleString('id-ID')}</b>\n` +
          `   🚀 Status: <i>${room.tx_state.toUpperCase()}</i>`;
      }
      
      roomsMsg += `${statusEmoji} <b>ROOM ${room.id} : ${statusText}</b>\n   ➜ ${details}\n\n`;
    });
    
    roomsMsg += `💡 <i>Ingin bertransaksi? Masuk ke salah satu kamar kosong di WebApp sekarang!</i>`;
    await sendTelegramMessage(chatId, roomsMsg, defaultInlineMenu);
  } else {
    await sendTelegramMessage(chatId, `⚠️ <b>Gagal memuat status room.</b>`, defaultInlineMenu);
  }
}

async function handleGuideCommand(chatId: number) {
  const guideMsg = `<b>❓ PANDUAN TRANSAKSI REKBER BANG</b>\n\n` +
    `Ikuti alur transaksi amanah berikut untuk membeli/menjual produk digital:\n\n` +
    `1️⃣ <b>Pilih Kamar & Role</b>:\n   Masuk ke kamar kosong di WebApp sebagai Pembeli atau Penjual. Kamar akan terkunci otomatis saat kedua pihak sudah masuk (2/2).\n\n` +
    `2️⃣ <b>Panggil Admin</b>:\n   Klik tombol PANGGIL ADMIN agar administrator bergabung menjaga room.\n\n` +
    `3️⃣ <b>Top-Up Dana (Pembeli)</b>:\n   Pembeli memasukkan harga barang (otomatis ditambah fee 5% untuk kas admin). Transfer manual ke rekening admin dan upload struk bayar.\n\n` +
    `4️⃣ <b>Kirim Produk (Penjual)</b>:\n   Dana aman ditahan oleh Admin. Penjual silakan mengirim produk ke pembeli, lalu klik "Barang Sudah Dikirim".\n\n` +
    `5️⃣ <b>Withdraw Bersih (Penjual)</b>:\n   Pembeli memeriksa produk, lalu klik "Barang Diterima". Penjual klik Withdraw (potongan fee WD 2.5%), isi rekening. Admin mentransfer manual dan mengirimkan struk.\n\n` +
    `6️⃣ <b>DONE & Selesai</b>:\n   Keduanya mengklik DONE untuk menutup room dan mencatat history.`;
  await sendTelegramMessage(chatId, guideMsg, defaultInlineMenu);
}

async function handleAdminCommand(chatId: number) {
  const adminMsg = `<b>📞 DIREKTORI HUBUNGI ADMIN</b>\n\n` +
    `Butuh bantuan mediasi manual, bantuan teknis, atau pertanyaan kerja sama? Hubungi kami langsung di:\n\n` +
    `• 👑 <b>Telegram Admin:</b> @swaetczher2\n` +
    `• 🕒 <b>Jam Operasional:</b> Setiap Hari — Aktif & Amanah\n\n` +
    `<i>⚠️ HATI-HATI PENIPUAN! Admin kami TIDAK PERNAH mengirim pesan pertama kali (DM first) kepada Anda! Pastikan selalu memanggil Admin melalui tombol resmi di dalam Mini App.</i>`;
  await sendTelegramMessage(chatId, adminMsg, defaultInlineMenu);
}
