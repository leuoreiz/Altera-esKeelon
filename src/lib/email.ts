// Envio de e-mails via Gmail SMTP (Nodemailer)
// Configure GMAIL_USER e GMAIL_APP_PASSWORD no .env.local

import nodemailer from 'nodemailer'

function createTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    throw new Error('GMAIL_USER e GMAIL_APP_PASSWORD devem estar configurados no .env.local')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

/**
 * Envia o código OTP para o e-mail do admin
 */
export async function sendOtpEmail(code: string): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'operacionalipplead@gmail.com'
  const transporter = createTransporter()

  await transporter.sendMail({
    from: `"Sistema de Revisão" <${process.env.GMAIL_USER}>`,
    to: adminEmail,
    subject: '🔑 Código de acesso — Admin',
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b; margin-bottom: 8px;">Código de acesso</h2>
        <p style="color: #64748b; margin-bottom: 24px;">
          Use o código abaixo para acessar o painel administrativo. Válido por <strong>10 minutos</strong>.
        </p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2563eb;">
            ${code}
          </span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">
          Se você não solicitou este código, ignore este e-mail.
        </p>
      </div>
    `,
  })
}
