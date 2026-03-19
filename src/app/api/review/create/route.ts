import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { reviewSessions } from '@/lib/db/schema'
import { z } from 'zod'

// Schema de validação da requisição
const createReviewSchema = z.object({
  projectLink: z.string().url('URL do projeto inválida'),
  projectName: z.string().min(1).max(255).optional(),
  clientPhone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown
    const parsed = createReviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { projectLink, projectName, clientPhone } = parsed.data

    // Cria nova sessão de revisão (token gerado automaticamente pelo banco)
    const [session] = await db
      .insert(reviewSessions)
      .values({
        projectLink,
        projectName,
        clientPhone,
        status: 'pending',
      })
      .returning()

    if (!session) {
      throw new Error('Falha ao criar sessão')
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const reviewUrl = `${appUrl}/review/${session.token}`

    return NextResponse.json({
      success: true,
      token: session.token,
      reviewUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    console.error('[API] Erro ao criar sessão de revisão:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
