import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

const root = process.cwd();
const envPath = path.join(root, '.env');
console.log('ENV_PATH', envPath, fs.existsSync(envPath));
dotenv.config({ path: envPath });
console.log('SMTP_ENV', {
  host: !!process.env.SMTP_HOST,
  user: !!process.env.SMTP_USER,
  pass: !!process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
  port: process.env.SMTP_PORT,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { rejectUnauthorized: false },
});

const mail = {
  from: `${process.env.EMAIL_FROM_NAME || 'CamOps'} <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
  to: 'mohitpmj@gmail.com',
  subject: 'CamOps debug mail',
  text: 'CamOps debug mail',
  html: '<p>CamOps debug mail</p>',
};

try {
  const result = await transporter.sendMail(mail);
  console.log('MAIL_OK', JSON.stringify({ messageId: result.messageId, response: result.response }));
} catch (error) {
  console.error('MAIL_FAIL', error && error.message ? error.message : String(error));
  if (error && error.response) console.error('RESPONSE', error.response);
  process.exit(1);
}
