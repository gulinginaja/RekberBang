/*
   ==========================================================================
   REKBER BANG - TELEGRAM BOT SERVER (LONG-POLLING & REAL-TIME CLOUD NOTIFIER)
   Runs polling chat interface and subscribes to Supabase Realtime alerts.
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
      if (resp.ok) {
        log('sent', `Berhasil mengirim pesan ke Chat ID ${chatId}`);
      } else {
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

// Process single update from Long Polling
function handleUpdate(update) {
  if (!update.message || !update.message.chat) return;

  const chatId = update.message.chat.id;
  const username = update.message.from.username ? `@${update.message.from.username}` : update.message.from.first_name;
  const text = update.message.text ? update.message.text.trim() : '';

  log('recv', `Dari: ${username} (Chat ID: ${chatId}) -> "${text}"`);

  if (text.startsWith('/start')) {
    const welcomeMsg = `<b>👋 Halo ${username}! Selamat datang di Rekber Bang Bot!</b>\n\n` +
      `Sistem Rekber digital tercanggih, aman, dan elegan dengan UI Telegram Premium.\n\n` +
      `📌 <b>Detail Koneksi Anda:</b>\n` +
      `• Username: <code>${username}</code>\n` +
      `• Chat ID: <code>${chatId}</code>\n\n` +
      `💡 <i>Gunakan tombol di bawah ini untuk membuka aplikasi simulasi digital atau melihat statistik secara langsung!</i>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "🚀 Buka WebApp Rekber", web_app: { url: "https://gulinginaja.github.io/RekberBang/" } }
        ],
        [
          { text: "📊 Cek Statistik Publik", callback_data: "stat_check" }
        ]
      ]
    };

    sendMessage(chatId, welcomeMsg, inlineKeyboard);
  } else {
    const echoMsg = `<b>📝 Pesan Anda Diterima:</b>\n` +
      `"<i>${text}</i>"\n\n` +
      `Koneksi Chat ID Anda aktif (<code>${chatId}</code>).\n` +
      `Ketik <code>/start</code> untuk memunculkan menu utama.`;
    
    sendMessage(chatId, echoMsg);
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
          // Room got reset/wiped clean after transaction finalized
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
