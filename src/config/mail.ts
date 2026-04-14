import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const transporter = nodemailer.createTransport(
  process.env.SMTP_HOST?.includes('gmail.com') 
    ? {
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }
    : {
        host: process.env.SMTP_HOST || 'smtp.localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }
);

// Verify connection configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('[Mail Config] ❌ SMTP Verification Failed:', error.message);
  } else {
    console.log('[Mail Config] ✅ SMTP Server is ready for real delivery.');
  }
});
