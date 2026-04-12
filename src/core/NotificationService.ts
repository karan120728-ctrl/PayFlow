import axios from 'axios';
import { transporter } from '../config/mail';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class NotificationService {
  static async sendEmail(options: SendMailOptions): Promise<boolean> {
    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER;

    try {
      if (hasSmtpConfig) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"PayFlow Alerts" <noreply@payflow.local>',
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html
        });
        return true; 
      } else {
        // Fallback for Development Environment: Log cleanly instead of crashing
        console.log(`\n=================================================`);
        console.log(`[Notification Engine Fallback]`);
        console.log(`✉️ MOCK EMAIL DISPATCHED`);
        console.log(`TO: ${options.to}`);
        console.log(`SUBJECT: ${options.subject}`);
        console.log(`BODY:\n${options.text}`);
        console.log(`=================================================\n`);
        return true; // Simulate success to proceed with DB tracking
      }
    } catch (error) {
      console.error('[Notification Engine] ❌ Email Delivery Failed:', error);
      return false; 
    }
  }

  static async sendWhatsApp(to: string, message: string): Promise<boolean> {
    const hasWhatsAppConfig = process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_ID;

    try {
      if (hasWhatsAppConfig) {
        const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
        await axios.post(url, {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to,
          type: "text",
          text: { body: message }
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        return true;
      } else {
        console.log(`\n=================================================`);
        console.log(`[Notification Engine Fallback]`);
        console.log(`📱 MOCK WHATSAPP DISPATCHED`);
        console.log(`TO: ${to}`);
        console.log(`BODY:\n${message}`);
        console.log(`=================================================\n`);
        return true;
      }
    } catch (error) {
      console.error('[Notification Engine] ❌ WhatsApp Delivery Failed:', error);
      return false;
    }
  }
}
