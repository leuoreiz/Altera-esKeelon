import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adminOtps } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { SignJWT } from 'jose'
import { z } from 'zod'

const verifySchema = z.object({
  code: z.string().length(6),
})

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret) throw new Error('ADMIN_JWT_SECRET não configurado')
  return new TextEncoder().encode(secret)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown
    const parsed = verifySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    const { code } = parsed.data

    // Busca OTP válido (não usado e não expirado)
    const otp = await db.query.adminOtps.findFirst({
      where: and(
        eq(adminOtps.code, code),
        eq(adminOtps.used, false),
        gt(adminOtps.expiresAt, new Date())
      ),
    })

    if (!otp) {
      return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 401 })
    }

    // Marca como usado
    await db.update(adminOtps).set({ used: true }).where(eq(adminOtps.id, otp.id))

    // Gera JWT com validade de 8 horas
    const token = await new SignJWT({ admin: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(getJwtSecret())

    const response = NextResponse.json({ success: true })

    // Define cookie httpOnly
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas em segundos
      path: '/',
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao verificar código'
    console.error('[Admin Verify] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
