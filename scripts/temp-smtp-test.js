const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve('d:/mihir\'s data/Project/cctv/Code-Assets/.env') });
const nodemailer = require('nodemailer');
const sender = `${process.env.EMAIL_FROM_NAME || 'CamOps'} <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});
console.log(JSON.stringify({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  user: process.env.SMTP_USER,
  from: sender,
  hasPass: Boolean(process.env.SMTP_PASS)
}));
transporter.sendMail({
  from: sender,
  to: process.env.SMTP_USER,
  subject: 'CamOps SMTP test',
  text: 'This is a SMTP test from CamOps.',
  html: '<p>This is a SMTP test from CamOps.</p>'
}).then((info) => {
  console.log('SMTP_SEND_OK');
  console.log('MESSAGE_ID=' + info.messageId);
}).catch((err) => {
  console.log('SMTP_SEND_FAIL');
  console.log((err && err.message) ? err.message : String(err));
  process.exit(1);
});
