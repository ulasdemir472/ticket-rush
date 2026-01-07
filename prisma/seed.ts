import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
      console.error('❌ DATABASE_URL is not set');
      process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const sqlPath = path.join(__dirname, 'seed.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('🌱 Seeding database using pg driver...');

  try {
      // pg allows multiple statements in one query
      await pool.query(sql);
      console.log('✅ Seeding completed via pg.');
  } catch (e) {
      console.error('❌ Seeding failed:', e);
      process.exit(1);
  } finally {
      await pool.end();
  }
}

main();
