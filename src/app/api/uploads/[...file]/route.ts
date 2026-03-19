import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

interface RouteParams {
  params: Promise<{ file: string[] }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { file } = await params
  const filename = file.join('/')

  // Bloqueia path traversal
  const safeFilename = path.basename(filename)
  const filePath = path.join(process.cwd(), 'uploads', safeFilename)

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Arquivo não encontrado', { status: 404 })
  }

  const fileBuffer = fs.readFileSync(filePath)
  const ext = path.extname(safeFilename).toLowerCase()

  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  }

  const contentType = contentTypes[ext] ?? 'application/octet-stream'

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
