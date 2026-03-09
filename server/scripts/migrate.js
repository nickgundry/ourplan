// Run once: node scripts/migrate.js
const { sql } = require("@vercel/postgres");
async function migrate() {
  console.log("Running migrations...");
  await sql`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password TEXT,
    provider TEXT NOT NULL DEFAULT 'email',
    provider_id TEXT,
    reset_token TEXT,
    reset_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`.catch(()=>{});
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'email'`.catch(()=>{});
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id TEXT`.catch(()=>{});
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`.catch(()=>{});
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ`.catch(()=>{});
  await sql`CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
    family JSONB NOT NULL DEFAULT '[]',
    meeting JSONB NOT NULL DEFAULT '{}',
    bag JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, phone TEXT NOT NULL, relation TEXT,
    outside BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS beacons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION, queued BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beacon_id UUID REFERENCES beacons(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS plans_share_token_idx ON plans(share_token)`.catch(()=>{});
  await sql`CREATE INDEX IF NOT EXISTS beacons_user_id_idx ON beacons(user_id)`.catch(()=>{});
  await sql`CREATE INDEX IF NOT EXISTS users_provider_idx ON users(provider, provider_id)`.catch(()=>{});
  console.log("✓ Migrations complete"); process.exit(0);
}
migrate().catch(e => { console.error("Migration failed:", e); process.exit(1); });
