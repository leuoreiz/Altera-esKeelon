import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { reviewSessions, annotations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const annotationSchema = z.object({
  type: z.enum(['drawing', 'arrow', 'textbox']),
  data: z.record(z.unknown()),
  description: z.string().optional(),
})

const submitReviewSchema = z.object({
  token: z.string().uuid(),
  annotatedScreenshot: z.string().nullable().optional(),
  annotations: z.array(annotationSchema).min(1, 'Adicione ao menos uma anotação'),
})

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown
    const parsed = submitReviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { token, annotations: annotationItems, annotatedScreenshot } = parsed.data

    const session = await db.query.reviewSessions.findFirst({
      where: eq(reviewSessions.token, token),
    })

    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    if (session.status === 'submitted' || session.status === 'completed') {
      return NextResponse.json({ error: 'Esta sessão já foi enviada' }, { status: 409 })
    }

    // Salva anotações no banco
    await db.insert(annotations).values(
      annotationItems.map((item) => ({
        sessionId: session.id,
        type: item.type,
        data: item.data,
        description: item.description,
      }))
    )

    // Atualiza status para processing
    await db
      .update(reviewSessions)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(reviewSessions.id, session.id))

    // Responde imediatamente ao cliente
    const response = NextResponse.json({ success: true })

    // Processamento assíncrono
    void processAfterSubmit(session, annotationItems, annotatedScreenshot ?? null)

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    console.error('[API] Erro ao enviar revisão:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function processAfterSubmit(
  session: {
    id: string
    token: string
    projectLink: string
    projectName: string | null
    clientPhone: string | null
    screenshotPath: string | null
  },
  annotationItems: Array<{ type: string; description?: string; data: Record<string, unknown> }>,
  annotatedScreenshot: string | null
) {
  try {
    let screenshotBuffer: Buffer
    let imageType: 'jpeg' | 'png'

    if (annotatedScreenshot) {
      // Usa imagem mesclada enviada pelo cliente (screenshot + anotações do canvas)
      const base64Data = annotatedScreenshot.replace(/^data:image\/\w+;base64,/, '')
      screenshotBuffer = Buffer.from(base64Data, 'base64')
      imageType = annotatedScreenshot.includes('image/jpeg') ? 'jpeg' : 'png'
    } else {
      // Fallback: captura screenshot limpo via Puppeteer
      const puppeteer = await import('puppeteer')
      const browser = await puppeteer.default.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      try {
        const page = await browser.newPage()
        await page.setViewport({ width: 1440, height: 900 })
        await page.goto(session.projectLink, { waitUntil: 'networkidle2', timeout: 30000 })
        const buf = await page.screenshot({ fullPage: true, type: 'png' })
        screenshotBuffer = Buffer.from(buf)
        imageType = 'png'
      } finally {
        await browser.close()
      }
    }

    // Gera PDF e obtém URL (Blob em produção, local em dev)
    const { generateReviewPdf } = await import('@/lib/pdf')
    const { url: pdfUrl } = await generateReviewPdf({
      screenshotBuffer,
      imageType,
      annotations: annotationItems.map((a, i) => ({
        type: a.type,
        description: a.description,
        index: i + 1,
      })),
      projectName: session.projectName ?? undefined,
      sessionToken: session.token,
    })

    // Atualiza sessão com URL do PDF
    await db
      .update(reviewSessions)
      .set({ pdfPath: pdfUrl, status: 'completed', updatedAt: new Date() })
      .where(eq(reviewSessions.id, session.id))

    // Dispara webhook interno
    const { dispatchReviewWebhook } = await import('@/lib/webhook')
    await dispatchReviewWebhook({
      projectLink: session.projectLink,
      pdfUrl,
      clientPhone: session.clientPhone ?? undefined,
      annotations: annotationItems.map((a) => ({
        type: a.type,
        description: a.description,
        data: a.data,
      })),
    })

    // WhatsApp para o cliente
    const { notifyClientReviewReceived, notifyInternalGroupReviewSubmitted } =
      await import('@/lib/whatsapp')

    if (session.clientPhone) {
      await notifyClientReviewReceived(session.clientPhone, session.projectName ?? undefined)
    }

    const internalGroup = process.env.WHATSAPP_INTERNAL_GROUP
    if (internalGroup) {
      await notifyInternalGroupReviewSubmitted(
        internalGroup,
        session.projectName ?? session.projectLink,
        pdfUrl
      )
    }

    console.log(`[Submit] Sessão ${session.token} concluída. PDF: ${pdfUrl}`)
  } catch (err) {
    console.error('[Submit] Erro no processamento pós-envio:', err)
    await db
      .update(reviewSessions)
      .set({ status: 'submitted', updatedAt: new Date() })
      .where(eq(reviewSessions.id, session.id))
  }
}
