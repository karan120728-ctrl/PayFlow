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
    // const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const hasSmtpConfig = process.env.SMTP_USER && process.env.SMTP_PASS;
    if (!hasSmtpConfig) {
      console.error('[Notification Engine] ❌ SMTP Configuration Missing! Check your environment variables.');
      return false;
    }

    try {
      const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
      console.log(`[Notification Engine] ✉️ Sending email FROM: ${fromAddress} TO: ${options.to}`);
      
      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text.replace(/\n/g, '<br>')
      });
      
      console.log(`[Notification Engine] ✅ Email sent successfully! MessageId: ${info.messageId}`);
      return true; 
    } catch (error: any) {
      console.error('-------------------------------------------------');
      console.error('[Notification Engine] ❌ EMAIL DELIVERY FAILED');
      console.error(`ERROR NAME: ${error.name}`);
      console.error(`ERROR MESSAGE: ${error.message}`);
      if (error.code) console.error(`ERROR CODE: ${error.code}`);
      if (error.response) console.error(`SERVER RESPONSE: ${error.response}`);
      if (error.command) console.error(`COMMAND: ${error.command}`);
      console.error('-------------------------------------------------');
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
        console.log(`[Notification Engine] ✅ WhatsApp sent to ${to}`);
        return true;
      } else {
        console.warn(`\n=================================================`);
        console.warn(`[Notification Engine] ⚠️ WHATSAPP NOT CONFIGURED`);
        console.warn(`Cannot send WhatsApp to: ${to}`);
        console.warn(`Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_ID env vars.`);
        console.warn(`=================================================\n`);
        return false;
      }
    } catch (error: any) {
      console.error('-------------------------------------------------');
      console.error('[Notification Engine] ❌ WHATSAPP DELIVERY FAILED');
      console.error(`ERROR MESSAGE: ${error.response?.data?.error?.message || error.message}`);
      console.error('-------------------------------------------------');
      return false;
    }
  }
}
