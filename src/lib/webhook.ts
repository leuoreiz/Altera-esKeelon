// Disparo de webhook para o sistema interno

interface WebhookPayload {
  projectLink: string
  pdfUrl: string
  clientPhone?: string
  annotations: Array<{
    type: string
    description?: string
    data: unknown
  }>
}

interface WebhookResponse {
  success: boolean
  error?: string
}

/**
 * Dispara o webhook para o sistema interno informando que um projeto foi enviado para revisão
 */
export async function dispatchReviewWebhook(
  payload: WebhookPayload
): Promise<WebhookResponse> {
  const webhookUrl = process.env.INTERNAL_WEBHOOK_URL
  const webhookSecret = process.env.INTERNAL_WEBHOOK_SECRET

  if (!webhookUrl) {
    console.warn('[Webhook] INTERNAL_WEBHOOK_URL não configurada, webhook não disparado')
    return { success: false, error: 'URL do webhook não configurada' }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookSecret ? { 'X-Webhook-Secret': webhookSecret } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Webhook] Erro na requisição:', response.status, errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[Webhook] Falha ao disparar webhook:', message)
    return { success: false, error: message }
  }
}
