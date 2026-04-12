import { pool } from '../../config/db';
import { CreateClientInput, UpdateClientInput } from './client.schema';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { NotFoundError } from '../../core/errors';

export class ClientService {
  static async getAll(userId: number) {
    const [rows] = await pool.execute('SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return rows;
  }

  static sanitizePhone(phone: string | undefined): string | null {
    if (!phone) return null;
    const isInternational = phone.trim().startsWith('+');
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 0) return null;
    if (!isInternational && digits.length === 10) return '91' + digits;
    return digits;
  }

  static async create(userId: number, data: CreateClientInput) {
    const sanitizedPhone = this.sanitizePhone(data.phone);
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO clients (user_id, name, email, phone) VALUES (?, ?, ?, ?)',
      [userId, data.name, data.email || null, sanitizedPhone]
    );

    return { id: result.insertId, ...data, phone: sanitizedPhone };
  }

  static async update(userId: number, clientId: number, data: UpdateClientInput) {
    // Check if belongs to user
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM clients WHERE id = ? AND user_id = ?', [clientId, userId]);
    if (rows.length === 0) {
      throw new NotFoundError("Client not found");
    }

    const updates = [];
    const values = [];
    if (data.name) { updates.push('name = ?'); values.push(data.name); }
    if (data.email) { updates.push('email = ?'); values.push(data.email); }
    if (data.phone) { 
      const sanitized = this.sanitizePhone(data.phone);
      updates.push('phone = ?'); 
      values.push(sanitized); 
    }
    
    if (updates.length > 0) {
      values.push(clientId);
      await pool.execute(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  static async delete(userId: number, clientId: number) {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM clients WHERE id = ? AND user_id = ?', [clientId, userId]);
    if (result.affectedRows === 0) {
      throw new NotFoundError("Client not found");
    }
  }
}
