// Envio de e-mails via Resend
// Configure RESEND_API_KEY no .env.local

import { Resend } from 'resend'

function createResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY deve estar configurado no .env.local')
  return new Resend(apiKey)
}

/**
 * Envia o código OTP para o e-mail do admin
 */
export async function sendOtpEmail(code: string): Promise<void> {
  const resend = createResend()
  const adminEmail = process.env.ADMIN_EMAIL ?? 'leonardo@keelon.com.br'

  await resend.emails.send({
    from: 'contato@keelon.com.br',
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
