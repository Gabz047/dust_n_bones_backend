import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();


export async function sendEmail({ to, subject, html, text }) {
    console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***' : 'MISSING');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || `"Suporte" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email enviado para ${to}`);
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw new Error('Falha ao enviar email');
  }
}
