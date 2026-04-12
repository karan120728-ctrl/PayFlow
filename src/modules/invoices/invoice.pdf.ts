import PDFDocument from 'pdfkit';
import { RowDataPacket } from 'mysql2';
import { pool } from '../../config/db';
import { NotFoundError } from '../../core/errors';

export class InvoicePDFService {
  static async generate(userId: number, invoiceId: number): Promise<Buffer> {
    // Fetch full invoice + client + user data
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        invoices.id, invoices.invoice_number, invoices.amount, invoices.due_date,
        invoices.status, invoices.created_at,
        clients.name as client_name, clients.email as client_email, clients.phone as client_phone,
        users.name as user_name, users.email as user_email
      FROM invoices
      JOIN clients ON invoices.client_id = clients.id
      JOIN users ON invoices.user_id = users.id
      WHERE invoices.id = ? AND invoices.user_id = ?
    `, [invoiceId, userId]);

    if (rows.length === 0) throw new NotFoundError('Invoice not found');
    const inv = rows[0];

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── HEADER BAND ──────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 100).fill('#1e293b');

      // "PayFlow" Brand
      doc.fontSize(28).fillColor('#6366f1').font('Helvetica-Bold')
        .text('PayFlow', 50, 30);
      doc.fontSize(10).fillColor('#94a3b8').font('Helvetica')
        .text('Smart Invoice Management', 50, 62);

      // INVOICE label top-right
      doc.fontSize(28).fillColor('#ffffff').font('Helvetica-Bold')
        .text('INVOICE', 350, 30, { width: 200, align: 'right' });
      doc.fontSize(10).fillColor('#94a3b8').font('Helvetica')
        .text(inv.invoice_number, 350, 62, { width: 200, align: 'right' });

      // ── STATUS BADGE ──────────────────────────────────────────────
      const statusColors: Record<string, string> = {
        paid: '#10b981',
        pending: '#f59e0b',
        overdue: '#ef4444'
      };
      const statusColor = statusColors[inv.status] || '#94a3b8';
      doc.roundedRect(50, 115, 80, 24, 5).fill(statusColor);
      doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold')
        .text(inv.status.toUpperCase(), 50, 121, { width: 80, align: 'center' });

      // Invoice date / due date
      doc.fontSize(10).fillColor('#64748b').font('Helvetica')
        .text(`Issue Date: ${new Date(inv.created_at).toLocaleDateString('en-IN')}`, 350, 118, { width: 200, align: 'right' })
        .text(`Due Date:   ${new Date(inv.due_date).toLocaleDateString('en-IN')}`, 350, 133, { width: 200, align: 'right' });

      // ── FROM / TO SECTION ────────────────────────────────────────
      doc.moveDown(3.5);
      const colY = 165;

      // FROM box
      doc.rect(50, colY, 230, 90).fill('#f8fafc').stroke('#e2e8f0');
      doc.fontSize(8).fillColor('#6366f1').font('Helvetica-Bold')
        .text('FROM', 62, colY + 10);
      doc.fontSize(12).fillColor('#0f172a').font('Helvetica-Bold')
        .text(inv.user_name, 62, colY + 24);
      doc.fontSize(10).fillColor('#475569').font('Helvetica')
        .text(inv.user_email, 62, colY + 42);

      // TO box
      doc.rect(320, colY, 230, 90).fill('#f8fafc').stroke('#e2e8f0');
      doc.fontSize(8).fillColor('#6366f1').font('Helvetica-Bold')
        .text('BILL TO', 332, colY + 10);
      doc.fontSize(12).fillColor('#0f172a').font('Helvetica-Bold')
        .text(inv.client_name, 332, colY + 24);
      doc.fontSize(10).fillColor('#475569').font('Helvetica')
        .text(inv.client_email || '—', 332, colY + 42)
        .text(inv.client_phone || '', 332, colY + 58);

      // ── ITEMS TABLE ───────────────────────────────────────────────
      const tableTop = colY + 110;

      // Header row
      doc.rect(50, tableTop, 500, 28).fill('#1e293b');
      doc.fontSize(10).fillColor('#94a3b8').font('Helvetica-Bold')
        .text('Description', 62, tableTop + 9)
        .text('Amount', 300, tableTop + 9, { width: 240, align: 'right' });

      // Single item row  
      const rowY = tableTop + 28;
      doc.rect(50, rowY, 500, 36).fill('#f8fafc').stroke('#e2e8f0');
      doc.fontSize(11).fillColor('#0f172a').font('Helvetica')
        .text(`Professional Services / Invoice ${inv.invoice_number}`, 62, rowY + 12);
      doc.font('Helvetica-Bold').fillColor('#1e293b')
        .text(`₹${parseFloat(inv.amount).toFixed(2)}`, 300, rowY + 12, { width: 240, align: 'right' });

      // ── TOTAL SECTION ─────────────────────────────────────────────
      const totalY = rowY + 56;
      doc.rect(350, totalY, 200, 44).fill('#1e293b');
      doc.fontSize(11).fillColor('#94a3b8').font('Helvetica')
        .text('TOTAL DUE', 362, totalY + 8);
      doc.fontSize(16).fillColor('#6366f1').font('Helvetica-Bold')
        .text(`₹${parseFloat(inv.amount).toFixed(2)}`, 362, totalY + 22, { width: 176, align: 'right' });

      // ── FOOTER ────────────────────────────────────────────────────
      const footY = 750;
      doc.rect(0, footY, doc.page.width, 50).fill('#f1f5f9');
      doc.fontSize(9).fillColor('#94a3b8').font('Helvetica')
        .text('Generated by PayFlow  •  Smart Invoice Management for Freelancers', 50, footY + 18, {
          width: doc.page.width - 100,
          align: 'center'
        });

      doc.end();
    });
  }
}
