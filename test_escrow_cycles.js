/*
   ==========================================================================
   REKBER BANG - STANDALONE TERMINAL TEST SUITE (EXTENDED VERSION)
   Simulates 5 complete transaction cycles, including edge cases:
   - Normal Success
   - Dispute & Resolve (WD Seller)
   - Dispute & Resolve (Refund Buyer)
   - Buyer Anti-Gantung (Auto-Done release after 2 Hours of silence)
   - Seller Anti-Gantung (Admin Force-Done bypass after manual WD proof sent)
   ==========================================================================
*/

const STATE = {
  totalVolume: 34500000,
  totalTransactions: 1420,
  rooms: [{
    id: 1,
    buyer: null,
    seller: null,
    adminJoined: false,
    status: 'empty',
    txState: 'select_role',
    nominal: 0,
    buyerTotal: 0,
    sellerTotal: 0,
    buyerUploadedReceipt: false,
    adminUploadedReceipt: false,
    wdDetails: { accountNo: '', bankName: '', ownerName: '' },
    buyerDone: false,
    sellerDone: false
  }],
  history: []
};

// ANSI color codes for premium CMD layout
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  bgBlack: "\x1b[40m"
};

function log(type, msg) {
  const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
  let prefix = '';
  switch(type) {
    case 'info': prefix = `${colors.bright}${colors.cyan}[INFO]${colors.reset}`; break;
    case 'success': prefix = `${colors.bright}${colors.green}[SUCCESS]${colors.reset}`; break;
    case 'warning': prefix = `${colors.bright}${colors.yellow}[WARNING]${colors.reset}`; break;
    case 'disputed': prefix = `${colors.bright}${colors.red}[DISPUTE]${colors.reset}`; break;
    case 'action': prefix = `${colors.bright}${colors.magenta}[ACTION]${colors.reset}`; break;
  }
  console.log(`${colors.dim}[${timestamp}]${colors.reset} ${prefix} ${msg}`);
}

function resetRoom() {
  STATE.rooms[0] = {
    id: 1,
    buyer: null,
    seller: null,
    adminJoined: false,
    status: 'empty',
    txState: 'select_role',
    nominal: 0,
    buyerTotal: 0,
    sellerTotal: 0,
    buyerUploadedReceipt: false,
    adminUploadedReceipt: false,
    wdDetails: { accountNo: '', bankName: '', ownerName: '' },
    buyerDone: false,
    sellerDone: false
  };
}

// Escrow Flow Simulator
function runCycle(cycleNum, description, config) {
  console.log(`\n${colors.bright}${colors.bgBlack}${colors.cyan} === MULAI SIKLUS ${cycleNum}: ${description} === ${colors.reset}\n`);
  resetRoom();
  const room = STATE.rooms[0];
  
  // 1. Join Room
  log('action', `Pembeli @pembeli_grok masuk ROOM 1.`);
  room.buyer = '@pembeli_grok';
  room.status = 'half';
  room.txState = 'waiting_member';
  
  log('action', `Penjual @aldi_kurniawan masuk ROOM 1.`);
  room.seller = '@aldi_kurniawan';
  room.status = 'locked';
  room.txState = 'waiting_admin_panggilan';
  log('success', `Room 1 LOCKED (2/2). Pembeli & Penjual terhubung.`);
  
  // 2. Call Admin
  log('action', `Panggilan PANGGIL ADMIN dikirim.`);
  room.adminJoined = true;
  room.txState = 'topup_menu';
  log('success', `Admin bergabung. Saldo ditahan awal: Rp 0`);
  
  // 3. Top-Up Input
  log('action', `Pembeli mengajukan harga barang: Rp ${config.nominal.toLocaleString('id-ID')}`);
  room.nominal = config.nominal;
  room.buyerTotal = config.nominal + (config.nominal * 0.05); // 5% fee
  room.sellerTotal = config.nominal - (config.nominal * 0.025); // 2.5% withdrawal fee
  
  log('info', `➔ Tagihan Pembeli (+5% Fee): Rp ${room.buyerTotal.toLocaleString('id-ID')}`);
  log('info', `➔ Bersih Penjual kelak (-2.5% WD): Rp ${room.sellerTotal.toLocaleString('id-ID')}`);
  
  // 4. Buyer Transfer & Admin Approve
  log('action', `Pembeli transfer Rp ${room.buyerTotal.toLocaleString('id-ID')} & upload resi.`);
  room.buyerUploadedReceipt = true;
  room.txState = 'verifying_topup';
  
  log('success', `Admin memverifikasi & APPROVE top-up. Saldo pending penjual aktif: Rp ${room.nominal.toLocaleString('id-ID')}`);
  room.txState = 'waiting_delivery';
  
  // 5. Seller Deliver
  log('action', `Penjual mengirimkan barang & klik 'BARANG SUDAH DIKIRIM'.`);
  room.txState = 'waiting_delivery_confirmation';
  
  // ============================================
  // CONDITIONAL PATHWAYS (NORMAL / DISPUTE / GANTUNG)
  // ============================================
  
  // Kasus A: Pesanan tidak sesuai (Dispute)
  if (config.hasDispute) {
    log('disputed', `Pembeli komplain: 'BARANG TIDAK SESUAI'.`);
    room.txState = 'disputed';
    log('warning', `Tombol WD Penjual dibekukan. Saldo ditahan. Admin dipanggil untuk mediasi.`);
    
    if (config.disputeResolution === 'refund') {
      log('success', `Admin meninjau chat bukti & memutuskan: REFUND PENUH KE PEMBELI.`);
      room.txState = 'buyer_refund_menu';
      
      log('action', `Pembeli mengajukan rekening refund.`);
      room.txState = 'buyer_refund_form';
      
      log('action', `Pembeli mengisi rekening pengembalian: "089999999 - DANA - Syahrul (Pembeli)"`);
      room.txState = 'refund_receipt_pending';
      
      log('info', `Admin mentransfer balik manual Rp ${room.buyerTotal.toLocaleString('id-ID')} ke DANA - A.N Syahrul (Pembeli)`);
      log('action', `Admin mengunggah bukti transfer refund.`);
      room.adminUploadedReceipt = true;
      room.txState = 'waiting_done_refund';
      
      log('action', `Pembeli mengonfirmasi refund diterima & klik '🟢 DONE'.`);
      room.buyerDone = true;
      
      // Finalize
      STATE.totalTransactions += 1;
      const txId = 'TX-' + Math.floor(10000 + Math.random() * 90000);
      STATE.history.push({
        txId: txId,
        room: 'ROOM 1',
        buyer: room.buyer,
        seller: room.seller,
        nominal: room.nominal,
        status: '🔴 REFUNDED CANCEL'
      });
      
      log('success', `Refund Transaksi ${txId} sukses difinalisasi! Tersimpan dalam riwayat.`);
      log('info', `Kumulatif Statistik:`);
      log('info', `➜ Volume Total: Rp ${STATE.totalVolume.toLocaleString('id-ID')} (Tidak bertambah karena transaksi batal/refund)`);
      log('info', `➜ Transaksi Berhasil/Ditangani: ${STATE.totalTransactions} Tx`);
      
      resetRoom();
      log('info', `Room 1 bersih kembali ke status: KOSONG.`);
      return;
    } else {
      log('success', `Admin meninjau bukti & memutuskan: TRANSAKSI SAH. Mediasi berpihak ke Penjual.`);
      room.txState = 'waiting_withdraw';
    }
  } 
  // Kasus B: Pembeli tidak konfirmasi (Anti-Gantung Pembeli 2 Jam)
  else if (config.buyerGantung) {
    log('warning', `⚠️ Pembeli tidak merespons (kabur/ketiduran/lupa). Transaksi tertahan.`);
    log('info', `Menghidupkan timer perlindungan Penjual: 'Auto-Done dalam 2 Jam'.`);
    
    // Simulate passage of 2 hours
    log('success', `⏱️ WAKTU SIMULASI: 2 Jam Berlalu tanpa komplain dari Pembeli.`);
    log('success', `Sistem otomatis mengeksekusi AUTO-RELEASE dana ke Penjual!`);
    room.txState = 'waiting_withdraw';
  } 
  // Kasus C: Transaksi Normal
  else {
    log('action', `Pembeli menerima barang & klik 'BARANG DITERIMA'.`);
    room.txState = 'waiting_withdraw';
  }
  
  // 6. Withdrawal Request
  log('success', `Dana dibebaskan. Status Penjual: SIAP WITHDRAW (Rp ${room.nominal.toLocaleString('id-ID')}).`);
  log('action', `Penjual klik 'WITHDRAW SALDO'.`);
  room.txState = 'withdraw_submitted';
  
  log('action', `Penjual isi rekening: "${config.wdAccount}"`);
  room.wdDetails = { accountNo: config.wdAccount.split('-')[0], bankName: config.wdAccount.split('-')[1], ownerName: config.wdAccount.split('-')[2] };
  room.txState = 'withdraw_receipt_pending';
  
  // 7. Admin Transfer WD & Upload Receipt
  log('info', `Admin mentransfer manual bersih Rp ${room.sellerTotal.toLocaleString('id-ID')} ke ${room.wdDetails.bankName} - A.N ${room.wdDetails.ownerName}`);
  log('action', `Admin mengunggah bukti transfer manual.`);
  room.adminUploadedReceipt = true;
  room.txState = 'waiting_done';
  
  // ============================================
  // FINAL CONFIRMATION PATHWAYS (DONE / GANTUNG DONE)
  // ============================================
  
  // Kasus D: Penjual/Pembeli tidak klik DONE padahal transfer WD sudah sukses diterima
  if (config.sellerGantungDone) {
    log('warning', `⚠️ Uang WD sudah masuk ke Penjual, tetapi Penjual malas/lupa mengklik tombol 'DONE' untuk menutup room.`);
    log('info', `Room 1 menggantung di status 'waiting_done' dan tidak bisa digunakan user lain.`);
    
    log('action', `Admin menyadari room macet. Admin menggunakan hak 'FORCE-DONE' (Bypass Penutupan Room).`);
    log('success', `Admin mengeksekusi FORCE-DONE sepihak.`);
  } else {
    // Saling konfirmasi DONE normal
    log('action', `Penjual konfirmasi dana diterima.`);
    room.sellerDone = true;
    
    log('action', `Pembeli klik '🟢 DONE'.`);
    room.buyerDone = true;
    
    log('action', `Penjual klik '🟢 DONE'.`);
  }
  
  // 8. Finalize Statistics
  STATE.totalVolume += room.nominal;
  STATE.totalTransactions += 1;
  
  const txId = 'TX-' + Math.floor(10000 + Math.random() * 90000);
  STATE.history.push({
    txId: txId,
    room: 'ROOM 1',
    buyer: room.buyer,
    seller: room.seller,
    nominal: room.nominal
  });
  
  log('success', `Transaksi ${txId} sukses difinalisasi! Tersimpan dalam riwayat.`);
  log('info', `Kumulatif Statistik:`);
  log('info', `➜ Volume Total: Rp ${STATE.totalVolume.toLocaleString('id-ID')}`);
  log('info', `➜ Transaksi Berhasil: ${STATE.totalTransactions} Tx`);
  
  resetRoom();
  log('info', `Room 1 bersih kembali ke status: KOSONG.`);
}

// Run testing suite
console.log(`\n${colors.bright}${colors.green} =======================================================`);
console.log(`  MENJALANKAN SIMULASI 5 SIKLUS (TERMASUK EDGE CASE & DISPUTE) `);
console.log(` =======================================================${colors.reset}\n`);

// Siklus 1: Normal Sukses
runCycle(1, "Transaksi Sukses Normal (Harga Rp 150.000)", {
  nominal: 150000,
  hasDispute: false,
  buyerGantung: false,
  sellerGantungDone: false,
  wdAccount: "0812345678 - DANA - Syahrul Gunawan"
});

// Siklus 2: Dispute resolved to Seller
runCycle(2, "Dispute Mediasi - Lanjutkan ke WD Seller (Harga Rp 500.000)", {
  nominal: 500000,
  hasDispute: true,
  disputeResolution: 'wd',
  buyerGantung: false,
  sellerGantungDone: false,
  wdAccount: "123456789 - BCA - Syahrul Gunawan"
});

// Siklus 3: Dispute resolved to Refund Buyer
runCycle(3, "Dispute Mediasi - Refund Penuh ke Pembeli (Harga Rp 2.000.000)", {
  nominal: 2000000,
  hasDispute: true,
  disputeResolution: 'refund',
  buyerGantung: false,
  sellerGantungDone: false,
  wdAccount: ""
});

// Siklus 4: Pembeli tidak konfirmasi (Anti-Gantung Pembeli - Auto-Release 2 Jam)
runCycle(4, "Anti-Gantung Pembeli - Auto-Release 2 Jam (Harga Rp 300.000)", {
  nominal: 300000,
  hasDispute: false,
  buyerGantung: true,
  sellerGantungDone: false,
  wdAccount: "0898765432 - OVO - Syahrul Gunawan"
});

// Siklus 5: Penjual tidak klik DONE (Anti-Gantung Penjual - Admin Force-Done Bypass)
runCycle(5, "Anti-Gantung Penjual - Admin Force-Done Bypass (Harga Rp 100.000)", {
  nominal: 100000,
  hasDispute: false,
  buyerGantung: false,
  sellerGantungDone: true,
  wdAccount: "0812345678 - DANA - Syahrul Gunawan"
});

console.log(`\n${colors.bright}${colors.green} =======================================================`);
console.log(`  SEMUA 5 SIKLUS PENGUJIAN SELESAI DENGAN SUKSES & AMAN `);
console.log(` =======================================================${colors.reset}\n`);
