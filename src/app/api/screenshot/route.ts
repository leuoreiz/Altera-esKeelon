import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'

const screenshotSchema = z.object({
  url: z.string().url('URL inválida'),
  token: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown
    const parsed = screenshotSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'URL inválida', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { url, token } = parsed.data

    const { launchBrowser } = await import('@/lib/browser')
    const browser = await launchBrowser()

    try {
      const page = await browser.newPage()
      await page.setViewport({ width: 1440, height: 900 })
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

      const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' })
      await browser.close()

      // Salva no disco se token fornecido (reutilizado na geração do PDF)
      if (token) {
        const uploadsDir = path.join(process.cwd(), 'uploads')
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
        const filePath = path.join(uploadsDir, `screenshot_${token}.png`)
        fs.writeFileSync(filePath, screenshotBuffer)
      }

      const base64 = Buffer.from(screenshotBuffer).toString('base64')
      return NextResponse.json({
        success: true,
        screenshot: `data:image/png;base64,${base64}`,
      })
    } catch (pageError) {
      await browser.close()
      throw pageError
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao tirar screenshot'
    console.error('[API] Erro ao gerar screenshot:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
