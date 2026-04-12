import { pool } from '../../config/db';
import { CreateInvoiceInput, UpdateInvoiceStatusInput } from './invoice.schema';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { NotFoundError } from '../../core/errors';
import { generateInvoiceNumber } from '../../utils/generateInvoiceNumber';

export class InvoiceService {
  static async getAll(userId: number) {
    const [rows] = await pool.execute(`
      SELECT invoices.*, clients.name as client_name, clients.phone as client_phone,
             (SELECT COUNT(*) FROM reminders WHERE invoice_id = invoices.id AND type = 'email' AND status = 'sent') as email_sent_count,
             (SELECT COUNT(*) FROM reminders WHERE invoice_id = invoices.id AND type = 'whatsapp' AND status = 'sent') as whatsapp_sent_count
      FROM invoices 
      JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.user_id = ? 
      ORDER BY invoices.created_at DESC
    `, [userId]);
    return rows;
  }

  static async getSummary(userId: number) {
    // Generate dashboard summary: Total Earned, Pending, Overdue
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT status, SUM(amount) as total 
      FROM invoices 
      WHERE user_id = ? 
      GROUP BY status
    `, [userId]);

    const summary = {
      earned: 0,
      pending: 0,
      overdue: 0
    };

    rows.forEach(r => {
      if (r.status === 'paid') summary.earned += parseFloat(r.total);
      if (r.status === 'pending') summary.pending += parseFloat(r.total);
      if (r.status === 'overdue') summary.overdue += parseFloat(r.total);
    });

    return summary;
  }

  static async create(userId: number, data: CreateInvoiceInput) {
    // Check client ownership
    const [clientRows] = await pool.execute<RowDataPacket[]>('SELECT id FROM clients WHERE id = ? AND user_id = ?', [data.client_id, userId]);
    if (clientRows.length === 0) {
      throw new NotFoundError("Client not found");
    }

    const invoiceNumber = await generateInvoiceNumber();

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO invoices (user_id, client_id, invoice_number, amount, due_date) VALUES (?, ?, ?, ?, ?)',
      [userId, data.client_id, invoiceNumber, data.amount, data.due_date]
    );

    return { 
      id: result.insertId, 
      invoice_number: invoiceNumber, 
      ...data, 
      status: 'pending' 
    };
  }

  static async updateStatus(userId: number, invoiceId: number, data: UpdateInvoiceStatusInput) {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE invoices SET status = ? WHERE id = ? AND user_id = ?',
      [data.status, invoiceId, userId]
    );

    if (result.affectedRows === 0) {
      throw new NotFoundError("Invoice not found");
    }
  }
}
