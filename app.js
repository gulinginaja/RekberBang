/* 
   ==========================================================================
   REKBER BANG - CENTRAL STATE MACHINE & REALTIME SIMULATOR LOGIC
   Manages state for 5 Rooms, Buyer/Seller/Admin syncing, logs, and stats.
   ==========================================================================
*/

// --- 1. Global Application State ---
const STATE = {
  // Volume and counts
  totalVolume: 34500000,
  totalTransactions: 1420,
  
  // Active Room state (Room 1 to 5)
  rooms: Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    buyer: null,        // username string
    seller: null,       // username string
    adminJoined: false,
    status: 'empty',    // 'empty', 'half', 'locked'
    
    // Transaction phase state machine:
    // 'select_role', 'waiting_member', 'waiting_admin_panggilan', 'topup_menu', 'topup_receipt_pending', 'verifying_topup',
    // 'waiting_delivery', 'disputed', 'waiting_withdraw', 'withdraw_submitted', 'withdraw_receipt_pending', 'waiting_done', 'completed'
    txState: 'select_role', 
    
    nominal: 0,
    buyerTotal: 0,
    sellerTotal: 0,
    
    buyerUploadedReceipt: null, // base64 or placeholder url
    adminUploadedReceipt: null,
    
    wdDetails: {
      accountNo: '',
      bankName: '',
      ownerName: ''
    },
    
    buyerDone: false,
    sellerDone: false,
    
    chatLogs: {
      buyer: [],
      seller: [],
      admin: []
    }
  })),
  
  // Public History log database
  history: [
    {
      txId: 'TX-98231',
      room: 'ROOM 1',
      date: '25 Mei 2026 | 19:45 WIB',
      buyer: '@pem*******ok',
      seller: '@ald***********an',
      nominal: 100000,
      status: '🟢 SUCCESS DONE'
    },
    {
      txId: 'TX-98229',
      room: 'ROOM 3',
      date: '25 Mei 2026 | 14:20 WIB',
      buyer: '@da*******12',
      seller: '@ru*******an',
      nominal: 45000,
      status: '🟢 SUCCESS DONE'
    },
    {
      txId: 'TX-98215',
      room: 'ROOM 5',
      date: '24 Mei 2026 | 21:10 WIB',
      buyer: '@by*******_q',
      seller: '@se*******_x',
      nominal: 250000,
      status: '🟢 SUCCESS DONE'
    }
  ],
  
  // Current Simulator focus (which room is active in the simulator mockup view)
  activeRoomIndex: 0, // Room 1 (0-indexed)
  
  // User profiles
  users: {
    buyer: { username: '@pembeli_grok', id: '123456' },
    seller: { username: '@aldi_kurniawan', id: '789101' },
    admin: { username: '@Admin_RekberBang', id: 'ADMIN' }
  }
};

// --- 2. Initializer & Clock ---
document.addEventListener('DOMContentLoaded', () => {
  // Start clock
  setInterval(updateClock, 1000);
  updateClock();
  
  // Bind UI inputs and buttons
  setupEventListeners();
  
  // Generate default logs and stats
  logEvent('info', 'System initialized. Multi-Device Escrow Simulator stands ready.');
  
  // Initialize Telegram WebApp SDK
  if (window.Telegram && window.Telegram.WebApp) {
    try {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand(); // Full screen inside Telegram
      
      logEvent('success', 'Telegram WebApp SDK connected successfully!');
      
      // Auto-theme adjustments
      if (tg.colorScheme === 'light') {
        logEvent('info', 'Telegram Light Theme detected.');
      } else {
        logEvent('info', 'Telegram Dark Theme detected.');
      }
      
      // Attempt to load real Telegram User Data
      const user = tg.initDataUnsafe?.user;
      if (user) {
        const username = user.username ? `@${user.username}` : `@${user.first_name}`;
        const userId = user.id.toString();
        
        // Dynamically assign real Telegram User details to Buyer profile!
        STATE.users.buyer.username = username;
        STATE.users.buyer.id = userId;
        
        document.getElementById('buyer-username').innerText = username;
        
        const buyerStatusEl = document.querySelector('#frame-buyer .phone-status');
        if (buyerStatusEl) {
          buyerStatusEl.innerText = `online • ID: ${userId}`;
        }
        
        logEvent('success', `Real Telegram User loaded: ${username} (ID: ${userId})`);
      }
    } catch (e) {
      logEvent('warning', `Failed to initialize Telegram WebApp variables: ${e.message}`);
    }
  }
  
  logEvent('info', 'Load statistics: Rp 34,500,000 Volume, 1,420 Completed Tx.');
  
  // Reset/Initialize room 1 default state for quick onboarding
  resetAllRooms();
  
  // Full Render
  renderAll();
});

function updateClock() {
  const clockEl = document.getElementById('local-clock');
  if (clockEl) {
    const now = new Date();
    clockEl.innerText = now.toLocaleTimeString('id-ID', { hour12: false });
  }
}

// --- 3. Telemetry Event Logger ---
function logEvent(type, message) {
  const container = document.getElementById('console-logs');
  if (!container) return;
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
  
  const line = document.createElement('div');
  line.className = 'console-line';
  
  let tagClass = 'info';
  let tagText = 'INFO';
  
  if (type === 'success') { tagClass = 'success'; tagText = 'SUCCESS'; }
  else if (type === 'warning') { tagClass = 'warning'; tagText = 'WARNING'; }
  else if (type === 'error') { tagClass = 'error'; tagText = 'DISPUTE'; }
  else if (type === 'action') { tagClass = 'action'; tagText = 'ACTION'; }
  
  line.innerHTML = `
    <span class="console-timestamp">[${timeStr}]</span>
    <span class="console-tag ${tagClass}">${tagText}</span>
    <span class="console-text">${message}</span>
  `;
  
  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
}

// --- 4. Event Binding ---
function setupEventListeners() {
  // Clear telemetry button
  document.getElementById('console-clear').addEventListener('click', () => {
    document.getElementById('console-logs').innerHTML = '';
    logEvent('info', 'Logs cleared.');
  });
  
  // Reset Simulation Button
  document.getElementById('reset-sim-btn').addEventListener('click', () => {
    resetAllRooms();
    STATE.totalVolume = 34500000;
    STATE.totalTransactions = 1420;
    STATE.history = STATE.history.slice(0, 3); // keep only initial 3
    
    logEvent('warning', 'Simulation environment reset back to defaults.');
    renderAll();
  });
  
  // Search history input
  document.getElementById('history-search').addEventListener('input', (e) => {
    renderHistory(e.target.value.trim());
  });
  
  // Responsive Device Tab Switcher
  const tabs = document.querySelectorAll('.device-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const role = tab.getAttribute('data-tab');
      document.querySelectorAll('.phone-frame').forEach(f => f.classList.remove('tab-active'));
      
      if (role === 'buyer') document.getElementById('frame-buyer').classList.add('tab-active');
      else if (role === 'seller') document.getElementById('frame-seller').classList.add('tab-active');
      else if (role === 'admin') document.getElementById('frame-admin').classList.add('tab-active');
      
      logEvent('info', `Switched responsive viewport tab focus to: ${role.toUpperCase()}`);
    });
  });
}

// --- 5. Logic Operations (State Mutations) ---

function resetAllRooms() {
  STATE.rooms = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    buyer: null,
    seller: null,
    adminJoined: false,
    status: 'empty',
    txState: 'select_role',
    nominal: 0,
    buyerTotal: 0,
    sellerTotal: 0,
    buyerUploadedReceipt: null,
    adminUploadedReceipt: null,
    wdDetails: { accountNo: '', bankName: '', ownerName: '' },
    buyerDone: false,
    sellerDone: false,
    chatLogs: {
      buyer: [
        { sender: 'bot', text: '🛡️ **REKBER BANG DIGITAL** 🛡️\nHalo! Selamat datang di sistem Rekber Otomatis.\n\nSilakan tentukan role transaksi Anda di bawah ini.', time: '02:05' }
      ],
      seller: [
        { sender: 'bot', text: '🛡️ **REKBER BANG DIGITAL** 🛡️\nHalo! Selamat datang di sistem Rekber Otomatis.\n\nSilakan tentukan role transaksi Anda di bawah ini.', time: '02:05' }
      ],
      admin: [
        { sender: 'system', text: 'Menunggu panggilan bantuan aktif dari room transaksi...', time: '02:05' }
      ]
    }
  }));
}

// Helper to push a chat message to a role
function sendChatMessage(roomId, role, sender, text) {
  const room = STATE.rooms[roomId - 1];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  
  const msgObj = { sender, text, time: timeStr };
  
  if (role === 'all') {
    room.chatLogs.buyer.push(msgObj);
    room.chatLogs.seller.push(msgObj);
    if (room.adminJoined) room.chatLogs.admin.push(msgObj);
  } else {
    room.chatLogs[role].push(msgObj);
  }
}

// Join Room handler
function handleJoinRoom(roomId, role) {
  const room = STATE.rooms[roomId - 1];
  
  if (role === 'buyer') {
    if (room.buyer) return;
    room.buyer = STATE.users.buyer.username;
    logEvent('action', `User ${STATE.users.buyer.username} masuk ke ROOM ${roomId} sebagai PEMBELI.`);
    sendChatMessage(roomId, 'buyer', 'user', `Masuk ke Room ${roomId} sebagai Pembeli.`);
  } else if (role === 'seller') {
    if (room.seller) return;
    room.seller = STATE.users.seller.username;
    logEvent('action', `User ${STATE.users.seller.username} masuk ke ROOM ${roomId} sebagai PENJUAL.`);
    sendChatMessage(roomId, 'seller', 'user', `Masuk ke Room ${roomId} sebagai Penjual.`);
  }
  
  // Calculate status
  updateRoomStatus(roomId);
  
  // If both have joined, lock room and trigger live menu
  if (room.buyer && room.seller) {
    room.status = 'locked';
    room.txState = 'waiting_admin_panggilan';
    
    logEvent('success', `ROOM ${roomId} LOCKS! Pembeli & Penjual telah bersiap. Saldo Room: Rp 0`);
    
    sendChatMessage(roomId, 'buyer', 'bot', `🚪 **ROOM ${roomId} - LIVE** 🚪\n\nStatus: Menunggu Panggilan Admin.\n\n👤 PEMBELI: ${room.buyer}\n👤 PENJUAL: ${room.seller}\n👑 ADMIN: ⏳ Menunggu Dipanggil...\n\n💰 STATUS SALDO:\n• Saldo Ditahan: Rp 0\n• Saldo Siap WD: Rp 0\n\nSilakan klik tombol **PANGGIL ADMIN** jika kedua pihak sudah janjian!`);
    sendChatMessage(roomId, 'seller', 'bot', `🚪 **ROOM ${roomId} - LIVE** 🚪\n\nStatus: Menunggu Panggilan Admin.\n\n👤 PEMBELI: ${room.buyer}\n👤 PENJUAL: ${room.seller}\n👑 ADMIN: ⏳ Menunggu Dipanggil...\n\n💰 STATUS SALDO:\n• Saldo Ditahan: Rp 0\n• Saldo Siap WD: Rp 0\n\nSilakan klik tombol **PANGGIL ADMIN** jika kedua pihak sudah janjian!`);
  } else {
    room.txState = 'waiting_member';
    sendChatMessage(roomId, role, 'bot', `Menunggu lawan transaksi Anda bergabung ke Room ${roomId}...`);
  }
  
  renderAll();
}

// Exit Room Handler
function handleExitRoom(roomId, role) {
  const room = STATE.rooms[roomId - 1];
  
  logEvent('warning', `User keluar dari ROOM ${roomId}. Room reset.`);
  
  // Completely reset room variables to default empty state
  room.buyer = null;
  room.seller = null;
  room.adminJoined = false;
  room.status = 'empty';
  room.txState = 'select_role';
  room.nominal = 0;
  room.buyerTotal = 0;
  room.sellerTotal = 0;
  room.buyerUploadedReceipt = null;
  room.adminUploadedReceipt = null;
  room.wdDetails = { accountNo: '', bankName: '', ownerName: '' };
  room.buyerDone = false;
  room.sellerDone = false;
  
  room.chatLogs.buyer = [
    { sender: 'bot', text: '🛡️ **REKBER BANG DIGITAL** 🛡️\nHalo! Selamat datang di sistem Rekber Otomatis.\n\nSilakan tentukan role transaksi Anda di bawah ini.', time: '02:05' }
  ];
  room.chatLogs.seller = [
    { sender: 'bot', text: '🛡️ **REKBER BANG DIGITAL** 🛡️\nHalo! Selamat datang di sistem Rekber Otomatis.\n\nSilakan tentukan role transaksi Anda di bawah ini.', time: '02:05' }
  ];
  room.chatLogs.admin = [
    { sender: 'system', text: 'Menunggu panggilan bantuan aktif dari room transaksi...', time: '02:05' }
  ];
  
  renderAll();
}

function updateRoomStatus(roomId) {
  const room = STATE.rooms[roomId - 1];
  if (room.buyer && room.seller) room.status = 'locked';
  else if (room.buyer || room.seller) room.status = 'half';
  else room.status = 'empty';
}

// Trigger calling administrator
function handleCallAdmin(roomId) {
  const room = STATE.rooms[roomId - 1];
  room.txState = 'waiting_admin_panggilan';
  
  logEvent('action', `Room ${roomId} memicu sinyal: PANGGIL ADMIN. Mengirimkan notifikasi push ke Admin.`);
  
  sendChatMessage(roomId, 'buyer', 'bot', `⏳ Menghubungi Admin... Tunggu konfirmasi persetujuan.`);
  sendChatMessage(roomId, 'seller', 'bot', `⏳ Menghubungi Admin... Tunggu konfirmasi persetujuan.`);
  
  // Admin receives the call log message
  room.chatLogs.admin = [];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  room.chatLogs.admin.push({
    sender: 'system',
    text: `🚨 **NOTIFIKASI: Panggilan Rekber Baru!**\n🚪 Nomor Room: ROOM ${roomId}\n👤 Pembeli: ${room.buyer} (ID: ${STATE.users.buyer.id})\n👤 Penjual: ${room.seller} (ID: ${STATE.users.seller.id})\n\nSilakan terima panggilan untuk masuk ke Room sebagai penengah pihak ketiga.`,
    time: timeStr,
    isPanggilan: true // Special flag to render Accept/Cancel
  });
  
  renderAll();
}

// Admin Accept Room Joining
function handleAdminAccept(roomId, accepted) {
  const room = STATE.rooms[roomId - 1];
  
  if (!accepted) {
    logEvent('warning', `Admin menolak panggilan ROOM ${roomId}.`);
    sendChatMessage(roomId, 'buyer', 'bot', `❌ Admin membatalkan panggilan. Hubungi kembali jika diperlukan.`);
    sendChatMessage(roomId, 'seller', 'bot', `❌ Admin membatalkan panggilan. Hubungi kembali jika diperlukan.`);
    
    room.txState = 'waiting_admin_panggilan';
    room.chatLogs.admin = [{ sender: 'system', text: 'Menunggu panggilan bantuan aktif dari room transaksi...', time: '02:05' }];
    renderAll();
    return;
  }
  
  room.adminJoined = true;
  room.txState = 'topup_menu';
  
  logEvent('success', `Admin @Admin_RekberBang bergabung ke ROOM ${roomId}. Ruang mediasi aktif.`);
  
  // Messages indicating Admin joined
  sendChatMessage(roomId, 'buyer', 'bot', `👑 **Admin bergabung ke Room!**\nSilakan Pembeli mengajukan top-up nominal transaksi.`);
  sendChatMessage(roomId, 'seller', 'bot', `👑 **Admin bergabung ke Room!**\nMenunggu Pembeli menginput harga produk digital.`);
  
  // Set Admin's room view
  room.chatLogs.admin = [
    { sender: 'bot', text: `🛡️ **ROOM ${roomId} - MONITORING PANEL** 🛡️\nStatus: Terhubung.\n\n👤 Pembeli: ${room.buyer}\n👤 Penjual: ${room.seller}\n\nMenunggu Pembeli memasukkan harga barang...`, time: '02:05' }
  ];
  
  renderAll();
}

// Buyer submits price/nominal
function handleBuyerSubmitNominal(roomId, amount) {
  const room = STATE.rooms[roomId - 1];
  
  if (isNaN(amount) || amount <= 0) {
    sendChatMessage(roomId, 'buyer', 'bot', `⚠️ Nominal harus berupa angka positif!`);
    renderAll();
    return;
  }
  
  room.nominal = amount;
  room.buyerTotal = amount + (amount * 0.05); // 5% fee
  room.sellerTotal = amount - (amount * 0.025); // 2.5% fee on final withdrawal
  room.txState = 'topup_receipt_pending';
  
  logEvent('action', `Pembeli mengajukan harga barang Rp ${amount.toLocaleString('id-ID')}. Total Pembayaran (+5% Fee): Rp ${room.buyerTotal.toLocaleString('id-ID')}.`);
  
  sendChatMessage(roomId, 'buyer', 'bot', `💳 **MENU TOP-UP PEMBELI**\n\n💰 **RINGKASAN PEMBAYARAN:**\n• Harga Produk : Rp ${room.nominal.toLocaleString('id-ID')}\n• Fee Rekber (5%) : Rp ${(room.nominal * 0.05).toLocaleString('id-ID')}\n--------------------------------------\n➔ **TOTAL TRANSFER: Rp ${room.buyerTotal.toLocaleString('id-ID')}**\n\n📌 **SILAKAN TRANSFER MANUAL KE:**\n• DANA: 0812-3456-7890 (a.n ALDI)\n• BCA: 123-456-789 (a.n ALDI)\n\n⚠️ Jika sudah transfer, kirim bukti foto/screenshot dengan mengklik tombol upload di bawah!`);
  
  sendChatMessage(roomId, 'seller', 'bot', `⏳ Pembeli sedang menghitung nominal transaksi: Rp ${room.nominal.toLocaleString('id-ID')}.\nMenunggu Pembeli melakukan transfer manual ke Admin.`);
  
  sendChatMessage(roomId, 'admin', 'bot', `ℹ️ Pembeli menginput Nominal: Rp ${room.nominal.toLocaleString('id-ID')}.\nTotal yang wajib ditransfer Buyer (+5% fee): Rp ${room.buyerTotal.toLocaleString('id-ID')}.`);
  
  renderAll();
}

// Buyer uploads Receipt screenshot (Simulator automates the image)
function handleBuyerUploadReceipt(roomId) {
  const room = STATE.rooms[roomId - 1];
  
  // Create a simulated nice green payment receipt
  room.buyerUploadedReceipt = `https://dummyimage.com/600x400/10b981/ffffff.png&text=BUKTI+TF+PEMBELI+Rp+${room.buyerTotal.toLocaleString('id-ID')}`;
  room.txState = 'verifying_topup';
  
  logEvent('action', `Pembeli mengunggah bukti transfer sebesar Rp ${room.buyerTotal.toLocaleString('id-ID')}.`);
  
  // 1. Let the Buyer see their uploaded proof directly inside their chat logs
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  room.chatLogs.buyer.push({
    sender: 'user',
    text: `Struk bukti transfer topup senilai Rp ${room.buyerTotal.toLocaleString('id-ID')}:`,
    time: timeStr,
    attachment: room.buyerUploadedReceipt
  });
  
  // 2. Bot replies to buyer
  sendChatMessage(roomId, 'buyer', 'bot', `📸 Bukti transfer berhasil dikirim!\nStatus: **SEDANG DIVERIFIKASI ADMIN**.`);
  
  // 3. Send notification to Admin phone
  room.chatLogs.admin.push({
    sender: 'system',
    text: `🚨 **PEMBERITAHUAN BUKTI TRANSFER BUYER**\n🚪 Nomor Room: ROOM ${roomId}\n👤 Pembeli: ${room.buyer}\n💰 Nominal Transfer: **Rp ${room.buyerTotal.toLocaleString('id-ID')}**\n\nSistem mendeteksi bukti transfer dilampirkan.`,
    time: timeStr,
    isReceiptApproval: true,
    receiptUrl: room.buyerUploadedReceipt
  });
  
  renderAll();
}

// Admin approves top-up
function handleAdminApproveTopup(roomId, approved) {
  const room = STATE.rooms[roomId - 1];
  
  if (!approved) {
    logEvent('warning', `Admin menolak bukti transfer Buyer di ROOM ${roomId}.`);
    sendChatMessage(roomId, 'buyer', 'bot', `❌ Bukti transfer Anda DITOLAK oleh Admin. Pastikan nominal dan struk valid lalu kirim ulang.`);
    room.txState = 'topup_receipt_pending';
    room.buyerUploadedReceipt = null;
    renderAll();
    return;
  }
  
  room.txState = 'waiting_delivery';
  
  logEvent('success', `Admin menyetujui transfer Buyer. Saldo Pending Penjual diaktifkan: Rp ${room.nominal.toLocaleString('id-ID')}`);
  
  sendChatMessage(roomId, 'buyer', 'bot', `✅ **Dana berhasil diamankan!**\nJumlah: Rp ${room.buyerTotal.toLocaleString('id-ID')}\n\nSilakan menunggu Penjual mengirimkan barang dagangannya.`);
  
  sendChatMessage(roomId, 'seller', 'bot', `📦 **MENU UTAMA PENJUAL**\n\nStatus Dana: 🟡 **PENDING (Dana Aman di Rekber)**\n\n💰 **DETAIL SALDO:**\n• Saldo Ditahan: Rp ${room.nominal.toLocaleString('id-ID')} (Milik Anda jika transaksi sukses)\n• Saldo Siap WD: Rp 0\n\n📢 **INSTRUKSI:**\nDana pembeli sudah masuk ke rekening Admin.\nSilakan kirimkan produk digital (OTP/Akun) Anda sekarang ke pembeli via chat Telegram.\n\nJika produk sudah dikirimkan secara utuh, klik tombol **BARANG SUDAH DIKIRIM** dibawah!`);
  
  sendChatMessage(roomId, 'admin', 'bot', `✅ Bukti topup disetujui. Dana sebesar Rp ${room.buyerTotal.toLocaleString('id-ID')} ditahan di rekening penampungan.`);
  
  renderAll();
}

// Seller delivers product
function handleSellerDeliver(roomId) {
  const room = STATE.rooms[roomId - 1];
  room.txState = 'waiting_delivery_confirmation';
  
  logEvent('action', `Penjual mengonfirmasi bahwa produk digital telah dikirim.`);
  
  sendChatMessage(roomId, 'seller', 'bot', `📤 Status: **Menunggu Konfirmasi Penerimaan Pembeli**.\nTombol Withdraw akan aktif jika Pembeli menyetujui kualitas barang.`);
  
  sendChatMessage(roomId, 'buyer', 'bot', `📦 **Penjual menyatakan produk sudah dikirim!**\n\nSilakan periksa produk digital yang Anda terima. Pastikan semuanya sesuai dan bekerja dengan baik.\n\n⚠️ **WARNING:** Jangan konfirmasi jika barang belum diterima/tidak sesuai!`);
  
  sendChatMessage(roomId, 'admin', 'bot', `🚚 Penjual mengeklik 'Barang Sudah Dikirim'. Menunggu tanggapan Pembeli.`);
  
  renderAll();
}

// Buyer clicks "Barang Tidak Sesuai" (Dispute)
function handleBuyerDispute(roomId) {
  const room = STATE.rooms[roomId - 1];
  room.txState = 'disputed';
  
  logEvent('error', `ROOM ${roomId} MEMASUKI DISPUTE RESOLUTION! Pembeli melaporkan barang tidak sesuai.`);
  
  sendChatMessage(roomId, 'buyer', 'bot', `⚠️ **DISPUTE RESOLUTION DIAKTIFKAN!**\nTransaksi dibekukan. Admin telah menerima sinyal darurat dan akan melakukan peninjauan bukti di chat.`);
  sendChatMessage(roomId, 'seller', 'bot', `⚠️ **TRANSAKSI DIBEKUKAN!**\nPembeli mengajukan komplain 'Barang Tidak Sesuai'. Saldo Anda ditahan sampai mediasi selesai.`);
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  room.chatLogs.admin.push({
    sender: 'system',
    text: `🚨 **DISPUTE ALERT - ROOM ${roomId}**\nPembeli melaporkan ketidaksesuaian barang. Rekber dibekukan sementara.\nSilakan lakukan mediasi manual dan ambil tindakan resolusi:`,
    time: timeStr,
    isDisputeAction: true
  });
  
  renderAll();
}

// Admin resolves dispute
function handleAdminResolveDispute(roomId, resolution) {
  const room = STATE.rooms[roomId - 1];
  
  if (resolution === 'refund') {
    logEvent('success', `Admin menuntaskan dispute ROOM ${roomId}: REFUND PENUH KE PEMBELI.`);
    sendChatMessage(roomId, 'buyer', 'bot', `🛡️ **MEDIASI SELESAI:** Admin menyetujui pembatalan & REFUND dana Anda.\n\nNominal tagihan top-up Anda (+5% fee dikembalikan utuh karena pembatalan bukan kesalahan Anda) sebesar **Rp ${room.buyerTotal.toLocaleString('id-ID')}** akan ditransfer balik manual oleh Admin.\n\nSilakan klik tombol di bawah untuk mengajukan rekening pengembalian!`);
    sendChatMessage(roomId, 'seller', 'bot', `🛡️ **MEDIASI SELESAI:** Admin memutuskan REFUND ke Pembeli akibat transaksi batal/tidak jelas. Transaksi dihentikan.`);
    
    room.txState = 'buyer_refund_menu';
  } else {
    logEvent('success', `Admin menuntaskan dispute ROOM ${roomId}: LANJUTKAN WITHDRAW SELLER.`);
    sendChatMessage(roomId, 'buyer', 'bot', `🛡️ **MEDIASI SELESAI:** Admin memutuskan barang sah sesuai deskripsi. Saldo dialokasikan ke Penjual.`);
    
    room.txState = 'waiting_withdraw';
    
    sendChatMessage(roomId, 'seller', 'bot', `🛡️ **MEDIASI SELESAI:** Admin menyetujui hak Anda. Saldo dipindahkan ke status Siap WD!\n\n💰 **DETAIL SALDO:**\n• Saldo Ditahan: Rp 0\n• Saldo Siap WD: Rp ${room.nominal.toLocaleString('id-ID')}\n\nSilakan klik tombol **WITHDRAW SALDO** di bawah.`);
    sendChatMessage(roomId, 'admin', 'bot', `Dispute diselesaikan secara manual. Saldo disiapkan untuk ditarik Seller.`);
  }
  
  renderAll();
}

// --- 5.5 Buyer Refund Operations ---
function handleBuyerClickRefund(roomId) {
  const room = STATE.rooms[roomId - 1];
  room.txState = 'buyer_refund_form';
  logEvent('action', `Pembeli mengeklik tombol pengajuan rekening Refund.`);
  renderAll();
}

function handleBuyerSubmitRefund(roomId, refundInfo) {
  const room = STATE.rooms[roomId - 1];
  
  if (!refundInfo || refundInfo.trim() === '') {
    sendChatMessage(roomId, 'buyer', 'bot', `⚠️ Mohon isi rekening refund dengan format lengkap!`);
    renderAll();
    return;
  }
  
  room.txState = 'refund_receipt_pending';
  logEvent('action', `Pembeli mengajukan Refund total Rp ${room.buyerTotal.toLocaleString('id-ID')} ke: ${refundInfo}.`);
  
  sendChatMessage(roomId, 'buyer', 'bot', `📤 Permintaan refund dikirim!\nStatus: **SEDANG DIVERIFIKASI ADMIN**.`);
  
  // Notify Admin
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  room.chatLogs.admin.push({
    sender: 'system',
    text: `💸 **PERMINTAAN REFUND DANA BUYER!**\n🚪 Dari Room: ROOM ${roomId}\n👤 Username: ${room.buyer}\n💰 Jumlah Refund: **Rp ${room.buyerTotal.toLocaleString('id-ID')}** (Tagihan + 5% Fee)\n🏦 Tujuan Transfer: ${refundInfo}\n\nSilakan transfer balik manual ke rekening Buyer, lalu tekan tombol Approve & Kirim Struk Bukti Refund.`,
    time: timeStr,
    isRefundApproval: true,
    refundInfo: refundInfo
  });
  
  renderAll();
}

function handleAdminApproveRefund(roomId) {
  const room = STATE.rooms[roomId - 1];
  
  // Create simulated refund receipt
  room.adminUploadedReceipt = `https://dummyimage.com/600x400/ef4444/ffffff.png&text=REFUND+SUKSES+Rp+${room.buyerTotal.toLocaleString('id-ID')}`;
  room.txState = 'waiting_done_refund';
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  
  logEvent('success', `Admin menyetujui Refund. Mentransfer balik Rp ${room.buyerTotal.toLocaleString('id-ID')} ke Pembeli.`);
  
  const broadcastText = `💸 **REFUND DANA DIKIRIM OLEH ADMIN!**\n\nDana transfer Pembeli sebesar Rp ${room.buyerTotal.toLocaleString('id-ID')} telah ditransfer balik secara manual ke Pembeli.\n\n📊 **Rincian:**\n• Jumlah Refund: Rp ${room.buyerTotal.toLocaleString('id-ID')}\n• Jam Pengiriman: ${timeStr} WIB\n\nSilakan Pembeli mengeklik tombol DONE di bawah untuk menyelesaikan sesi.`;
  
  sendChatMessage(roomId, 'buyer', 'bot', broadcastText);
  room.chatLogs.buyer.push({ sender: 'bot', text: `Bukti transfer refund dari Admin:`, time: timeStr, attachment: room.adminUploadedReceipt });
  
  sendChatMessage(roomId, 'seller', 'bot', `💸 **REFUND DANA BUYER DIKIRIM ADMIN!**\nSesi transaksi dibatalkan secara resmi. Sesi Room ditutup.`);
  
  sendChatMessage(roomId, 'admin', 'bot', `✅ Refund disetujui. Bukti transfer balik manual disebarkan.`);
  
  renderAll();
}

// Fast forward simulate the 2-hour Auto-Done timer
function simulateAutoDone(roomId) {
  const room = STATE.rooms[roomId - 1];
  if (room.txState !== 'waiting_delivery_confirmation') {
    logEvent('warning', `Tombol Simulasi Auto-Done tidak bisa digunakan karena status room bukan 'Menunggu Pengiriman'.`);
    return;
  }
  
  logEvent('warning', `Simulasi Auto-Done 2 Jam dipicu! Pembeli tidak merespons, transaksi disetujui otomatis.`);
  
  handleBuyerAccept(roomId);
}

// Buyer clicks "Barang Diterima"
function handleBuyerAccept(roomId) {
  const room = STATE.rooms[roomId - 1];
  room.txState = 'waiting_withdraw';
  
  logEvent('success', `Pembeli mengonfirmasi barang diterima dengan baik. Saldo Penjual berstatus SIAP WITHDRAW.`);
  
  sendChatMessage(roomId, 'buyer', 'bot', `🤝 Terima kasih! Transaksi Anda selesai di sisi Pembeli.\nMenunggu Penjual melakukan pencairan dana.`);
  
  sendChatMessage(roomId, 'seller', 'bot', `🎉 **DANA SUDAH DILEPAS PEMBELI!**\n\n💰 **DETAIL SALDO:**\n• Saldo Ditahan: Rp 0\n• Saldo Siap WD: Rp ${room.nominal.toLocaleString('id-ID')}\n\nSilakan klik tombol **WITHDRAW SALDO** di bawah untuk melakukan penarikan ke rekening Anda!`);
  
  sendChatMessage(roomId, 'admin', 'bot', `📦 Pembeli menyetujui pelepasan dana. Saldo Penjual siap dicairkan.`);
  
  renderAll();
}

// Seller clicks Withdraw Saldo, opens form input
function handleSellerClickWithdraw(roomId) {
  const room = STATE.rooms[roomId - 1];
  room.txState = 'withdraw_submitted';
  
  logEvent('action', `Penjual menekan tombol Withdraw. Menampilkan formulir rekening.`);
  
  sendChatMessage(roomId, 'seller', 'bot', `💸 **PENGAJUAN WITHDRAWAL**\nAnda akan menarik seluruh saldo Anda dari Room ${roomId}.\n\n📊 **SUMMARY WITHDRAW (POTONGAN 2.5%):**\n• Total Saldo Utama : Rp ${room.nominal.toLocaleString('id-ID')}\n• Potongan WD (2.5%) : Rp ${(room.nominal * 0.025).toLocaleString('id-ID')}\n--------------------------------------\n💰 **BERSIH DITERIMA : Rp ${room.sellerTotal.toLocaleString('id-ID')}**\n\nSilakan isi detail rekening Anda pada panel input di bawah!`);
  
  renderAll();
}

// Seller submits withdrawal details
function handleSellerSubmitWd(roomId, bankInfo) {
  const room = STATE.rooms[roomId - 1];
  
  if (!bankInfo || bankInfo.trim() === '') {
    sendChatMessage(roomId, 'seller', 'bot', `⚠️ Mohon isi rekening tujuan dengan format lengkap!`);
    renderAll();
    return;
  }
  
  const parts = bankInfo.split('-').map(p => p.trim());
  room.wdDetails.accountNo = parts[0] || 'Tidak diketahui';
  room.wdDetails.bankName = parts[1] || 'DANA';
  room.wdDetails.ownerName = parts[2] || 'Syahrul Gunawan';
  
  room.txState = 'withdraw_receipt_pending';
  
  logEvent('action', `Penjual mengajukan pencairan bersih Rp ${room.sellerTotal.toLocaleString('id-ID')} ke: ${bankInfo}.`);
  
  sendChatMessage(roomId, 'seller', 'bot', `📤 Permintaan penarikan dikirim!\nStatus: **SEDANG DIVERIFIKASI ADMIN**.\n\nMohon bersabar, Admin sedang mentransfer manual dana ke rekening Anda.`);
  
  // Notify Admin phone
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  room.chatLogs.admin.push({
    sender: 'system',
    text: `💸 **PERMINTAAN TRANSFER DANA SELLER!**\n🚪 Dari Room: ROOM ${roomId}\n👤 Username: ${room.seller}\n💰 Jumlah Bersih: **Rp ${room.sellerTotal.toLocaleString('id-ID')}**\n🏦 Tujuan Transfer: ${room.wdDetails.accountNo} - ${room.wdDetails.bankName} (${room.wdDetails.ownerName})\n\nSilakan transfer secara manual ke rekening Seller, lalu tekan tombol Approve & Kirim Struk Bukti Transfer.`,
    time: timeStr,
    isWdApproval: true
  });
  
  renderAll();
}

// Admin sends reminder to buyer (optional feature)
function handleAdminSendReminder(roomId) {
  const room = STATE.rooms[roomId - 1];
  logEvent('info', `Admin mengirimkan reminder opsional ke Pembeli di ROOM ${roomId}.`);
  
  sendChatMessage(roomId, 'buyer', 'bot', `🔔 **REMINDER ADMIN:** Halo Pembeli, saat ini kami sedang memproses pencairan dana transaksi ke rekening Penjual. Terima kasih telah tertib bertransaksi!`);
  
  sendChatMessage(roomId, 'admin', 'bot', `🔔 Reminder dikirim ke Pembeli.`);
  renderAll();
}

// Admin approves WD & uploads proof receipt
function handleAdminApproveWd(roomId) {
  const room = STATE.rooms[roomId - 1];
  
  // Simulator automatically builds an admin receipt image
  room.adminUploadedReceipt = `https://dummyimage.com/600x400/06b6d4/ffffff.png&text=TRANSFER+SUKSES+Rp+${room.sellerTotal.toLocaleString('id-ID')}`;
  room.txState = 'waiting_done';
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  
  logEvent('success', `Admin memproses transfer WD manual senilai Rp ${room.sellerTotal.toLocaleString('id-ID')} ke Seller.`);
  
  // broadcast notice to buyer & seller
  const broadcastText = `💸 **DANA DIKIRIM OLEH ADMIN!**\n\nDana bersih transaksi telah ditransfer manual ke Penjual.\n\n📊 **Rincian:**\n• Jumlah Bersih: Rp ${room.sellerTotal.toLocaleString('id-ID')}\n• Jam Pengiriman: ${timeStr} WIB\n\nSilakan Penjual mengonfirmasi penerimaan jika saldo sudah masuk mutasi bank.`;
  
  sendChatMessage(roomId, 'buyer', 'bot', broadcastText);
  // Inject receipt inside buyer chat
  room.chatLogs.buyer.push({ sender: 'bot', text: `Bukti transfer sukses dari Admin:`, time: timeStr, attachment: room.adminUploadedReceipt });
  
  sendChatMessage(roomId, 'seller', 'bot', broadcastText);
  // Inject receipt inside seller chat
  room.chatLogs.seller.push({ sender: 'bot', text: `Bukti transfer sukses dari Admin:`, time: timeStr, attachment: room.adminUploadedReceipt });
  
  // Update admin chat
  sendChatMessage(roomId, 'admin', 'bot', `✅ Pengajuan WD disetujui. Bukti transfer manual disebarkan.`);
  
  renderAll();
}

// Seller confirms receipt of funds
function handleSellerConfirmFunds(roomId) {
  const room = STATE.rooms[roomId - 1];
  room.sellerDone = true;
  
  logEvent('action', `Penjual menyatakan dana WD telah mendarat di rekeningnya.`);
  
  sendChatMessage(roomId, 'seller', 'bot', `👍 Anda mengonfirmasi penerimaan dana. Terima kasih!\nSilakan klik tombol **DONE** untuk menuntaskan sesi.`);
  sendChatMessage(roomId, 'buyer', 'bot', `ℹ️ Penjual menyatakan telah menerima dana.`);
  
  renderAll();
}

// Buyer or Seller clicks DONE finalization
function handleDoneClick(roomId, role) {
  const room = STATE.rooms[roomId - 1];
  
  if (role === 'buyer') room.buyerDone = true;
  if (role === 'seller') room.sellerDone = true;
  
  logEvent('action', `${role === 'buyer' ? 'Pembeli' : 'Penjual'} mengeklik tombol DONE.`);
  
  // If both are done, finalize the trade
  if (room.buyerDone && room.sellerDone) {
    finalizeTransaction(roomId);
  } else {
    sendChatMessage(roomId, role, 'bot', `Menunggu pihak satunya mengeklik **DONE** untuk menutup room.`);
    renderAll();
  }
}

// Finalize trade: Save to History, update Metrics and wipe room clean
function finalizeTransaction(roomId, isRefund = false) {
  const room = STATE.rooms[roomId - 1];
  
  const txId = 'TX-' + Math.floor(10000 + Math.random() * 90000);
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' | ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  
  // Blur usernames for privacy display
  const anonymize = (user) => {
    if (!user) return '***';
    const clean = user.replace('@', '');
    if (clean.length <= 4) return '@' + clean[0] + '***';
    return '@' + clean.slice(0, 3) + '*******' + clean.slice(-2);
  };
  
  // Create history entry
  const newTx = {
    txId: txId,
    room: `ROOM ${roomId}`,
    date: dateStr,
    buyer: anonymize(room.buyer),
    seller: anonymize(room.seller),
    nominal: room.nominal,
    status: isRefund ? '🔴 REFUNDED CANCEL' : '🟢 SUCCESS DONE'
  };
  
  // Mutate stats
  STATE.history.unshift(newTx);
  if (!isRefund) {
    STATE.totalVolume += room.nominal;
  }
  STATE.totalTransactions += 1;
  
  if (isRefund) {
    logEvent('success', `🎉 REFUND TRANSAKSI SELESAI SEPENUHNYA! ID: ${txId}. Nominal Refund: Rp ${room.buyerTotal.toLocaleString('id-ID')}. Sesi ROOM ${roomId} ditutup.`);
  } else {
    logEvent('success', `🎉 TRANSAKSI SELESAI SEPENUHNYA! ID: ${txId}. Nominal: Rp ${room.nominal.toLocaleString('id-ID')}. Sesi ROOM ${roomId} ditutup.`);
  }
  
  // Reset room variables clean
  room.buyer = null;
  room.seller = null;
  room.adminJoined = false;
  room.status = 'empty';
  room.txState = 'select_role';
  room.nominal = 0;
  room.buyerTotal = 0;
  room.sellerTotal = 0;
  room.buyerUploadedReceipt = null;
  room.adminUploadedReceipt = null;
  room.wdDetails = { accountNo: '', bankName: '', ownerName: '' };
  room.buyerDone = false;
  room.sellerDone = false;
  
  room.chatLogs.buyer = [
    { sender: 'bot', text: '🛡️ **REKBER BANG DIGITAL** 🛡️\nHalo! Selamat datang di sistem Rekber Otomatis.\n\nSilakan tentukan role transaksi Anda di bawah ini.', time: '02:05' }
  ];
  room.chatLogs.seller = [
    { sender: 'bot', text: '🛡️ **REKBER BANG DIGITAL** 🛡️\nHalo! Selamat datang di sistem Rekber Otomatis.\n\nSilakan tentukan role transaksi Anda di bawah ini.', time: '02:05' }
  ];
  room.chatLogs.admin = [
    { sender: 'system', text: 'Menunggu panggilan bantuan aktif dari room transaksi...', time: '02:05' }
  ];
  
  renderAll();
}

// --- 6. DOM RENDERERS ---

function renderAll() {
  renderMetrics();
  renderRooms();
  renderHistory();
  
  // Render active phones
  renderPhone('buyer');
  renderPhone('seller');
  renderPhone('admin');
}

function renderMetrics() {
  document.getElementById('stat-total-volume').innerText = 'Rp ' + STATE.totalVolume.toLocaleString('id-ID');
  document.getElementById('stat-total-tx').innerText = STATE.totalTransactions.toLocaleString('id-ID') + ' Transaksi';
}

function renderRooms() {
  const container = document.getElementById('room-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  STATE.rooms.forEach((room, index) => {
    const item = document.createElement('div');
    item.className = `room-status-item ${index === STATE.activeRoomIndex ? 'active-room-highlight' : ''}`;
    // Add clickable styling
    item.style.cursor = 'pointer';
    if (index === STATE.activeRoomIndex) {
      item.style.borderColor = 'var(--accent-cyan)';
      item.style.background = 'rgba(6, 182, 212, 0.04)';
    }
    
    // Set status badge details
    let badgeClass = 'empty';
    let badgeText = '⚪ KOSONG (0/2)';
    let usersText = '(Kosong)';
    
    if (room.status === 'half') {
      badgeClass = 'half';
      badgeText = '🟢 ONLINE (1/2)';
      usersText = room.buyer ? `${room.buyer} (BUYER)` : `${room.seller} (SELLER)`;
    } else if (room.status === 'locked') {
      badgeClass = 'locked';
      badgeText = '🔴 LOCKED (2/2)';
      usersText = 'Pembeli & Penjual';
    }
    
    item.innerHTML = `
      <div class="room-label">
        🚪 Room ${room.id} 
        <span class="room-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="room-users" title="${usersText}">${usersText}</div>
    `;
    
    // Let user tap room in statistics to focus simulator on it
    item.addEventListener('click', () => {
      STATE.activeRoomIndex = index;
      logEvent('info', `Fokus simulator beralih ke Room ${room.id}.`);
      renderAll();
    });
    
    container.appendChild(item);
  });
}

function renderHistory(searchQuery = '') {
  const container = document.getElementById('history-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  const query = searchQuery.toLowerCase();
  
  const filtered = STATE.history.filter(tx => {
    return tx.txId.toLowerCase().includes(query) || 
           tx.room.toLowerCase().includes(query) ||
           tx.buyer.toLowerCase().includes(query) ||
           tx.seller.toLowerCase().includes(query);
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; font-size:0.75rem; color:var(--text-muted); padding:1rem;">Tidak ada history ditemukan.</div>`;
    return;
  }
  
  filtered.forEach(tx => {
    const el = document.createElement('div');
    el.className = 'history-item';
    
    el.innerHTML = `
      <div class="history-top-row">
        <span class="history-tx-id"><i class="fa-solid fa-receipt"></i> ${tx.txId}</span>
        <span class="history-room">${tx.room}</span>
      </div>
      <div class="history-date">${tx.date}</div>
      <div class="history-user-info">
        <div class="history-user">
          <span class="history-role">Pembeli:</span>
          <span>${tx.buyer}</span>
        </div>
        <div class="history-user">
          <span class="history-role">Penjual:</span>
          <span>${tx.seller}</span>
        </div>
      </div>
      <div class="history-bottom-row">
        <span class="history-status"><i class="fa-solid fa-circle-check"></i> SUCCESS DONE</span>
        <span class="history-nominal">Rp ${tx.nominal.toLocaleString('id-ID')}</span>
      </div>
    `;
    
    container.appendChild(el);
  });
}

// Helper to convert markdown bold ** to <strong> tags in chat rendering
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

// Render dynamic elements inside mobile phone chat logs
function renderPhone(role) {
  const roomIndex = STATE.activeRoomIndex;
  const room = STATE.rooms[roomIndex];
  
  const chatBody = document.getElementById(`${role}-chat-body`);
  const actionArea = document.getElementById(`${role}-action-area`);
  
  if (!chatBody) return;
  
  // 1. Render Chat message logs
  chatBody.innerHTML = '';
  const messages = room.chatLogs[role] || [];
  
  messages.forEach(msg => {
    const bubble = document.createElement('div');
    
    if (msg.sender === 'user') {
      bubble.className = 'message-bubble out';
      bubble.innerHTML = `
        <div>${formatMarkdown(msg.text)}</div>
        <span class="message-time">${msg.time}</span>
      `;
    } else {
      bubble.className = 'message-bubble in';
      
      let attachmentHtml = '';
      if (msg.attachment) {
        attachmentHtml = `<img src="${msg.attachment}" class="upload-dummy-img" alt="bukti transfer">`;
      }
      
      bubble.innerHTML = `
        <div>${formatMarkdown(msg.text)}</div>
        ${attachmentHtml}
        <span class="message-time">${msg.time}</span>
      `;
    }
    
    chatBody.appendChild(bubble);
  });
  
  // If special ringing notification card on Admin screen
  if (role === 'admin' && messages.length > 0 && messages[messages.length - 1].isPanggilan) {
    const lastMsg = messages[messages.length - 1];
    const ringBlock = document.createElement('div');
    ringBlock.className = 'inline-keyboard single';
    ringBlock.style.marginTop = '0.5rem';
    
    ringBlock.innerHTML = `
      <button class="tg-btn success" id="admin-accept-room-btn"><i class="fa-solid fa-check"></i> 🟢 ACCEPT & JOIN</button>
      <button class="tg-btn danger" id="admin-cancel-room-btn"><i class="fa-solid fa-xmark"></i> 🔴 CANCEL</button>
    `;
    chatBody.appendChild(ringBlock);
    
    // Bind buttons
    document.getElementById('admin-accept-room-btn').addEventListener('click', () => handleAdminAccept(room.id, true));
    document.getElementById('admin-cancel-room-btn').addEventListener('click', () => handleAdminAccept(room.id, false));
  }

  // If top-up receipt approval card on Admin screen
  if (role === 'admin' && messages.length > 0 && messages[messages.length - 1].isReceiptApproval) {
    const lastMsg = messages[messages.length - 1];
    const approvalBlock = document.createElement('div');
    approvalBlock.style.marginTop = '0.5rem';
    
    approvalBlock.innerHTML = `
      <div class="upload-preview-sim" style="border-style: solid; margin-bottom: 0.5rem;">
        <span class="upload-preview-text" style="color:var(--accent-green); font-weight:700;"><i class="fa-solid fa-image"></i> BUKTI TRANSFER BUYER</span>
        <img src="${lastMsg.receiptUrl}" class="upload-dummy-img" style="height:100px;">
      </div>
      <div class="inline-keyboard">
        <button class="tg-btn success" id="admin-approve-topup-btn"><i class="fa-solid fa-thumbs-up"></i> 🟢 APPROVE</button>
        <button class="tg-btn danger" id="admin-reject-topup-btn"><i class="fa-solid fa-thumbs-down"></i> 🔴 REJECT</button>
      </div>
    `;
    chatBody.appendChild(approvalBlock);
    
    document.getElementById('admin-approve-topup-btn').addEventListener('click', () => handleAdminApproveTopup(room.id, true));
    document.getElementById('admin-reject-topup-btn').addEventListener('click', () => handleAdminApproveTopup(room.id, false));
  }

  // Dispute actions on Admin screen
  if (role === 'admin' && messages.length > 0 && messages[messages.length - 1].isDisputeAction) {
    const actionBlock = document.createElement('div');
    actionBlock.className = 'inline-keyboard single';
    actionBlock.style.marginTop = '0.5rem';
    
    actionBlock.innerHTML = `
      <button class="tg-btn success" id="admin-resolve-wd-btn"><i class="fa-solid fa-scale-balanced"></i> ⚖️ Mediasi: Lanjutkan ke WD Seller</button>
      <button class="tg-btn danger" id="admin-resolve-refund-btn"><i class="fa-solid fa-undo"></i> ⚖️ Mediasi: Refund ke Buyer</button>
    `;
    chatBody.appendChild(actionBlock);
    
    document.getElementById('admin-resolve-wd-btn').addEventListener('click', () => handleAdminResolveDispute(room.id, 'wd'));
    document.getElementById('admin-resolve-refund-btn').addEventListener('click', () => handleAdminResolveDispute(room.id, 'refund'));
  }

  // WD processing actions on Admin Screen
  if (role === 'admin' && messages.length > 0 && messages[messages.length - 1].isWdApproval) {
    const actionBlock = document.createElement('div');
    actionBlock.style.marginTop = '0.5rem';
    
    actionBlock.innerHTML = `
      <button class="tg-btn warning single" id="admin-remind-buyer-btn" style="margin-bottom:0.4rem; width:100%;">
        <i class="fa-solid fa-bell"></i> 🔔 Kirim Reminder ke Buyer (Optional)
      </button>
      <div class="upload-preview-sim" style="border-style: dashed; margin-bottom: 0.4rem;" id="admin-wd-tf-simulator">
        <i class="fa-solid fa-file-invoice-dollar upload-preview-icon" style="color:var(--accent-cyan);"></i>
        <div class="upload-preview-text">Klik untuk simulasikan struk transfer manual Anda</div>
      </div>
      <button class="tg-btn success" id="admin-approve-wd-btn" style="width:100%; display:none;">
        <i class="fa-solid fa-paper-plane"></i> 📤 APPROVE & KIRIM BUKTI TF
      </button>
    `;
    chatBody.appendChild(actionBlock);
    
    document.getElementById('admin-remind-buyer-btn').addEventListener('click', () => handleAdminSendReminder(room.id));
    
    const uploader = document.getElementById('admin-wd-tf-simulator');
    const approveBtn = document.getElementById('admin-approve-wd-btn');
    
    uploader.addEventListener('click', () => {
      uploader.innerHTML = `
        <span class="upload-preview-text" style="color:var(--accent-cyan); font-weight:700;"><i class="fa-solid fa-image"></i> BUKTI TRANSFER WD</span>
        <img src="https://dummyimage.com/600x400/06b6d4/ffffff.png&text=MANUAL+TRANSFER+SUCCESS" class="upload-dummy-img" style="height:60px;">
      `;
      approveBtn.style.display = 'flex';
      logEvent('action', 'Admin mensimulasikan upload struk transfer WD bank.');
    });
    
    approveBtn.addEventListener('click', () => handleAdminApproveWd(room.id));
  }

  // Refund processing actions on Admin Screen
  if (role === 'admin' && messages.length > 0 && messages[messages.length - 1].isRefundApproval) {
    const actionBlock = document.createElement('div');
    actionBlock.style.marginTop = '0.5rem';
    
    actionBlock.innerHTML = `
      <div class="upload-preview-sim" style="border-style: dashed; margin-bottom: 0.4rem;" id="admin-refund-tf-simulator">
        <i class="fa-solid fa-file-invoice-dollar upload-preview-icon" style="color:var(--accent-red);"></i>
        <div class="upload-preview-text">Klik untuk simulasikan struk transfer refund Anda</div>
      </div>
      <button class="tg-btn danger" id="admin-approve-refund-btn" style="width:100%; display:none;">
        <i class="fa-solid fa-paper-plane"></i> 📤 APPROVE & KIRIM BUKTI REFUND
      </button>
    `;
    chatBody.appendChild(actionBlock);
    
    const uploader = document.getElementById('admin-refund-tf-simulator');
    const approveBtn = document.getElementById('admin-approve-refund-btn');
    
    uploader.addEventListener('click', () => {
      uploader.innerHTML = `
        <span class="upload-preview-text" style="color:var(--accent-red); font-weight:700;"><i class="fa-solid fa-image"></i> BUKTI REFUND TRANSFER</span>
        <img src="https://dummyimage.com/600x400/ef4444/ffffff.png&text=MANUAL+REFUND+SUCCESS" class="upload-dummy-img" style="height:60px;">
      `;
      approveBtn.style.display = 'flex';
      logEvent('action', 'Admin mensimulasikan upload struk transfer refund.');
    });
    
    approveBtn.addEventListener('click', () => handleAdminApproveRefund(room.id));
  }

  // Scroll body down
  chatBody.scrollTop = chatBody.scrollHeight;
  
  // 2. Render bottom action inline overlay area
  actionArea.style.display = 'none';
  actionArea.innerHTML = '';
  
  // RENDER CORRESPONDING BUTTONS BASED ON TX STATE AND ROLE
  
  if (room.txState === 'select_role') {
    if (role === 'buyer') {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'inline-keyboard single';
      el.innerHTML = `
        <button class="tg-btn success" id="buyer-join-btn-r1"><i class="fa-solid fa-arrow-right-to-bracket"></i> Masuk Room ${room.id} (Pilih Role: PEMBELI)</button>
      `;
      actionArea.appendChild(el);
      
      document.getElementById('buyer-join-btn-r1').addEventListener('click', () => handleJoinRoom(room.id, 'buyer'));
    } 
    else if (role === 'seller') {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'inline-keyboard single';
      el.innerHTML = `
        <button class="tg-btn success" id="seller-join-btn-r1"><i class="fa-solid fa-arrow-right-to-bracket"></i> Masuk Room ${room.id} (Pilih Role: PENJUAL)</button>
      `;
      actionArea.appendChild(el);
      
      document.getElementById('seller-join-btn-r1').addEventListener('click', () => handleJoinRoom(room.id, 'seller'));
    }
  }
  
  else if (room.txState === 'waiting_member') {
    // Show exit button
    actionArea.style.display = 'block';
    const el = document.createElement('div');
    el.className = 'inline-keyboard single';
    el.innerHTML = `<button class="tg-btn danger" id="${role}-exit-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> 🚪 Keluar Room</button>`;
    actionArea.appendChild(el);
    
    document.getElementById(`${role}-exit-btn`).addEventListener('click', () => handleExitRoom(room.id, role));
  }
  
  else if (room.txState === 'waiting_admin_panggilan') {
    // Show Call Admin button
    if (role === 'buyer' || role === 'seller') {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'inline-keyboard';
      el.innerHTML = `
        <button class="tg-btn warning" id="${role}-call-admin-btn"><i class="fa-solid fa-bell"></i> 🔔 PANGGIL ADMIN</button>
        <button class="tg-btn danger" id="${role}-exit-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> 🚪 Keluar</button>
      `;
      actionArea.appendChild(el);
      
      document.getElementById(`${role}-call-admin-btn`).addEventListener('click', () => handleCallAdmin(room.id));
      document.getElementById(`${role}-exit-btn`).addEventListener('click', () => handleExitRoom(room.id, role));
    }
  }
  
  else if (room.txState === 'topup_menu') {
    if (role === 'buyer') {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'chat-prompt-card';
      
      el.innerHTML = `
        <div class="chat-prompt-title"><i class="fa-solid fa-wallet" style="color:var(--accent-cyan);"></i> INPUT HARGA BARANG</div>
        <div class="chat-prompt-desc">Masukkan harga murni barang yang ingin dibeli. Sistem otomatis menambahkan fee 5%.</div>
        
        <div class="chat-prompt-quick-nominal">
          <button class="chat-prompt-quick-btn" data-val="50000">Rp 50K</button>
          <button class="chat-prompt-quick-btn" data-val="100000">Rp 100K</button>
          <button class="chat-prompt-quick-btn" data-val="250000">Rp 250K</button>
        </div>
        
        <div class="chat-prompt-input-group">
          <input type="number" id="buyer-nominal-input" class="chat-prompt-input" placeholder="Misal: 100000" value="100000">
          <button class="chat-prompt-submit-btn" id="buyer-submit-nominal-btn">SUBMIT</button>
        </div>
      `;
      actionArea.appendChild(el);
      
      // Bind quick nominal triggers
      const quickBtns = el.querySelectorAll('.chat-prompt-quick-btn');
      const inputEl = document.getElementById('buyer-nominal-input');
      quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          inputEl.value = btn.getAttribute('data-val');
        });
      });
      
      document.getElementById('buyer-submit-nominal-btn').addEventListener('click', () => {
        const val = parseInt(inputEl.value);
        handleBuyerSubmitNominal(room.id, val);
      });
    }
  }
  
  else if (room.txState === 'topup_receipt_pending') {
    if (role === 'buyer') {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'chat-prompt-card';
      
      el.innerHTML = `
        <div class="chat-prompt-title"><i class="fa-solid fa-camera" style="color:var(--accent-cyan);"></i> UNGGAH BUKTI TRANSFER</div>
        
        <div class="upload-preview-sim" id="buyer-receipt-uploader">
          <i class="fa-solid fa-cloud-arrow-up upload-preview-icon"></i>
          <div class="upload-preview-text">Klik untuk simulasikan Unggah Struk Bayar</div>
        </div>
        
        <button class="tg-btn success" id="buyer-submit-receipt-btn" style="width:100%; display:none; margin-top:0.4rem;">
          <i class="fa-solid fa-paper-plane"></i> Kirim Bukti Transfer
        </button>
        
        <button class="tg-btn danger" id="buyer-cancel-topup-btn" style="width:100%;">
          <i class="fa-solid fa-xmark"></i> Batalkan
        </button>
      `;
      actionArea.appendChild(el);
      
      const uploader = document.getElementById('buyer-receipt-uploader');
      const submitBtn = document.getElementById('buyer-submit-receipt-btn');
      
      uploader.addEventListener('click', () => {
        uploader.innerHTML = `
          <span class="upload-preview-text" style="color:var(--accent-green); font-weight:700;"><i class="fa-solid fa-image"></i> STRUK BERHASIL DI-UPLOAD</span>
          <img src="https://dummyimage.com/600x400/10b981/ffffff.png&text=STRUK+PEMBAYARAN+ Rp +${room.buyerTotal.toLocaleString('id-ID')}" class="upload-dummy-img">
        `;
        submitBtn.style.display = 'flex';
        logEvent('action', 'Pembeli mengunggah file gambar bukti transfer dummy.');
      });
      
      submitBtn.addEventListener('click', () => handleBuyerUploadReceipt(room.id));
      document.getElementById('buyer-cancel-topup-btn').addEventListener('click', () => handleExitRoom(room.id, 'buyer'));
    }
  }
  
  else if (room.txState === 'waiting_delivery') {
    if (role === 'seller') {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'inline-keyboard single';
      el.innerHTML = `
        <button class="tg-btn success" id="seller-delivered-btn"><i class="fa-solid fa-truck-ramp-box"></i> ✅ BARANG SUDAH DIKIRIM</button>
      `;
      actionArea.appendChild(el);
      
      document.getElementById('seller-delivered-btn').addEventListener('click', () => handleSellerDeliver(room.id));
    }
  }
  
  else if (room.txState === 'waiting_delivery_confirmation') {
    if (role === 'buyer') {
      actionArea.style.display = 'block';
      
      const timerPill = document.createElement('div');
      timerPill.className = 'timer-pill';
      timerPill.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> ⏳ Auto-Done aktif (2 Jam)`;
      actionArea.appendChild(timerPill);
      
      const el = document.createElement('div');
      el.className = 'inline-keyboard';
      el.innerHTML = `
        <button class="tg-btn success" id="buyer-accept-goods-btn"><i class="fa-solid fa-square-check"></i> ✅ BARANG DITERIMA</button>
        <button class="tg-btn danger" id="buyer-dispute-goods-btn"><i class="fa-solid fa-circle-exclamation"></i> ❌ BARANG TIDAK SESUAI</button>
      `;
      actionArea.appendChild(el);
      
      // Inject simulated Auto-done trigger inside logs card for demo ease
      const consolePanel = document.getElementById('console-logs');
      if (consolePanel && !document.getElementById('fast-forward-timer-btn')) {
        const ffBtn = document.createElement('button');
        ffBtn.id = 'fast-forward-timer-btn';
        ffBtn.className = 'console-clear-btn';
        ffBtn.style.borderColor = 'var(--accent-orange)';
        ffBtn.style.color = 'var(--accent-orange)';
        ffBtn.style.marginTop = '0.5rem';
        ffBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Simulasikan Waktu 2 Jam';
        ffBtn.addEventListener('click', () => {
          simulateAutoDone(room.id);
          ffBtn.remove();
        });
        consolePanel.appendChild(ffBtn);
      }
      
      document.getElementById('buyer-accept-goods-btn').addEventListener('click', () => handleBuyerAccept(room.id));
      document.getElementById('buyer-dispute-goods-btn').addEventListener('click', () => handleBuyerDispute(room.id));
    }
  }
  
  else if (room.txState === 'waiting_withdraw') {
    if (role === 'seller') {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'inline-keyboard single';
      el.innerHTML = `
        <button class="tg-btn warning" id="seller-withdraw-click-btn"><i class="fa-solid fa-wallet"></i> 💸 WITHDRAW SALDO (Rp ${room.nominal.toLocaleString('id-ID')})</button>
      `;
      actionArea.appendChild(el);
      
      document.getElementById('seller-withdraw-click-btn').addEventListener('click', () => handleSellerClickWithdraw(room.id));
    }
  }
  
  else if (room.txState === 'withdraw_submitted') {
    if (role === 'seller') {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'chat-prompt-card';
      
      el.innerHTML = `
        <div class="chat-prompt-title"><i class="fa-solid fa-building-columns" style="color:var(--accent-cyan);"></i> DATA REKENING PENCAIRAN</div>
        <div class="chat-prompt-desc">Isi no rekening/E-wallet tujuan. Format: [No Rek] - [Bank] - [Nama Pemilik]</div>
        
        <input type="text" id="seller-bank-input" class="chat-prompt-input" placeholder="Misal: 0812345678 - DANA - Syahrul Gunawan" value="0812345678 - DANA - Syahrul Gunawan">
        <button class="tg-btn success" id="seller-submit-wd-btn" style="width:100%; margin-top:0.4rem;">
          <i class="fa-solid fa-paper-plane"></i> 📤 KIRIM PERMINTAAN WD
        </button>
      `;
      actionArea.appendChild(el);
      
      document.getElementById('seller-submit-wd-btn').addEventListener('click', () => {
        const val = document.getElementById('seller-bank-input').value;
        handleSellerSubmitWd(room.id, val);
      });
    }
  }
  
  else if (room.txState === 'waiting_done') {
    if (role === 'seller' && !room.sellerDone) {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'inline-keyboard single';
      el.innerHTML = `
        <button class="tg-btn success" id="seller-confirm-receive-funds-btn"><i class="fa-solid fa-clipboard-check"></i> ✅ SAYA SUDAH MENERIMA DANA</button>
      `;
      actionArea.appendChild(el);
      
      document.getElementById('seller-confirm-receive-funds-btn').addEventListener('click', () => handleSellerConfirmFunds(room.id));
    }
    
    if (role === 'buyer' || (role === 'seller' && room.sellerDone)) {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'chat-prompt-card';
      el.style.borderColor = 'var(--accent-green)';
      
      const doneStatusText = (role === 'buyer') 
        ? (room.buyerDone ? 'Menunggu Penjual mengeklik Done...' : 'Konfirmasi transaksi Anda telah selesai sepenuhnya.')
        : (room.sellerDone ? (room.buyerDone ? 'Kedua pihak selesai!' : 'Menunggu Pembeli mengeklik Done...') : 'Konfirmasi.');
      
      el.innerHTML = `
        <div class="chat-prompt-title" style="color:var(--accent-green);"><i class="fa-solid fa-handshake"></i> TRANSAKSI SELESAI</div>
        <div class="chat-prompt-desc" style="margin-bottom:0.4rem;">${doneStatusText}</div>
        
        <button class="tg-btn success" id="${role}-done-confirm-btn" style="width:100%; ${ (role === 'buyer' && room.buyerDone) ? 'opacity:0.6; cursor:not-allowed;' : '' }">
          <i class="fa-solid fa-check-double"></i> 🟢 DONE
        </button>
      `;
      actionArea.appendChild(el);
      
      if (!(role === 'buyer' && room.buyerDone)) {
        document.getElementById(`${role}-done-confirm-btn`).addEventListener('click', () => handleDoneClick(room.id, role));
      }
    }
  }
  
  else if (room.txState === 'buyer_refund_menu') {
    if (role === 'buyer') {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'inline-keyboard single';
      el.innerHTML = `
        <button class="tg-btn danger" id="buyer-click-refund-btn"><i class="fa-solid fa-undo"></i> 💸 AJUKAN REFUND DANA</button>
      `;
      actionArea.appendChild(el);
      
      document.getElementById('buyer-click-refund-btn').addEventListener('click', () => handleBuyerClickRefund(room.id));
    }
  }
  
  else if (room.txState === 'buyer_refund_form') {
    if (role === 'buyer') {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'chat-prompt-card';
      el.style.borderColor = 'var(--accent-red)';
      
      el.innerHTML = `
        <div class="chat-prompt-title" style="color:var(--accent-red);"><i class="fa-solid fa-building-columns"></i> REKENING PENGEMBALIAN DANA</div>
        <div class="chat-prompt-desc">Isi detail rekening/E-wallet tujuan refund Anda.</div>
        
        <input type="text" id="buyer-refund-input" class="chat-prompt-input" placeholder="Misal: 089999999 - DANA - Syahrul (Pembeli)" value="089999999 - DANA - Syahrul (Pembeli)">
        <button class="tg-btn danger" id="buyer-submit-refund-btn" style="width:100%; margin-top:0.4rem;">
          <i class="fa-solid fa-paper-plane"></i> 📤 KIRIM PERMINTAAN REFUND
        </button>
      `;
      actionArea.appendChild(el);
      
      document.getElementById('buyer-submit-refund-btn').addEventListener('click', () => {
        const val = document.getElementById('buyer-refund-input').value;
        handleBuyerSubmitRefund(room.id, val);
      });
    }
  }
  
  else if (room.txState === 'waiting_done_refund') {
    if (role === 'buyer') {
      actionArea.style.display = 'block';
      
      const el = document.createElement('div');
      el.className = 'chat-prompt-card';
      el.style.borderColor = 'var(--accent-green)';
      
      el.innerHTML = `
        <div class="chat-prompt-title" style="color:var(--accent-green);"><i class="fa-solid fa-handshake"></i> REFUND TUNTAS</div>
        <div class="chat-prompt-desc" style="margin-bottom:0.4rem;">Dana refund telah dikirim Admin. Konfirmasikan untuk menutup room.</div>
        
        <button class="tg-btn success" id="buyer-done-refund-btn" style="width:100%;">
          <i class="fa-solid fa-check-double"></i> 🟢 DONE
        </button>
      `;
      actionArea.appendChild(el);
      
      document.getElementById('buyer-done-refund-btn').addEventListener('click', () => finalizeTransaction(room.id, true));
    }
  }
}
