import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';

export const generateInvoiceNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM invoices WHERE YEAR(created_at) = ?',
    [currentYear]
  );
  
  const count = rows[0].count + 1;
  const paddedCount = count.toString().padStart(3, '0');
  
  return `INV-${currentYear}-${paddedCount}`;
};
