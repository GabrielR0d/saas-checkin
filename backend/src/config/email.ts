import nodemailer from 'nodemailer'
const isConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS)
const transporter = isConfigured ? nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS! },
}) : null
export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) { console.log(`[Email Mock] To: ${to} | Subject: ${subject}`); return }
  await transporter.sendMail({ from: `"CheckIn RFID" <${process.env.SMTP_USER}>`, to, subject, html })
}
