/*
   ==========================================================================
   REKBER BANG - SUPABASE DATABASE INITIALIZATION SCHEMA
   Connects to Postgres and provisions rooms, statistics, and history tables.
   ==========================================================================
*/

const { Client } = require('pg');
require('dotenv').config();

// Direct connection fallback using the password provided
const connectionString = "postgresql://postgres.jnnisjenjogcgzponmjl:Swaetczher9@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  console.log("Connecting to Supabase PostgreSQL database...");
  await client.connect();
  console.log("Connected successfully!");

  try {
    // 1. Create rekber_rooms table
    console.log("Creating table 'rekber_rooms' if not exists...");
    await client.query("DROP TABLE IF EXISTS rekber_rooms CASCADE;");
    await client.query(`
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
        wd_account VARCHAR(255) DEFAULT '',
        buyer_done BOOLEAN DEFAULT FALSE,
        seller_done BOOLEAN DEFAULT FALSE,
        chat_logs TEXT DEFAULT '{"buyer":[],"seller":[],"admin":[]}',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Pre-populate 5 rooms if empty
    const { rows: roomRows } = await client.query("SELECT COUNT(*) FROM rekber_rooms");
    const roomCount = parseInt(roomRows[0].count);
    if (roomCount === 0) {
      console.log("Pre-populating 5 empty rooms (IDs 1 to 5)...");
      for (let i = 1; i <= 5; i++) {
        await client.query("INSERT INTO rekber_rooms (id) VALUES ($1)", [i]);
      }
      console.log("Pre-populated 5 rooms successfully!");
    } else {
      console.log(`Rooms table already populated with ${roomCount} records.`);
    }

    // 3. Create rekber_history table
    console.log("Creating table 'rekber_history' if not exists...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS rekber_history (
        tx_id VARCHAR(50) PRIMARY KEY,
        room_name VARCHAR(50),
        buyer VARCHAR(255),
        seller VARCHAR(255),
        nominal NUMERIC,
        status VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create rekber_stats table
    console.log("Creating table 'rekber_stats' if not exists...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS rekber_stats (
        id INT PRIMARY KEY,
        total_volume NUMERIC DEFAULT 0,
        total_transactions INT DEFAULT 0
      );
    `);

    // Pre-populate stats if empty
    const { rows: statRows } = await client.query("SELECT COUNT(*) FROM rekber_stats");
    const statCount = parseInt(statRows[0].count);
    if (statCount === 0) {
      console.log("Pre-populating default statistics...");
      await client.query("INSERT INTO rekber_stats (id, total_volume, total_transactions) VALUES (1, 0, 0)");
    }

    // 5. Disable Row Level Security (RLS) so anon key can read/write
    console.log("Disabling Row Level Security on tables...");
    await client.query("ALTER TABLE rekber_rooms DISABLE ROW LEVEL SECURITY;");
    await client.query("ALTER TABLE rekber_stats DISABLE ROW LEVEL SECURITY;");
    await client.query("ALTER TABLE rekber_history DISABLE ROW LEVEL SECURITY;");
    console.log("Row Level Security disabled!");

    // 6. Enable Realtime Replication for rekber_rooms
    console.log("Enabling Supabase Realtime replication on 'rekber_rooms'...");
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND tablename = 'rekber_rooms'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE rekber_rooms;
        END IF;
      END $$;
    `);
    console.log("Supabase Realtime replication enabled!");

    console.log("\n=======================================================");
    console.log("  DATABASE INITIALIZATION 100% SUCCESSFUL & SOLID  ");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("Error creating database tables:", err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
