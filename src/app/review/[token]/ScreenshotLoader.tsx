'use client'

import { useState } from 'react'
import ReviewClient from '@/components/ReviewClient'

interface ScreenshotLoaderProps {
  token: string
  projectName: string | null
  projectLink: string
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

export default function ScreenshotLoader({
  token,
  projectName,
  projectLink,
}: ScreenshotLoaderProps) {
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startScreenshot = async () => {
    setLoadState('loading')
    setError(null)

    try {
      const res = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: projectLink }),
      })

      const json = (await res.json()) as { success?: boolean; screenshot?: string; error?: string }

      if (!res.ok || !json.screenshot) {
        throw new Error(json.error ?? 'Falha ao gerar screenshot')
      }

      setScreenshotUrl(json.screenshot)
      setLoadState('loaded')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setLoadState('error')
    }
  }

  if (loadState === 'loaded' && screenshotUrl) {
    return (
      <ReviewClient
        token={token}
        projectName={projectName}
        screenshotUrl={screenshotUrl}
      />
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-8 bg-white rounded-2xl shadow-lg text-center">
        {loadState === 'idle' && (
          <>
            <div className="text-4xl mb-4">🖥</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {projectName ?? 'Revisão de Landing Page'}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Clique abaixo para carregar a página e iniciar as anotações.
            </p>
            <p className="text-xs text-gray-400 mb-6 truncate">{projectLink}</p>
            <button
              onClick={() => void startScreenshot()}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Carregar página para revisão
            </button>
          </>
        )}

        {loadState === 'loading' && (
          <>
            <div className="text-4xl mb-4 animate-spin">⟳</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Carregando página...</h2>
            <p className="text-gray-400 text-sm">Isso pode levar alguns segundos.</p>
          </>
        )}

        {loadState === 'error' && (
          <>
            <div className="text-4xl mb-4">⚠</div>
            <h2 className="text-xl font-semibold text-red-700 mb-2">Erro ao carregar</h2>
            <p className="text-red-500 text-sm mb-6">{error}</p>
            <button
              onClick={() => void startScreenshot()}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </button>
          </>
        )}
      </div>
    </div>
  )
}
