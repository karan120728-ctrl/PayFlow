import { pool } from '../../config/db';
import { SendReminderInput } from './reminder.schema';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { NotFoundError } from '../../core/errors';
import { NotificationService } from '../../core/NotificationService';

export class ReminderService {
  static templates = {
    email: {
      friendly: {
        subject: "Friendly Reminder: Upcoming Invoice {invoice_number}",
        body: "Hi {client_name},\n\nJust a friendly reminder that invoice {invoice_number} for {amount} is due on {due_date}. Please let us know if you have any questions.\n\nThank you!"
      },
      reminder: {
        subject: "Reminder: Invoice {invoice_number} is Due",
        body: "Hi {client_name},\n\nPlease note that invoice {invoice_number} for {amount} was due on {due_date}. We would appreciate your prompt payment.\n\nThank you."
      },
      urgent: {
        subject: "URGENT: Outstanding Invoice {invoice_number}",
        body: "URGENT:\n\nHi {client_name},\n\nYour invoice {invoice_number} for {amount} is overdue since {due_date}. Please process the payment immediately to avoid service interruption.\n\nThank you."
      }
    },
    whatsapp: {
      friendly: {
        body: "Hi {client_name},\n\nJust a friendly reminder that *Invoice {invoice_number}* for *₹{amount}* is due on _{due_date}_. Please let us know if you have any questions.\n\nThank you!"
      },
      reminder: {
        body: "Hi {client_name},\n\nPlease note that *Invoice {invoice_number}* for *₹{amount}* was due on _{due_date}_. We would appreciate your prompt payment.\n\nThank you."
      },
      urgent: {
        body: "*URGENT Reminder*\n\nHi {client_name},\n\nYour *Invoice {invoice_number}* for *₹{amount}* is overdue since _{due_date}_. Please process the payment immediately to avoid service interruption.\n\nThank you."
      }
    }
  };

  private static formatMessage(template: string, data: any) {
    return template
      .replace(/{client_name}/g, data.client_name)
      .replace(/{invoice_number}/g, data.invoice_number)
      .replace(/{amount}/g, parseFloat(data.amount).toFixed(2))
      .replace(/{due_date}/g, new Date(data.due_date).toLocaleDateString('en-IN'));
  }

  static async getPreviewText(userId: number, invoiceId: number, templateKey: 'friendly'|'reminder'|'urgent', type: 'email'|'whatsapp') {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT invoices.invoice_number, invoices.amount, invoices.due_date,
             clients.name as client_name
      FROM invoices
      JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.id = ? AND invoices.user_id = ?
    `, [invoiceId, userId]);

    if (rows.length === 0) throw new NotFoundError("Invoice not found");
    const data = rows[0];

    const templateSet = type === 'whatsapp' ? this.templates.whatsapp : this.templates.email;
    return this.formatMessage(templateSet[templateKey].body, data);
  }

  /**
   * Internal Delivery Mechanism with DB Tracker
   */
  static async dispatch(data: any, templateKey: 'friendly'|'reminder'|'urgent', type: 'email'|'whatsapp'|'sms', escalationLevel: number = 1, existingReminderId?: number) {
    console.log(`[ReminderService] Dispatching ${type} reminder for invoice ${data.invoice_number} (ID: ${data.invoice_id})`);
    
    // Safety check for Email recipient
    if (type === 'email' && (!data.client_email || data.client_email === 'null')) {
      console.warn(`[ReminderService] Cancelled email: Client ${data.client_name} has no email address.`);
      return { id: 0, message: 'Client does not have an email address', status: 'failed', type: 'email' };
    }

    if (type === 'sms') {
      console.warn('[ReminderService] SMS requested but not yet implemented.');
      return { id: 0, message: 'SMS placeholder', status: 'failed', type: 'sms' };
    }

    const templateSet = (type === 'whatsapp') ? this.templates.whatsapp : this.templates.email;
    const template = (templateSet as any)[templateKey];
    
    if (!template) {
      console.error(`[ReminderService] Template ${templateKey} not found for type ${type}`);
      return { id: 0, message: 'Template missing', status: 'failed', type };
    }

    const message = this.formatMessage(template.body, data);
    let isSuccess = false;

    if (type === 'whatsapp') {
      isSuccess = await NotificationService.sendWhatsApp(data.client_phone, message);
    } else {
      const subject = template.subject.replace(/{invoice_number}/g, data.invoice_number);
      isSuccess = await NotificationService.sendEmail({
        to: data.client_email,
        subject: subject,
        text: message
      });
    }

    const status = isSuccess ? 'sent' : 'failed';
    console.log(`[ReminderService] Delivery status: ${status}`);

    const nextRetry = isSuccess ? null : new Date(Date.now() + 4 * 60 * 60 * 1000); 

    if (existingReminderId) {
       console.log(`[ReminderService] Updating existing reminder ${existingReminderId}`);
       let retryQuery = `UPDATE reminders SET status = ?, message = ?, sent_at = ${isSuccess ? 'NOW()' : 'sent_at'}, retry_count = retry_count + 1`;
       const params: any[] = [status, message];
       if (!isSuccess) {
         retryQuery += `, next_retry_at = ?`;
         params.push(nextRetry);
       } else {
         retryQuery += `, next_retry_at = NULL`;
       }
       retryQuery += ` WHERE id = ?`;
       params.push(existingReminderId);

       await pool.execute(retryQuery, params);
       return { id: existingReminderId, message, status, type };
    }

    console.log(`[ReminderService] Creating new reminder record for ${type}`);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO reminders 
      (invoice_id, type, status, message, escalation_level, next_retry_at, sent_at) 
      VALUES (?, ?, ?, ?, ?, ?, ${isSuccess ? 'NOW()' : 'NULL'})`,
      [data.invoice_id, type, status, message, escalationLevel, nextRetry]
    );

    return { id: result.insertId, message, status, type };
  }

  static async sendManualReminder(userId: number, input: SendReminderInput) {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT invoices.id as invoice_id, invoices.invoice_number, invoices.amount, invoices.due_date,
             clients.name as client_name, clients.email as client_email, clients.phone as client_phone
      FROM invoices
      JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.id = ? AND invoices.user_id = ?
    `, [input.invoice_id, userId]);

    if (rows.length === 0) {
      throw new NotFoundError("Invoice not found or unauthorized");
    }

    return await this.dispatch(rows[0], input.template, input.type, 2);
  }
}
