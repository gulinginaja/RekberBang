/*
   ==========================================================================
   REKBER BANG - TELEGRAM BOT SERVER (STANDALONE LONG-POLLING)
   Runs a real-time polling server to listen and reply to Telegram users.
   ==========================================================================
*/

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env if exists
let token = "8869729548:AAEvIxXpazDPTtSKTEke5eL8KdY1lbznpWg";
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/TELEGRAM_BOT_TOKEN=(.*)/);
  if (match && match[1]) {
    token = match[1].trim();
  }
}

const API_URL = `https://api.telegram.org/bot${token}`;
let lastUpdateId = 0;

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
        log('sent', `Berhasil mengirim balasan ke Chat ID ${chatId}`);
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

// Process single update
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
          { text: "📊 Cek Statistik Publik", callback_data: "stat_check" },
          { text: "📞 Panggil Admin", callback_data: "call_admin" }
        ]
      ]
    };

    sendMessage(chatId, welcomeMsg, inlineKeyboard);
  } else {
    // Standard response echo
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
      // Instantly start next poll
      pollUpdates();
    });
  }).on('error', (e) => {
    log('err', `Polling connection error: ${e.message}`);
    // Retry after 5 seconds if connection fails
    setTimeout(pollUpdates, 5000);
  });
}

// Start Server
console.log(`${colors.bright}${colors.green}=======================================================`);
console.log(`  REKBER BANG TELEGRAM POLLING SERVER SEDANG BERJALAN  `);
console.log(`=======================================================${colors.reset}\n`);
log('info', "Membaca token dari .env...");
log('info', `Target Token: ${token.substring(0, 15)}...[HIDDEN]`);
log('info', `Mulai mendengarkan pesan dari Telegram... Silakan ketik /start di bot Anda.`);

pollUpdates();
