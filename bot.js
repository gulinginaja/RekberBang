/*
   ==========================================================================
   REKBER BANG - TELEGRAM BOT SERVER (HIGHLY INTERACTIVE INLINE KEYBOARD MENU)
   Implements direct inline buttons under messages to guarantee 100% visibility.
   ==========================================================================
*/

const https = require('https');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Load Credentials
const token = process.env.TELEGRAM_BOT_TOKEN || "8869729548:AAEvIxXpazDPTtSKTEke5eL8KdY1lbznpWg";
const chat_id = process.env.TELEGRAM_CHAT_ID || "1638657267";
const supabaseUrl = process.env.SUPABASE_URL || 'https://jnnisjenjogcgzponmjl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_8oqpmh57DL6l_9KL8RVOgQ_oAcN1S2Q';

const API_URL = `https://api.telegram.org/bot${token}`;
let lastUpdateId = 0;

// Initialize Supabase Client
const supabase = createClient(supabaseUrl, supabaseKey);

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  red: "\x1b[31m"
};

function log(type, msg) {
  const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
  let prefix = '';
  switch(type) {
    case 'info': prefix = `${colors.bright}${colors.cyan}[BOT INFO]${colors.reset}`; break;
    case 'recv': prefix = `${colors.bright}${colors.magenta}[MESSAGE RECV]${colors.reset}`; break;
    case 'sent': prefix = `${colors.bright}${colors.green}[REPLY SENT]${colors.reset}`; break;
    case 'cloud': prefix = `${colors.bright}${colors.green}[DATABASE REALTIME]${colors.reset}`; break;
    case 'err': prefix = `${colors.bright}${colors.red}[ERROR]${colors.reset}`; break;
  }
  console.log(`${colors.bright}${colors.yellow}[${timestamp}]${colors.reset} ${prefix} ${msg}`);
}

// Send Message helper
function sendMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const data = JSON.stringify(payload);
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      const resp = JSON.parse(body);
      if (!resp.ok) {
        log('err', `Gagal mengirim pesan: ${resp.description}`);
      }
    });
  });

  req.on('error', (e) => {
    log('err', `Request error: ${e.message}`);
  });

  req.write(data);
  req.end();
}

// Answer Callback Query to stop the loading spinner on Telegram buttons
function answerCallbackQuery(callbackQueryId) {
  const payload = { callback_query_id: callbackQueryId };
  const data = JSON.stringify(payload);
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/answerCallbackQuery`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };
  const req = https.request(options);
  req.write(data);
  req.end();
}

// --- Menu Command Handlers ---

// Reusable custom inline keyboard menu
const inlineMenuMarkup = {
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

async function handleStatsCommand(chatId) {
  log('info', `Mengambil statistik live dari Supabase...`);
  try {
    const { data: dbStats, error } = await supabase.from('rekber_stats').select('*').single();
    if (!error && dbStats) {
      const statsMsg = `<b>📊 STATISTIK LIVE REKBER BANG</b>\n\n` +
        `• 💸 <b>Total Volume Escrow:</b>\n` +
        `  👉 <code>Rp ${Number(dbStats.total_volume).toLocaleString('id-ID')}</code>\n\n` +
        `• 🤝 <b>Total Transaksi Sukses:</b>\n` +
        `  👉 <b>${Number(dbStats.total_transactions).toLocaleString('id-ID')} Transaksi</b>\n\n` +
        `🛡️ <i>Transaksi Anda dijamin aman 100% menggunakan perlindungan rekening penampungan Admin!</i>`;
      sendMessage(chatId, statsMsg, inlineMenuMarkup);
    } else {
      throw new Error(error ? error.message : "Data kosong");
    }
  } catch (e) {
    log('err', `Gagal mengambil statistik: ${e.message}`);
    sendMessage(chatId, `⚠️ <b>Gagal memuat statistik.</b> Silakan coba beberapa saat lagi.`, inlineMenuMarkup);
  }
}

async function handleRoomsCommand(chatId) {
  log('info', `Mengambil status 5 room dari Supabase...`);
  try {
    const { data: dbRooms, error } = await supabase.from('rekber_rooms').select('*').order('id');
    if (!error && dbRooms && dbRooms.length > 0) {
      let roomsMsg = `<b>🚪 STATUS LIVE ROOM REKBER BANG</b>\n\n` +
        `Berikut adalah status aktif dari kelima kamar transaksi:\n\n`;
      
      dbRooms.forEach(room => {
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
        
        roomsMsg += `${statusEmoji} <b>ROOM ${room.id} : ${statusText}</b>\n` +
          `   ➜ ${details}\n\n`;
      });
      
      roomsMsg += `💡 <i>Ingin bertransaksi? Masuk ke salah satu kamar kosong di WebApp sekarang!</i>`;
      sendMessage(chatId, roomsMsg, inlineMenuMarkup);
    } else {
      throw new Error(error ? error.message : "Data kosong");
    }
  } catch (e) {
    log('err', `Gagal mengambil status room: ${e.message}`);
    sendMessage(chatId, `⚠️ <b>Gagal memuat status room.</b>`, inlineMenuMarkup);
  }
}

function handleGuideCommand(chatId) {
  const guideMsg = `<b>❓ PANDUAN TRANSAKSI REKBER BANG</b>\n\n` +
    `Ikuti alur transaksi amanah berikut untuk membeli/menjual produk digital:\n\n` +
    `1️⃣ <b>Pilih Kamar & Role</b>:\n` +
    `   Masuk ke kamar kosong di WebApp sebagai Pembeli atau Penjual. Kamar akan terkunci otomatis saat kedua pihak sudah masuk (2/2).\n\n` +
    `2️⃣ <b>Panggil Admin</b>:\n` +
    `   Klik tombol PANGGIL ADMIN agar administrator bergabung menjaga room.\n\n` +
    `3️⃣ <b>Top-Up Dana (Pembeli)</b>:\n` +
    `   Pembeli memasukkan harga barang (otomatis ditambah fee 5% untuk kas admin). Transfer manual ke rekening admin dan upload struk bayar.\n\n` +
    `4️⃣ <b>Kirim Produk (Penjual)</b>:\n` +
    `   Dana aman ditahan oleh Admin. Penjual silakan mengirim produk ke pembeli, lalu klik "Barang Sudah Dikirim".\n\n` +
    `5️⃣ <b>Withdraw Bersih (Penjual)</b>:\n` +
    `   Pembeli memeriksa produk, lalu klik "Barang Diterima". Penjual klik Withdraw (potongan fee WD 2.5%), isi rekening. Admin mentransfer manual dan mengirimkan struk.\n\n` +
    `6️⃣ <b>DONE & Selesai</b>:\n` +
    `   Keduanya mengklik DONE untuk menutup room dan mencatat history.`;
  
  sendMessage(chatId, guideMsg, inlineMenuMarkup);
}

function handleAdminCommand(chatId) {
  const adminMsg = `<b>📞 DIREKTORI HUBUNGI ADMIN</b>\n\n` +
    `Butuh bantuan mediasi manual, bantuan teknis, atau pertanyaan kerja sama? Hubungi kami langsung di:\n\n` +
    `• 👑 <b>Telegram Admin:</b> @swaetczher2\n` +
    `• 🛡️ <b>Username Resmi:</b> @swaetczher2\n` +
    `• 🕒 <b>Jam Operasional:</b> Setiap Hari — Aktif & Amanah\n\n` +
    `<i>⚠️ HATI-HATI PENIPUAN! Admin kami TIDAK PERNAH mengirim pesan pertama kali (DM first) kepada Anda! Pastikan selalu memanggil Admin melalui tombol resmi di dalam Mini App.</i>`;
  
  sendMessage(chatId, adminMsg, inlineMenuMarkup);
}

// Process single update from Long Polling
async function handleUpdate(update) {
  // 1. Handle Inline Callback Queries (Taps on Inline Buttons)
  if (update.callback_query) {
    const callbackQuery = update.callback_query;
    const chatId = callbackQuery.message.chat.id;
    const username = callbackQuery.from.username ? `@${callbackQuery.from.username}` : callbackQuery.from.first_name;
    const data = callbackQuery.data;
    
    log('recv', `Callback Query dari: ${username} (Chat ID: ${chatId}) -> "${data}"`);
    
    // Acknowledge the callback immediately so Telegram stops showing loading spinner
    answerCallbackQuery(callbackQuery.id);
    
    if (data === "menu_stats") {
      await handleStatsCommand(chatId);
    } else if (data === "menu_rooms") {
      await handleRoomsCommand(chatId);
    } else if (data === "menu_guide") {
      handleGuideCommand(chatId);
    } else if (data === "menu_admin") {
      handleAdminCommand(chatId);
    }
    return;
  }

  // 2. Handle Direct Text Messages
  if (!update.message || !update.message.chat) return;

  const chatId = update.message.chat.id;
  const username = update.message.from.username ? `@${update.message.from.username}` : update.message.from.first_name;
  const text = update.message.text ? update.message.text.trim() : '';

  log('recv', `Dari: ${username} (Chat ID: ${chatId}) -> "${text}"`);

  if (text.startsWith('/start') || text.toLowerCase() === 'menu' || text.toLowerCase() === '/menu') {
    const welcomeMsg = `<b>👋 Halo ${username}! Selamat datang di Rekber Bang Bot!</b>\n\n` +
      `Sistem Rekber virtual teraman, tercanggih, dan elegan di Telegram dengan integrasi Cloud Supabase.\n\n` +
      `📌 <b>Detail Koneksi Anda:</b>\n` +
      `• Username: <code>${username}</code>\n` +
      `• Chat ID: <code>${chatId}</code>\n\n` +
      `💡 <i>Gunakan menu tombol di bawah ini untuk membuka aplikasi secara instan, memantau statistik, atau panduan penggunaan!</i>`;

    sendMessage(chatId, welcomeMsg, inlineMenuMarkup);
  } else {
    const echoMsg = `<b>📝 Pesan Diterima:</b>\n` +
      `"<i>${text}</i>"\n\n` +
      `Silakan gunakan menu tombol interaktif di bawah ini untuk memantau status atau ketik <code>/start</code> untuk memunculkan kembali menu utama.`;
    
    sendMessage(chatId, echoMsg, inlineMenuMarkup);
  }
}

// Long Polling Loop
function pollUpdates() {
  const path = `/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
  
  https.get(`https://api.telegram.org` + path, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const resp = JSON.parse(body);
        if (resp.ok && resp.result.length > 0) {
          resp.result.forEach(update => {
            lastUpdateId = update.update_id;
            handleUpdate(update);
          });
        }
      } catch (e) {
        log('err', `Error parsing update: ${e.message}`);
      }
      pollUpdates();
    });
  }).on('error', (e) => {
    log('err', `Polling connection error: ${e.message}`);
    setTimeout(pollUpdates, 5000);
  });
}

// Map of last seen txStates to prevent duplicate notification triggers
const lastRoomStates = {};

// Subscribe to Supabase Database Realtime Changes
function initSupabaseRealtime() {
  log('info', "Menghubungkan ke Supabase Realtime Channel untuk notifikasi...");
  
  supabase
    .channel('public:rekber_rooms')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rekber_rooms' }, (payload) => {
      const room = payload.new;
      const roomId = room.id;
      const previousState = lastRoomStates[roomId];
      
      // If state hasn't changed, ignore
      if (previousState === room.tx_state) return;
      lastRoomStates[roomId] = room.tx_state;
      
      log('cloud', `Pendeteksian Perubahan Status: Room ${roomId} -> "${room.tx_state}"`);
      
      let alertMsg = '';
      let shouldSend = true;
      
      switch (room.tx_state) {
        case 'waiting_admin_panggilan':
          alertMsg = `🚨 <b>PANGGILAN REKBER AKTIF (ROOM ${roomId})</b>\n\n` +
            `• Pembeli: <code>${room.buyer || 'Menunggu...'}</code>\n` +
            `• Penjual: <code>${room.seller || 'Menunggu...'}</code>\n` +
            `• Status: <b>ADMIN DIPANGGIL</b>\n\n` +
            `👑 <i>Silakan masuk ke room WebApp untuk menerima panggilan sebagai penengah!</i>`;
          break;
          
        case 'topup_receipt_pending':
          alertMsg = `💳 <b>NOMINAL DI-INPUT PEMBELI (ROOM ${roomId})</b>\n\n` +
            `• Pembeli: <code>${room.buyer}</code>\n` +
            `• Nominal Harga: <b>Rp ${Number(room.nominal).toLocaleString('id-ID')}</b>\n` +
            `• Total Pembayaran (+5%): <b>Rp ${Number(room.buyer_total).toLocaleString('id-ID')}</b>\n\n` +
            `⏳ <i>Menunggu Pembeli mengunggah bukti transfer manual...</i>`;
          break;
          
        case 'verifying_topup':
          alertMsg = `📸 <b>BUKTI TRANSFER DIUNGGAH (ROOM ${roomId})</b>\n\n` +
            `• Pembeli: <code>${room.buyer}</code>\n` +
            `• Nominal Transfer: <b>Rp ${Number(room.buyer_total).toLocaleString('id-ID')}</b>\n\n` +
            `🔍 <i>Admin harap segera memverifikasi keabsahan transfer di WebApp!</i>`;
          break;
          
        case 'waiting_delivery':
          alertMsg = `🛡️ <b>DANA BERHASIL DIAMANKAN (ROOM ${roomId})</b>\n\n` +
            `• Pembeli: <code>${room.buyer}</code>\n` +
            `• Penjual: <code>${room.seller}</code>\n` +
            `• Dana Terkunci: <b>Rp ${Number(room.nominal).toLocaleString('id-ID')}</b>\n\n` +
            `🚚 <i>Penjual dipersilakan mengirimkan barang dagangannya sekarang dan konfirmasi di WebApp!</i>`;
          break;
          
        case 'waiting_delivery_confirmation':
          alertMsg = `🚚 <b>BARANG DIKIRIM PENJUAL (ROOM ${roomId})</b>\n\n` +
            `• Penjual: <code>${room.seller}</code>\n` +
            `• Barang dikirim untuk: <code>${room.buyer}</code>\n\n` +
            `📌 <i>Pembeli dipersilakan memeriksa barang dan melakukan konfirmasi penerimaan. (Auto-Done Aktif 2 Jam)</i>`;
          break;
          
        case 'disputed':
          alertMsg = `⚠️ <b>DISPUTE RESOLUTION DIAKTIFKAN (ROOM ${roomId})</b>\n\n` +
            `• Pelapor: <code>${room.buyer}</code>\n` +
            `• Terlapor: <code>${room.seller}</code>\n` +
            `• Status: <b>BARANG TIDAK SESUAI (TRANSAKSI DIBEKUKAN)</b>\n\n` +
            `👑 <i>Admin harap segera masuk ke ruang chat room untuk meninjau bukti mediasi!</i>`;
          break;
          
        case 'waiting_withdraw':
          alertMsg = `💰 <b>DANA DILEPAS (ROOM ${roomId})</b>\n\n` +
            `• Pembeli: <code>${room.buyer}</code>\n` +
            `• Nominal Bersih WD (-2.5%): <b>Rp ${Number(room.seller_total).toLocaleString('id-ID')}</b>\n\n` +
            `💸 <i>Dana siap dicairkan. Penjual harap klik tombol WITHDRAW dan memasukkan rekening pencairan!</i>`;
          break;
          
        case 'withdraw_receipt_pending':
          let details = { accountNo: 'Tidak ada', bankName: 'DANA', ownerName: 'User' };
          try {
            details = JSON.parse(room.wd_account);
          } catch(e) {}
          
          alertMsg = `💸 <b>PENGAJUAN WITHDRAW PENJUAL (ROOM ${roomId})</b>\n\n` +
            `• Penjual: <code>${room.seller}</code>\n` +
            `• Nominal Bersih: <b>Rp ${Number(room.seller_total).toLocaleString('id-ID')}</b>\n` +
            `• Bank Tujuan: <b>${details.bankName}</b>\n` +
            `• Nomor Rekening: <code>${details.accountNo}</code>\n` +
            `• Atas Nama: <code>${details.ownerName}</code>\n\n` +
            `👑 <i>Admin harap segera memproses transfer manual dan mengunggah bukti transfer di WebApp!</i>`;
          break;
          
        case 'waiting_done':
          alertMsg = `✅ <b>WITHDRAW PROCESSED BY ADMIN (ROOM ${roomId})</b>\n\n` +
            `• Dana telah dikirimkan secara manual oleh Admin ke Penjual.\n` +
            `• Menunggu Penjual konfirmasi terima uang & klik <b>🟢 DONE</b> untuk penutupan room.`;
          break;
          
        case 'buyer_refund_menu':
          alertMsg = `💸 <b>MEDIASI DISPUTE: REFUND PEMBELI (ROOM ${roomId})</b>\n\n` +
            `• Mediasi selesai. Admin menyetujui Refund penuh ke Pembeli.\n` +
            `• Pembeli dipersilakan mengisi data rekening refund di WebApp.`;
          break;
          
        case 'refund_receipt_pending':
          let refDetails = { accountNo: 'Tidak ada', bankName: 'DANA', ownerName: 'Pembeli' };
          try {
            refDetails = JSON.parse(room.wd_account);
          } catch(e) {}
          
          alertMsg = `💸 <b>PENGAJUAN REFUND PEMBELI (ROOM ${roomId})</b>\n\n` +
            `• Pembeli: <code>${room.buyer}</code>\n` +
            `• Nominal Refund: <b>Rp ${Number(room.buyer_total).toLocaleString('id-ID')}</b>\n` +
            `• Tujuan Refund: <b>${refDetails.bankName} - ${refDetails.accountNo} (A.N ${refDetails.ownerName})</b>\n\n` +
            `👑 <i>Admin harap segera mentransfer balik dana manual dan upload struk refund di WebApp!</i>`;
          break;

        case 'waiting_done_refund':
          alertMsg = `✅ <b>REFUND PROCESSED BY ADMIN (ROOM ${roomId})</b>\n\n` +
            `• Dana refund telah dikirim balik secara manual oleh Admin ke Pembeli.\n` +
            `• Menunggu Pembeli mengklik <b>🟢 DONE</b> untuk menutup sesi room.`;
          break;
          
        case 'select_role':
          alertMsg = `🏁 <b>TRANSAKSI FINISHED & ROOM CLOSED (ROOM ${roomId})</b>\n\n` +
            `• Room ${roomId} telah difinalisasi secara penuh.\n` +
            `• Data telah disimpan permanen ke dalam buku besar riwayat (ledger).\n` +
            `• Status Room: <b>KOSONG (Bersih & Siap Digunakan Kembali)</b> ⚪`;
          break;
          
        default:
          shouldSend = false;
      }
      
      if (shouldSend) {
        sendMessage(chat_id, alertMsg);
      }
    })
    .subscribe((status) => {
      log('info', `Koneksi channel realtime berstatus: ${status.toUpperCase()}`);
    });
}

// Start Server
console.log(`${colors.bright}${colors.green}=======================================================`);
console.log(`  REKBER BANG TELEGRAM POLLING & REALTIME NOTIFIER      `);
console.log(`=======================================================${colors.reset}\n`);
log('info', "Membaca kredensial dari .env...");
log('info', `Target Token: ${token.substring(0, 15)}...[HIDDEN]`);
log('info', `Target Chat ID: ${chat_id}`);
log('info', `Target Supabase URL: ${supabaseUrl}`);

pollUpdates();
initSupabaseRealtime();
