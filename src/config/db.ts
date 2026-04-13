import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs'
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'payflow_user',
  password: process.env.DB_PASSWORD || 'payflow_password',
  database: process.env.DB_NAME || 'payflow',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,

    ssl: {
    ca: fs.readFileSync('./src/certs/ca.pem') 
  }
});
