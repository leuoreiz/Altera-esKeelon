'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'send' | 'verify'
type LoadState = 'idle' | 'loading' | 'error'

export default function LoginClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('send')
  const [code, setCode] = useState('')
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'operacionalipplead@gmail.com'

  const handleSendOtp = async () => {
    setLoadState('loading')
    setError(null)

    try {
      const res = await fetch('/api/admin/send-otp', { method: 'POST' })
      const json = (await res.json()) as { success?: boolean; error?: string; devCode?: string }

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Erro ao enviar código')
      }

      if (json.devCode) setDevCode(json.devCode)
      setStep('verify')
      setLoadState('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setLoadState('error')
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return

    setLoadState('loading')
    setError(null)

    try {
      const res = await fetch('/api/admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const json = (await res.json()) as { success?: boolean; error?: string }

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Código inválido')
      }

      router.push('/admin')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setLoadState('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-xl font-bold text-gray-900">Acesso Administrativo</h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de Revisão de Landing Pages</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          {step === 'send' ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-600">
                Um código de 6 dígitos será enviado para:
              </p>
              <p className="font-mono text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                {adminEmail}
              </p>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  ⚠ {error}
                </p>
              )}

              <button
                onClick={() => void handleSendOtp()}
                disabled={loadState === 'loading'}
                className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loadState === 'loading' ? 'Enviando...' : 'Enviar código de acesso'}
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleVerifyOtp(e)} className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">
                  Código enviado para <span className="font-semibold">{adminEmail}</span>
                </p>
                <p className="text-xs text-gray-400">Válido por 10 minutos</p>
              </div>

              {devCode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-center">
                  <p className="text-xs text-yellow-700 font-medium">Modo teste — seu código:</p>
                  <p className="text-2xl font-mono font-bold text-yellow-800 tracking-widest mt-1">{devCode}</p>
                </div>
              )}

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">
                  ⚠ {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loadState === 'loading' || code.length !== 6}
                className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loadState === 'loading' ? 'Verificando...' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('send'); setCode(''); setError(null); setLoadState('idle') }}
                className="w-full text-sm text-gray-400 hover:text-gray-600"
              >
                Reenviar código
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
