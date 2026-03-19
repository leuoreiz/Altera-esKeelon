'use client'

import { useState, useRef, useCallback } from 'react'
import Toolbar, { type Tool } from './Toolbar'
import AnnotationCanvas, { type AnnotationCanvasHandle } from './AnnotationCanvas'

interface ReviewClientProps {
  token: string
  projectName?: string | null
  screenshotUrl: string
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export default function ReviewClient({
  token,
  projectName,
  screenshotUrl,
}: ReviewClientProps) {
  const [activeTool, setActiveTool] = useState<Tool>('drawing')
  const [annotationCount, setAnnotationCount] = useState(0)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const canvasRef = useRef<AnnotationCanvasHandle>(null)

  const handleAnnotationsChange = useCallback((count: number) => {
    setAnnotationCount(count)
  }, [])

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo()
  }, [])

  const handleClear = useCallback(() => {
    if (confirm('Deseja remover todas as anotações?')) {
      canvasRef.current?.clear()
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    const annotations = canvasRef.current?.getAnnotationsJSON() ?? []
    if (annotations.length === 0) return

    setSubmitState('submitting')
    setErrorMessage(null)

    try {
      // Gera imagem mesclada (screenshot + anotações) para o PDF
      const annotatedScreenshot = await canvasRef.current?.getMergedImage() ?? null

      const res = await fetch('/api/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          annotatedScreenshot,
          annotations: annotations.map((data, i) => ({
            type: inferAnnotationType(data),
            data,
            description: extractDescription(data, i + 1),
          })),
        }),
      })

      const json = (await res.json()) as { success?: boolean; error?: string }

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Erro ao enviar')
      }

      setSubmitState('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro desconhecido')
      setSubmitState('error')
    }
  }, [token])

  if (submitState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-8 bg-white rounded-2xl shadow-lg text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Enviado com sucesso!</h2>
          <p className="text-gray-500">
            Sua solicitação de alteração foi recebida. Em breve iniciaremos o desenvolvimento.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Cabeçalho */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">
          Revisão de Landing Page
          {projectName && (
            <span className="ml-2 text-sm font-normal text-gray-400">— {projectName}</span>
          )}
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Use as ferramentas abaixo para marcar as alterações desejadas na página.
        </p>
      </header>

      {/* Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onUndo={handleUndo}
        onClear={handleClear}
        onSubmit={() => void handleSubmit()}
        isSubmitting={submitState === 'submitting'}
        annotationCount={annotationCount}
      />

      {/* Mensagem de erro */}
      {submitState === 'error' && errorMessage && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-sm text-red-700">
          ⚠ {errorMessage}
        </div>
      )}

      {/* Canvas de anotações */}
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-5xl mx-auto bg-white rounded-xl shadow overflow-hidden">
          <AnnotationCanvas
            ref={canvasRef}
            screenshotUrl={screenshotUrl}
            activeTool={activeTool}
            onAnnotationsChange={handleAnnotationsChange}
          />
        </div>
      </main>
    </div>
  )
}

// Infere o tipo de anotação a partir do objeto Fabric.js serializado
function inferAnnotationType(data: object): 'drawing' | 'arrow' | 'textbox' {
  const d = data as Record<string, unknown>
  if (d['type'] === 'textbox' || d['type'] === 'i-text') return 'textbox'
  if (d['type'] === 'group') return 'arrow'
  return 'drawing'
}

// Extrai descrição legível da anotação
function extractDescription(data: object, index: number): string {
  const d = data as Record<string, unknown>
  if (typeof d['text'] === 'string' && d['text'].trim()) return d['text'].trim()
  const type = inferAnnotationType(data)
  const labels = { drawing: 'Marcação', arrow: 'Seta indicativa', textbox: 'Comentário de texto' }
  return `${labels[type]} #${index}`
}
