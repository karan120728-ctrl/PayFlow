import Razorpay from 'razorpay';
import crypto from 'crypto';
import { pool } from '../../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { NotFoundError } from '../../core/errors';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export class PaymentService {
  /**
   * Step 1: Create a Razorpay Order for the invoice
   * The client pays against this Order ID
   */
  static async createOrder(userId: number, invoiceId: number) {
    // Fetch invoice securely (validate ownership)
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT invoices.*, clients.name as client_name, clients.email as client_email
      FROM invoices
      JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.id = ? AND invoices.user_id = ?
    `, [invoiceId, userId]);

    if (rows.length === 0) throw new NotFoundError('Invoice not found');
    const invoice = rows[0];

    if (invoice.status === 'paid') {
      throw new Error('Invoice is already paid');
    }

    // Razorpay amounts are in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(parseFloat(invoice.amount) * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `inv_${invoice.invoice_number}`,
      notes: {
        invoice_id: String(invoiceId),
        client_name: invoice.client_name,
        invoice_number: invoice.invoice_number,
      }
    });

    return {
      order_id: order.id,
      amount: amountInPaise,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID,
      invoice_number: invoice.invoice_number,
      client_name: invoice.client_name,
      client_email: invoice.client_email,
    };
  }

  /**
   * Step 2: Verify Razorpay Signature after payment
   * This is CRITICAL — prevents fake payment confirmations
   */
  static async verifyAndCapture(
    userId: number,
    invoiceId: number,
    data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
  ) {
    // Build the verification string
    const body = `${data.razorpay_order_id}|${data.razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== data.razorpay_signature) {
      throw new Error('Payment verification failed: Invalid signature');
    }

    // Signature is valid! Mark invoice as paid
    await pool.execute<ResultSetHeader>(
      'UPDATE invoices SET status = ? WHERE id = ? AND user_id = ?',
      ['paid', invoiceId, userId]
    );

    // Log the payment record
    const [invRows] = await pool.execute<RowDataPacket[]>(
      'SELECT amount FROM invoices WHERE id = ?', [invoiceId]
    );
    const amount = parseFloat(invRows[0].amount);

    await pool.execute<ResultSetHeader>(
      'INSERT INTO payments (invoice_id, amount) VALUES (?, ?)',
      [invoiceId, amount]
    );

    return { success: true, payment_id: data.razorpay_payment_id };
  }
}
