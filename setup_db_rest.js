/*
   ==========================================================================
   REKBER BANG - SUPABASE DATABASE INITIALIZATION VIA REST API
   Uses Supabase JS client (REST) to create tables via RPC / raw SQL
   ==========================================================================
*/

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://jnnisjenjogcgzponmjl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_8oqpmh57DL6l_9KL8RVOgQ_oAcN1S2Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndSeedData() {
  console.log("Connecting to Supabase via REST API...");

  // ----- Check rekber_rooms -----
  console.log("\n[1/3] Checking 'rekber_rooms' table...");
  const { data: rooms, error: roomsError } = await supabase
    .from('rekber_rooms')
    .select('id');

  if (roomsError) {
    console.error("ERROR: Could not access rekber_rooms table:", roomsError.message);
    console.log("\n🔴 The table does not exist or is not accessible via REST.");
    console.log("   Please run the SQL below manually in your Supabase SQL Editor:");
    console.log("   https://supabase.com/dashboard/project/jnnisjenjogcgzponmjl/sql/new");
    printSQLSchema();
    return;
  }

  console.log(`   ✅ rekber_rooms found with ${rooms.length} records.`);

  if (rooms.length === 0) {
    console.log("   Seeding 5 empty rooms...");
    for (let i = 1; i <= 5; i++) {
      const { error } = await supabase.from('rekber_rooms').insert({
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
      if (error) {
        console.error(`   Error seeding room ${i}:`, error.message);
      } else {
        console.log(`   ✅ Room ${i} created.`);
      }
    }
  }

  // ----- Check rekber_stats -----
  console.log("\n[2/3] Checking 'rekber_stats' table...");
  const { data: stats, error: statsError } = await supabase
    .from('rekber_stats')
    .select('id');

  if (statsError) {
    console.error("ERROR: Could not access rekber_stats table:", statsError.message);
    console.log("   Please create this table manually in Supabase SQL Editor.");
    return;
  }

  console.log(`   ✅ rekber_stats found with ${stats.length} records.`);

  if (stats.length === 0) {
    console.log("   Seeding default statistics...");
    const { error } = await supabase.from('rekber_stats').insert({
      id: 1,
      total_volume: 34500000,
      total_transactions: 1420
    });
    if (error) {
      console.error("   Error seeding stats:", error.message);
    } else {
      console.log("   ✅ Default statistics seeded.");
    }
  }

  // ----- Check rekber_history -----
  console.log("\n[3/3] Checking 'rekber_history' table...");
  const { data: history, error: historyError } = await supabase
    .from('rekber_history')
    .select('tx_id')
    .limit(1);

  if (historyError) {
    console.error("ERROR: Could not access rekber_history table:", historyError.message);
  } else {
    console.log(`   ✅ rekber_history accessible.`);
  }

  console.log("\n=======================================================");
  console.log("  DATABASE CHECK COMPLETE!                             ");
  console.log("=======================================================\n");
}

function printSQLSchema() {
  console.log(`
=== SQL SCHEMA TO RUN IN SUPABASE SQL EDITOR ===

-- 1. rekber_rooms table
CREATE TABLE IF NOT EXISTS rekber_rooms (
  id INT PRIMARY KEY,
  buyer VARCHAR(255),
  seller VARCHAR(255),
  admin_joined BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'empty',
  tx_state VARCHAR(100) DEFAULT 'select_role',
  nominal NUMERIC DEFAULT 0,
  buyer_total NUMERIC DEFAULT 0,
  seller_total NUMERIC DEFAULT 0,
  buyer_uploaded_receipt BOOLEAN DEFAULT FALSE,
  admin_uploaded_receipt BOOLEAN DEFAULT FALSE,
  wd_account TEXT DEFAULT '',
  buyer_done BOOLEAN DEFAULT FALSE,
  seller_done BOOLEAN DEFAULT FALSE,
  chat_logs TEXT DEFAULT '{"buyer":[],"seller":[],"admin":[]}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
INSERT INTO rekber_rooms (id) VALUES (1),(2),(3),(4),(5) ON CONFLICT DO NOTHING;

-- 2. rekber_stats table  
CREATE TABLE IF NOT EXISTS rekber_stats (
  id INT PRIMARY KEY,
  total_volume NUMERIC DEFAULT 34500000,
  total_transactions INT DEFAULT 1420
);
INSERT INTO rekber_stats (id, total_volume, total_transactions) 
VALUES (1, 34500000, 1420) ON CONFLICT DO NOTHING;

-- 3. rekber_history table
CREATE TABLE IF NOT EXISTS rekber_history (
  tx_id VARCHAR(50) PRIMARY KEY,
  room_name VARCHAR(50),
  buyer VARCHAR(255),
  seller VARCHAR(255),
  nominal NUMERIC,
  status VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Realtime (run in Supabase dashboard > Database > Replication)
ALTER PUBLICATION supabase_realtime ADD TABLE rekber_rooms;

================================================
`);
}

checkAndSeedData().catch(console.error);
