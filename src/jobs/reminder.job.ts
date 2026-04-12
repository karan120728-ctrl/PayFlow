import cron from 'node-cron';
import { pool } from '../config/db';
import { ReminderService } from '../modules/reminders/reminder.service';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Run every day at 00:00 (midnight)
cron.schedule('0 0 * * *', async () => {
  console.log('⏳ Running daily Smart Reminder & Escalation job...');

  try {
    // 1. Mark pending invoices past due_date as overdue (GRACE PERIOD: 24 HOURS)
    // By enforcing + INTERVAL 1 DAY, we grant a rigid 1-day grace period realistically before
    // slamming 'overdue' on a client's dashboard.
    const [updateResult] = await pool.execute<ResultSetHeader>(`
      UPDATE invoices 
      SET status = 'overdue' 
      WHERE status = 'pending' AND due_date + INTERVAL 1 DAY < CURDATE()
    `);
    console.log(`✅ Marked ${updateResult.affectedRows} invoices as overdue.`);

    // 2. Fetch all overdue invoices to evaluate escalation logic
    const [overdueRows] = await pool.execute<RowDataPacket[]>(`
      SELECT invoices.id as invoice_id, invoices.invoice_number, invoices.amount, invoices.due_date,
             clients.name as client_name, clients.email as client_email,
             DATEDIFF(CURDATE(), invoices.due_date) as days_past_due
      FROM invoices
      JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.status = 'overdue'
    `);

    let emailsSent = 0;
    
    // For each overdue, calculate appropriate stage based on days past due (Grace logic system)
    for (const invoice of overdueRows) {
      // Find the highest escalation level already sent for this invoice
      const [history] = await pool.execute<RowDataPacket[]>(`
        SELECT MAX(escalation_level) as top_level 
        FROM reminders 
        WHERE invoice_id = ? AND status = 'sent'
      `, [invoice.invoice_id]);

      const topSentLevel = history[0].top_level || 0;
      let targetTemplate: 'friendly' | 'reminder' | 'urgent' | null = null;
      let targetEscalation = 0;

      // Smart Stage Logic System
      if (invoice.days_past_due >= 6 && topSentLevel < 3) {
        targetTemplate = 'urgent';
        targetEscalation = 3;
      } else if (invoice.days_past_due >= 3 && invoice.days_past_due < 6 && topSentLevel < 2) {
        targetTemplate = 'reminder';
        targetEscalation = 2;
      } else if (invoice.days_past_due >= 1 && invoice.days_past_due < 3 && topSentLevel < 1) {
        targetTemplate = 'friendly';
        targetEscalation = 1;
      }

      // If we haven't already sent a message for this escalation block, dispatch it.
      if (targetTemplate !== null) {
        await ReminderService.dispatch(invoice, targetTemplate, 'email', targetEscalation);
        emailsSent++;
      }
    }

    console.log(`✉️ Dispatched ${emailsSent} scheduled escalation emails.`);

    // 3. RETRY SYSTEM: Sweep up FAILED emails that are ready for retry
    const [failedRows] = await pool.execute<RowDataPacket[]>(`
      SELECT reminders.id as reminder_id, reminders.invoice_id, reminders.escalation_level,
             invoices.invoice_number, invoices.amount, invoices.due_date,
             clients.name as client_name, clients.email as client_email
      FROM reminders
      JOIN invoices ON reminders.invoice_id = invoices.id
      JOIN clients ON invoices.client_id = clients.id
      WHERE reminders.status = 'failed' 
        AND reminders.next_retry_at IS NOT NULL 
        AND reminders.next_retry_at < NOW()
        AND reminders.retry_count < 3
    `);

    let retries = 0;
    for (const failed of failedRows) {
      // Map escalation level back to template
      let temp: 'friendly'|'reminder'|'urgent' = 'friendly';
      if (failed.escalation_level === 2) temp = 'reminder';
      if (failed.escalation_level === 3) temp = 'urgent';

      await ReminderService.dispatch(failed, temp, 'email', failed.escalation_level, failed.reminder_id);
      retries++;
    }

    if (retries > 0) {
      console.log(`🔄 Retried ${retries} failed notification attempts.`);
    }

  } catch (error) {
    console.error('❌ Error running daily reminder job:', error);
  }
});

console.log('✅ Cron Jobs initialized.');
