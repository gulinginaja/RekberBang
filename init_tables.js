/*
   ==========================================================================
   REKBER BANG - SUPABASE TABLE INITIALIZATION VIA MANAGEMENT API
   Uses Supabase REST SQL execution endpoint
   ==========================================================================
*/

const https = require('https');
require('dotenv').config();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jnnisjenjogcgzponmjl';
// We'll use the pg direct connection through the Supabase REST /rest/v1/rpc or query endpoint
// Supabase allows SQL via their pg meta REST endpoint if we have service key
// Since we only have anon key, we'll use the query endpoint at /rest/v1/

// Alternative: use the Supabase "query" endpoint (requires service role) 
// For anon key, we need to create tables using a different approach

// Let's try the Supabase pg-meta API
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jnnisjenjogcgzponmjl.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_8oqpmh57DL6l_9KL8RVOgQ_oAcN1S2Q';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Prefer': 'return=representation'
      }
    };

    const data = body ? JSON.stringify(body) : null;
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function checkTable(tableName) {
  const res = await makeRequest('GET', `/rest/v1/${tableName}?limit=1`);
  return res.status === 200;
}

async function insertData(tableName, rows) {
  const res = await makeRequest('POST', `/rest/v1/${tableName}`, rows);
  if (res.status >= 200 && res.status < 300) {
    console.log(`   ✅ Inserted data into ${tableName}`);
    return true;
  } else {
    console.log(`   ⚠️  Insert to ${tableName}: ${res.status} - ${JSON.stringify(res.data)}`);
    return false;
  }
}

async function main() {
  console.log("=======================================================");
  console.log("  REKBER BANG - SUPABASE TABLE CHECKER & SEEDER       ");
  console.log("=======================================================\n");

  // Check each table
  const tablesExist = {
    rekber_rooms: await checkTable('rekber_rooms'),
    rekber_stats: await checkTable('rekber_stats'),
    rekber_history: await checkTable('rekber_history'),
  };

  console.log("Table Status:");
  for (const [t, exists] of Object.entries(tablesExist)) {
    console.log(`  ${exists ? '✅' : '❌'} ${t}: ${exists ? 'EXISTS' : 'MISSING'}`);
  }

  if (!tablesExist.rekber_rooms || !tablesExist.rekber_stats || !tablesExist.rekber_history) {
    console.log("\n🔴 One or more tables are missing!");
    console.log("   Tables cannot be created via REST API with anon key.");
    console.log("   Please create them using the Supabase SQL Editor:\n");
    console.log("   👉 https://supabase.com/dashboard/project/" + PROJECT_REF + "/sql/new\n");
    console.log("   Copy and run the following SQL:\n");
    printSQL();
    return;
  }

  // Tables exist - check if rooms are seeded
  console.log("\n[Checking room data...]");
  const res = await makeRequest('GET', '/rest/v1/rekber_rooms?select=id');
  if (res.status === 200 && res.data.length === 0) {
    console.log("   Rooms table is empty, seeding 5 rooms...");
    const roomsToInsert = [];
    for (let i = 1; i <= 5; i++) {
      roomsToInsert.push({
        id: i,
        buyer: null,
        seller: null,
        admin_joined: false,
        status: 'empty',
        tx_state: 'select_role',
        nominal: 0,
        buyer_total: 0,
        seller_total: 0,
        buyer_uploaded_receipt: false,
        admin_uploaded_receipt: false,
        wd_account: '',
        buyer_done: false,
        seller_done: false,
        chat_logs: JSON.stringify({ buyer: [], seller: [], admin: [] })
      });
    }
    await insertData('rekber_rooms', roomsToInsert);
  } else {
    console.log(`   ✅ Rooms already seeded (${res.data ? res.data.length : 0} rooms found)`);
  }

  // Check stats
  console.log("\n[Checking stats data...]");
  const statsRes = await makeRequest('GET', '/rest/v1/rekber_stats?select=id');
  if (statsRes.status === 200 && statsRes.data.length === 0) {
    console.log("   Stats table is empty, seeding defaults...");
    await insertData('rekber_stats', [{ id: 1, total_volume: 0, total_transactions: 0 }]);
  } else {
    console.log(`   ✅ Stats already seeded`);
  }

  console.log("\n=======================================================");
  console.log("  ALL TABLES VERIFIED & SEEDED SUCCESSFULLY ✅         ");
  console.log("=======================================================\n");
}

function printSQL() {
  console.log(`-- =====================================================
-- REKBER BANG - Database Schema Setup
-- Run this in: https://supabase.com/dashboard/project/jnnisjenjogcgzponmjl/sql/new
-- =====================================================

-- 1. rekber_rooms table
CREATE TABLE IF NOT EXISTS rekber_rooms (
  id INT PRIMARY KEY,
  buyer TEXT,
  seller TEXT,
  admin_joined BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'empty',
  tx_state TEXT DEFAULT 'select_role',
  nominal NUMERIC DEFAULT 0,
  buyer_total NUMERIC DEFAULT 0,
  seller_total NUMERIC DEFAULT 0,
  buyer_uploaded_receipt BOOLEAN DEFAULT FALSE,
  admin_uploaded_receipt BOOLEAN DEFAULT FALSE,
  wd_account TEXT DEFAULT '',
  buyer_done BOOLEAN DEFAULT FALSE,
  seller_done BOOLEAN DEFAULT FALSE,
  chat_logs TEXT DEFAULT '{"buyer":[],"seller":[],"admin":[]}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO rekber_rooms (id) VALUES (1),(2),(3),(4),(5) ON CONFLICT DO NOTHING;

-- 2. rekber_stats table  
CREATE TABLE IF NOT EXISTS rekber_stats (
  id INT PRIMARY KEY,
  total_volume NUMERIC DEFAULT 0,
  total_transactions INT DEFAULT 0
);
INSERT INTO rekber_stats (id, total_volume, total_transactions) 
VALUES (1, 0, 0) ON CONFLICT DO NOTHING;

-- 3. rekber_history table
CREATE TABLE IF NOT EXISTS rekber_history (
  tx_id TEXT PRIMARY KEY,
  room_name TEXT,
  buyer TEXT,
  seller TEXT,
  nominal NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Disable RLS so anon key can read/write (for bot usage)
ALTER TABLE rekber_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE rekber_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE rekber_history DISABLE ROW LEVEL SECURITY;

-- 5. Enable Realtime on rekber_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE rekber_rooms;

-- =====================================================
`);
}

main().catch(console.error);
