import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const transporter = nodemailer.createTransport(
  process.env.SMTP_HOST?.includes('gmail.com') 
    ? {
        service: 'gmail',
        logger: true,
        debug: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }
    : {
        host: process.env.SMTP_HOST || 'smtp.localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        logger: true,
        debug: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }
);

// Self-test and verify on startup
const selfTest = async () => {
    try {
        console.log('[Mail Config] 📬 Verifying SMTP connection...');
        await transporter.verify();
        console.log('[Mail Config] ✅ SMTP Server is ready.');

        if (process.env.SMTP_USER) {
            console.log(`[Mail Config] 🚀 Sending startup self-test email to ${process.env.SMTP_USER}...`);
            await transporter.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: process.env.SMTP_USER,
                subject: 'PayFlow System Check: Email Delivery is LIVE',
                text: 'This is an automated self-test from the PayFlow server. If you are reading this, real email delivery is working correctly!'
            });
            console.log('[Mail Config] ✅ Self-test email dispatched successfully.');
        }
    } catch (error: any) {
        console.error('[Mail Config] ❌ SMTP Diagnostic Failed:', error.message);
    }
};

selfTest();
