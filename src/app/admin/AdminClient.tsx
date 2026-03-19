'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SessionCreated {
  token: string
  reviewUrl: string
}

type FormState = 'idle' | 'loading' | 'success' | 'error'

export default function AdminClient() {
  const router = useRouter()
  const [projectLink, setProjectLink] = useState('')
  const [projectName, setProjectName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionCreated | null>(null)
  const [copied, setCopied] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState('loading')
    setError(null)

    try {
      const res = await fetch('/api/review/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectLink: projectLink.trim(),
          projectName: projectName.trim() || undefined,
          clientPhone: clientPhone.trim() || undefined,
        }),
      })

      const json = (await res.json()) as {
        success?: boolean
        token?: string
        reviewUrl?: string
        error?: string
      }

      if (!res.ok || !json.reviewUrl) {
        throw new Error(json.error ?? 'Erro ao criar sessão')
      }

      setSession({ token: json.token!, reviewUrl: json.reviewUrl })
      setFormState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setFormState('error')
    }
  }

  const handleCopy = async () => {
    if (!session) return
    await navigator.clipboard.writeText(session.reviewUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setProjectLink('')
    setProjectName('')
    setClientPhone('')
    setFormState('idle')
    setError(null)
    setSession(null)
    setCopied(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header com logout */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs text-gray-400 font-mono">Admin</span>
          <button
            onClick={() => void handleLogout()}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Sair →
          </button>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Gerar Link de Revisão</h1>
          <p className="text-gray-500 text-sm mt-1">
            Crie um link único para o cliente anotar a landing page
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          {formState !== 'success' ? (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {/* URL da LP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL da Landing Page <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={projectLink}
                  onChange={(e) => setProjectLink(e.target.value)}
                  placeholder="https://cliente.com.br/landing"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Nome do projeto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Projeto
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ex: Landing Page Verão 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* WhatsApp do cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp do Cliente
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="5511999999999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Formato internacional sem + (ex: 5511999999999)
                </p>
              </div>

              {/* Erro */}
              {formState === 'error' && error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  ⚠ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={formState === 'loading'}
                className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {formState === 'loading' ? 'Gerando link...' : 'Gerar Link de Revisão'}
              </button>
            </form>
          ) : (
            /* Tela de sucesso */
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">🔗</div>
                <h2 className="font-bold text-gray-900">Link gerado com sucesso!</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Envie este link para o cliente anotar a página.
                </p>
              </div>

              {/* Link gerado */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1 font-medium">Link do cliente</p>
                <p className="text-sm text-blue-600 break-all font-mono">
                  {session?.reviewUrl}
                </p>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleCopy()}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  {copied ? '✓ Copiado!' : 'Copiar link'}
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  Criar outro
                </button>
              </div>

              {/* Token para referência */}
              <p className="text-xs text-gray-300 text-center font-mono">
                Token: {session?.token}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
