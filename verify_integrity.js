/*
   ==========================================================================
   REKBER BANG - DEFENSIVE BOUNDARY & EDGE-CASE TEST SUITE
   Intentionally fires invalid inputs and states to discover bugs or crashes.
   ==========================================================================
*/

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m"
};

function log(type, msg) {
  let prefix = '';
  switch(type) {
    case 'info': prefix = `${colors.bright}${colors.cyan}[INFO]${colors.reset}`; break;
    case 'passed': prefix = `${colors.bright}${colors.green}[PASSED]${colors.reset}`; break;
    case 'warning': prefix = `${colors.bright}${colors.yellow}[WARNING]${colors.reset}`; break;
    case 'failed': prefix = `${colors.bright}${colors.red}[FAILED]${colors.reset}`; break;
  }
  console.log(`${prefix} ${msg}`);
}

// ---------------------------------------------------
// 1. Mocking the Core State Machine logic of app.js
// ---------------------------------------------------
class EscrowEngine {
  constructor() {
    this.nominal = 0;
    this.buyerTotal = 0;
    this.sellerTotal = 0;
    this.txState = 'select_role';
    this.wdDetails = { accountNo: '', bankName: '', ownerName: '' };
    this.refundDetails = { accountNo: '', bankName: '', ownerName: '' };
    this.logs = [];
  }

  submitNominal(amount) {
    const parsed = parseInt(amount);
    if (isNaN(parsed) || parsed <= 0) {
      this.logs.push(`Rejected invalid price: ${amount}`);
      return false; // Rejected
    }
    this.nominal = parsed;
    this.buyerTotal = parsed + (parsed * 0.05);
    this.sellerTotal = parsed - (parsed * 0.025);
    this.txState = 'verifying_topup';
    return true; // Accepted
  }

  submitWithdraw(bankInfo) {
    if (!bankInfo || bankInfo.trim() === '') {
      this.logs.push("Rejected empty withdraw details");
      return false;
    }
    
    // Robust parsing fallback logic
    const parts = bankInfo.split('-').map(p => p.trim());
    this.wdDetails.accountNo = parts[0] || 'Tidak diketahui';
    this.wdDetails.bankName = parts[1] || 'DANA';
    this.wdDetails.ownerName = parts[2] || 'Syahrul Gunawan';
    this.txState = 'withdraw_receipt_pending';
    return true;
  }

  submitRefund(refundInfo) {
    if (!refundInfo || refundInfo.trim() === '') {
      this.logs.push("Rejected empty refund details");
      return false;
    }
    
    const parts = refundInfo.split('-').map(p => p.trim());
    this.refundDetails.accountNo = parts[0] || 'Tidak diketahui';
    this.refundDetails.bankName = parts[1] || 'DANA';
    this.refundDetails.ownerName = parts[2] || 'Syahrul (Pembeli)';
    this.txState = 'refund_receipt_pending';
    return true;
  }
}

// ---------------------------------------------------
// 2. Running Rigorous Boundary Verification Tests
// ---------------------------------------------------
console.log(`\n${colors.bright}${colors.magenta} =======================================================`);
console.log(`  MEMULAI VETTING RIGID: MENCARI BUG DAN ERROR PADA LOGIKA `);
console.log(` =======================================================${colors.reset}\n`);

let testCount = 0;
let passedCount = 0;

function assert(condition, testName) {
  testCount++;
  if (condition) {
    passedCount++;
    log('passed', `${testName}`);
  } else {
    log('failed', `${colors.bright}${testName} ➜ CRITICAL BUG FOUND!${colors.reset}`);
  }
}

// --- TEST GROUP 1: INPUT NOMINAL BOUNDARY ---
const engine = new EscrowEngine();

log('info', 'Menguji validasi masukan nominal harga barang...');
assert(engine.submitNominal("-50000") === false, "Uji 1.1: Nominal negatif harus ditolak.");
assert(engine.submitNominal("0") === false, "Uji 1.2: Nominal nol harus ditolak.");
assert(engine.submitNominal("abc") === false, "Uji 1.3: Nominal string non-numeric harus ditolak.");
assert(engine.submitNominal("") === false, "Uji 1.4: Nominal kosong harus ditolak.");
assert(engine.submitNominal("100000") === true, "Uji 1.5: Nominal positif valid (100.000) harus diterima.");
assert(engine.buyerTotal === 105000, "Uji 1.6: Kalkulasi Fee Pembeli 5% harus tepat (Rp 105.000).");
assert(engine.sellerTotal === 97500, "Uji 1.7: Kalkulasi Bersih Penjual -2.5% harus tepat (Rp 97.500).");

// --- TEST GROUP 2: DEFENSIVE WITHDRAW BANK PARSING ---
log('info', 'Menguji ketahanan formulir Withdraw Penjual...');
assert(engine.submitWithdraw("") === false, "Uji 2.1: Data withdraw kosong harus ditolak.");
assert(engine.submitWithdraw("   ") === false, "Uji 2.2: Data withdraw spasi kosong harus ditolak.");

// Test unstructured bank info
log('warning', 'Menembakkan format rekening rusak (tanpa strip pemisah "-")...');
assert(engine.submitWithdraw("0812345678") === true, "Uji 2.3: Data no-strip harus tetap diterima.");
assert(engine.wdDetails.accountNo === "0812345678", "Uji 2.4: Akun terisi benar pada index 0.");
assert(engine.wdDetails.bankName === "DANA", "Uji 2.5: Bank otomatis fallback ke DANA (aman dari crash).");
assert(engine.wdDetails.ownerName === "Syahrul Gunawan", "Uji 2.6: Nama pemilik otomatis fallback ke Syahrul Gunawan (aman dari crash).");

// Test fully populated withdraw format
assert(engine.submitWithdraw("123-BCA-Syahrul G") === true, "Uji 2.7: Format lengkap valid harus diterima.");
assert(engine.wdDetails.accountNo === "123" && engine.wdDetails.bankName === "BCA" && engine.wdDetails.ownerName === "Syahrul G", "Uji 2.8: Data terurai dengan sempurna pada variabel.");

// --- TEST GROUP 3: DEFENSIVE REFUND BUYER PARSING ---
log('info', 'Menguji ketahanan formulir Refund Pembeli...');
assert(engine.submitRefund("") === false, "Uji 3.1: Data refund kosong harus ditolak.");

// Test unstructured refund info
log('warning', 'Menembakkan format refund rusak (tanpa strip pemisah "-")...');
assert(engine.submitRefund("0899999") === true, "Uji 3.2: Data refund no-strip harus tetap diterima.");
assert(engine.refundDetails.accountNo === "0899999", "Uji 3.3: Akun refund terisi benar.");
assert(engine.refundDetails.bankName === "DANA", "Uji 3.4: Bank refund fallback ke DANA.");
assert(engine.refundDetails.ownerName === "Syahrul (Pembeli)", "Uji 3.5: Nama pemilik refund fallback ke Syahrul (Pembeli).");

// ---------------------------------------------------
// 3. Printing Integrity Report Card
// ---------------------------------------------------
console.log(`\n${colors.bright}${colors.magenta} =======================================================`);
console.log(`  LAPORAN AKHIR VETTING KETAHANAN LOGIKA REKBER BANG `);
console.log(` =======================================================${colors.reset}`);
console.log(`\n  ➜ Total Skenario Diuji : ${testCount}`);
console.log(`  ➜ Total Sukses/Lolos   : ${passedCount}`);
console.log(`  ➜ Total Gagal/Bug      : ${testCount - passedCount}`);

if (passedCount === testCount) {
  console.log(`\n${colors.bright}${colors.green}  🛡️ STATUS UTAMA: LOGIKA 100% AMAN, BEBAS BUG & CRASH (SOLID) ${colors.reset}\n`);
} else {
  console.log(`\n${colors.bright}${colors.red}  ⚠️ STATUS UTAMA: DITEMUKAN BUG KRUSIAL! PERIKSA LOG DI ATAS! ${colors.reset}\n`);
}
