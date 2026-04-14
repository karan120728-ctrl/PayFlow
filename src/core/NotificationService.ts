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
          html: options.html || options.text.replace(/\n/g, '<br>')
        });
        console.log(`[Notification Engine] ✅ Email sent to ${options.to}`);
        return true; 
      } else {
        // No SMTP configured — log warning clearly and return FALSE
        console.warn(`\n=================================================`);
        console.warn(`[Notification Engine] ⚠️ SMTP NOT CONFIGURED`);
        console.warn(`Cannot send email to: ${options.to}`);
        console.warn(`Subject: ${options.subject}`);
        console.warn(`Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars on your server.`);
        console.warn(`=================================================\n`);
        return false; // Return false — email was NOT sent
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
        console.warn(`\n=================================================`);
        console.warn(`[Notification Engine] ⚠️ WHATSAPP NOT CONFIGURED`);
        console.warn(`Cannot send WhatsApp to: ${to}`);
        console.warn(`Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_ID env vars.`);
        console.warn(`=================================================\n`);
        return false;
      }
    } catch (error) {
      console.error('[Notification Engine] ❌ WhatsApp Delivery Failed:', error);
      return false;
    }
  }
}
