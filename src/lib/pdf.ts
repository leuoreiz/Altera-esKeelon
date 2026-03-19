// Geração de PDF com screenshot anotado + lista descritiva
// Usa Vercel Blob em produção e pasta /uploads em desenvolvimento local

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

interface AnnotationItem {
  type: string
  description?: string
  index: number
}

interface GeneratePdfOptions {
  // Buffer da imagem (JPEG do canvas mesclado ou PNG do Puppeteer)
  screenshotBuffer: Buffer
  imageType: 'jpeg' | 'png'
  annotations: AnnotationItem[]
  projectName?: string
  sessionToken: string
}

interface GeneratePdfResult {
  url: string        // URL pública acessível
  localPath?: string // Preenchido apenas em dev local
}

/**
 * Gera um PDF com duas páginas:
 * - Página 1: screenshot com anotações
 * - Página 2: lista textual das anotações
 *
 * Em produção (Vercel): salva no Vercel Blob e retorna URL pública
 * Em desenvolvimento: salva em /uploads e retorna URL local
 */
export async function generateReviewPdf(
  options: GeneratePdfOptions
): Promise<GeneratePdfResult> {
  const { screenshotBuffer, imageType, annotations, projectName, sessionToken } = options

  const pdfDoc = await PDFDocument.create()

  // --- Página 1: Screenshot ---
  const screenshotImage =
    imageType === 'jpeg'
      ? await pdfDoc.embedJpg(screenshotBuffer)
      : await pdfDoc.embedPng(screenshotBuffer)

  const { width: imgWidth, height: imgHeight } = screenshotImage.scale(1)

  // Limita largura máxima ao A4 (595pt)
  const maxWidth = 595
  const scale = Math.min(1, maxWidth / imgWidth)
  const pageWidth = imgWidth * scale
  const pageHeight = imgHeight * scale

  const page1 = pdfDoc.addPage([pageWidth, pageHeight])
  page1.drawImage(screenshotImage, { x: 0, y: 0, width: pageWidth, height: pageHeight })

  // --- Página 2: Lista de anotações ---
  const page2 = pdfDoc.addPage([595, 842]) // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const margin = 50
  let y = 792

  const title = projectName ? `Revisão: ${projectName}` : 'Solicitações de Alteração'
  page2.drawText(title, { x: margin, y, size: 18, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
  y -= 30

  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  page2.drawText(`Gerado em: ${dateStr}`, { x: margin, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) })
  y -= 40

  page2.drawLine({ start: { x: margin, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
  y -= 20

  if (annotations.length === 0) {
    page2.drawText('Nenhuma anotação registrada.', { x: margin, y, size: 12, font, color: rgb(0.5, 0.5, 0.5) })
  } else {
    for (const annotation of annotations) {
      if (y < 100) break
      const typeLabel = getAnnotationTypeLabel(annotation.type)
      const text = `${annotation.index}. [${typeLabel}] ${annotation.description ?? 'Sem descrição'}`
      page2.drawText(text, { x: margin, y, size: 11, font, color: rgb(0.1, 0.1, 0.1), maxWidth: 495 })
      y -= 20
    }
  }

  const pdfBytes = await pdfDoc.save()
  const pdfBuffer = Buffer.from(pdfBytes)
  const filename = `review_${sessionToken}_${Date.now()}.pdf`

  // Vercel Blob em produção
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob')
    const blob = await put(`reviews/${filename}`, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf',
    })
    return { url: blob.url }
  }

  // Fallback local para desenvolvimento
  const fs = await import('fs')
  const path = await import('path')
  const uploadsDir = path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
  const localPath = path.join(uploadsDir, filename)
  fs.writeFileSync(localPath, pdfBuffer)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return { url: `${appUrl}/uploads/${filename}`, localPath }
}

function getAnnotationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    drawing: 'Desenho',
    arrow: 'Seta',
    textbox: 'Texto',
  }
  return labels[type] ?? type
}
