import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adminOtps } from '@/lib/db/schema'
import { sendOtpEmail } from '@/lib/email'

export async function POST() {
  try {
    // Gera código de 6 dígitos
    const code = String(Math.floor(100000 + Math.random() * 900000))

    // Expira em 10 minutos
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Salva no banco
    await db.insert(adminOtps).values({ code, expiresAt })

    // TODO: reativar envio por e-mail quando domínio estiver verificado no Resend
    // await sendOtpEmail(code)

    // Temporário: retorna o código direto para testes
    return NextResponse.json({ success: true, devCode: code })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar código'
    console.error('[Admin OTP] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
