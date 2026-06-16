const fs = require('fs');
const crypto = require('crypto');

// Helpers
function uuid() {
  return crypto.randomUUID();
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const numUsers = 20;
const numTx = 50;

const users = [];
// 1 Admin
users.push({
  id: '00000000-0000-0000-0000-000000000001',
  telegram_id: 1638657267,
  username: 'admin_rekber_utama',
  first_name: 'Admin Utama',
  is_admin: true,
  trust_score: 100
});

// 19 normal users
for (let i = 1; i < numUsers; i++) {
  users.push({
    id: uuid(),
    telegram_id: 100000000 + i,
    username: `user_${i}_bot`,
    first_name: `Buyer/Seller ${i}`,
    is_admin: false,
    trust_score: randInt(80, 100)
  });
}

const txStatuses = [
  'CREATED', 'WAITING_PAYMENT', 'PAYMENT_UNDER_REVIEW', 'FUNDED', 
  'DELIVERING', 'DELIVERED', 'DISPUTED', 'RELEASED', 'REFUNDED', 'CANCELLED'
];

const items = ['Akun Game', 'Jasa Desain', 'Pulsa 100k', 'Voucher', 'Source Code', 'Followers IG', 'Jasa Joki'];

const transactions = [];
const evidences = [];
const disputes = [];
const audit_logs = [];

function addLog(txId, actorId, action, metadata = {}) {
  audit_logs.push({
    id: uuid(),
    transaction_id: txId,
    actor_id: actorId,
    action,
    metadata: JSON.stringify(metadata)
  });
}

for (let i = 0; i < numTx; i++) {
  const seller = randItem(users.filter(u => !u.is_admin));
  let buyer = randItem(users.filter(u => !u.is_admin && u.id !== seller.id));
  
  const status = randItem(txStatuses);
  const amount = randInt(1, 50) * 50000; // 50k to 2.5m
  const fee = amount * 0.05;

  const txId = uuid();
  
  // If CREATED, maybe no buyer yet
  if (status === 'CREATED' && Math.random() > 0.5) {
    buyer = null;
  }

  transactions.push({
    id: txId,
    buyer_id: buyer ? buyer.id : null,
    seller_id: seller.id,
    title: `${randItem(items)} - Transaksi #${i+1}`,
    description: `Pembelian aman via Rekber Bang`,
    amount,
    fee,
    status
  });

  // History timeline based on status
  addLog(txId, seller.id, 'TRANSACTION_CREATED', { amount });

  if (buyer) {
    addLog(txId, buyer.id, 'TRANSACTION_ACCEPTED_BY_BUYER', {});
  }

  const passedStatuses = {
    'WAITING_PAYMENT': 1, 'PAYMENT_UNDER_REVIEW': 2, 'FUNDED': 3,
    'DELIVERING': 4, 'DELIVERED': 5, 'DISPUTED': 5, 'RELEASED': 6, 'REFUNDED': 6
  };

  const level = passedStatuses[status] || 0;

  if (level >= 2 && buyer) {
    addLog(txId, buyer.id, 'PAYMENT_PROOF_UPLOADED', {});
    evidences.push({
      id: uuid(),
      transaction_id: txId,
      uploaded_by: buyer.id,
      file_url: `dummy/receipt_${txId}.jpg`,
      purpose: 'PAYMENT_PROOF'
    });
  }

  if (level >= 3 && buyer) {
    addLog(txId, users[0].id, 'PAYMENT_APPROVED_BY_ADMIN', {});
  }

  if (level >= 4 && buyer) {
    addLog(txId, seller.id, 'SELLER_DELIVERY_SUBMITTED', {});
    evidences.push({
      id: uuid(),
      transaction_id: txId,
      uploaded_by: seller.id,
      file_url: `dummy/delivery_${txId}.zip`,
      purpose: 'DELIVERY_PROOF'
    });
  }

  if (level >= 5 && status !== 'DISPUTED' && status !== 'REFUNDED' && buyer) {
    addLog(txId, buyer.id, 'BUYER_CONFIRMED_DELIVERY', {});
  }

  if (status === 'DISPUTED' || status === 'REFUNDED') {
    const raiser = Math.random() > 0.5 ? buyer.id : seller.id;
    addLog(txId, raiser, 'DISPUTE_RAISED', { reason: 'Barang tidak sesuai' });
    disputes.push({
      id: uuid(),
      transaction_id: txId,
      raised_by: raiser,
      reason: 'Barang tidak sesuai / tidak bisa diakses',
      status: status === 'REFUNDED' ? 'RESOLVED_BUYER' : 'OPEN'
    });
    evidences.push({
      id: uuid(),
      transaction_id: txId,
      uploaded_by: raiser,
      file_url: `dummy/dispute_${txId}.png`,
      purpose: 'DISPUTE_EVIDENCE'
    });
  }

  if (status === 'RELEASED') {
    addLog(txId, users[0].id, 'FUNDS_RELEASED_BY_ADMIN', {});
  }
  if (status === 'REFUNDED') {
    addLog(txId, users[0].id, 'DISPUTE_RESOLVED', { resolution: 'REFUND_TO_BUYER' });
  }
}

// Write to SQL
let sql = `-- Rekber Bang Production Seed Data\n\n`;

// Users
sql += `-- USERS\n`;
users.forEach(u => {
  sql += `INSERT INTO public.users (id, telegram_id, username, first_name, is_admin, trust_score) VALUES ('${u.id}', ${u.telegram_id}, '${u.username}', '${u.first_name}', ${u.is_admin}, ${u.trust_score}) ON CONFLICT DO NOTHING;\n`;
});

sql += `\n-- TRANSACTIONS\n`;
transactions.forEach(t => {
  const buyerId = t.buyer_id ? `'${t.buyer_id}'` : `NULL`;
  sql += `INSERT INTO public.transactions (id, buyer_id, seller_id, title, description, amount, fee, status) VALUES ('${t.id}', ${buyerId}, '${t.seller_id}', '${t.title}', '${t.description}', ${t.amount}, ${t.fee}, '${t.status}') ON CONFLICT DO NOTHING;\n`;
});

sql += `\n-- EVIDENCES\n`;
evidences.forEach(e => {
  sql += `INSERT INTO public.evidences (id, transaction_id, uploaded_by, file_url, purpose) VALUES ('${e.id}', '${e.transaction_id}', '${e.uploaded_by}', '${e.file_url}', '${e.purpose}') ON CONFLICT DO NOTHING;\n`;
});

sql += `\n-- DISPUTES\n`;
disputes.forEach(d => {
  sql += `INSERT INTO public.disputes (id, transaction_id, raised_by, reason, status) VALUES ('${d.id}', '${d.transaction_id}', '${d.raised_by}', '${d.reason}', '${d.status}') ON CONFLICT DO NOTHING;\n`;
});

sql += `\n-- AUDIT LOGS\n`;
audit_logs.forEach(a => {
  sql += `INSERT INTO public.audit_logs (id, transaction_id, actor_id, action, metadata) VALUES ('${a.id}', '${a.transaction_id}', '${a.actor_id}', '${a.action}', '${a.metadata}') ON CONFLICT DO NOTHING;\n`;
});

fs.writeFileSync('supabase/seed.sql', sql);
console.log('Successfully generated supabase/seed.sql');
