import { buildApp } from './app';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { pool } from './config/db';
dotenv.config();

// Initialize cron jobs
import './jobs/reminder.job';

const start = async () => {
  try {
    // 1. Initialize Tables Programmatically
    const schemaFile = path.join(__dirname, '..', 'schema.sql');
    if (fs.existsSync(schemaFile)) {
      const sql = fs.readFileSync(schemaFile, 'utf8');
      await pool.query(sql);
      console.log('✅ Synchronized database tables from schema.sql');
    }

    const app = await buildApp();
    const port = parseInt(process.env.PORT || '3000');
    
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server listening on http://localhost:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};


start();
