// Integração com a API de WhatsApp
// O endpoint será configurado via variável de ambiente WHATSAPP_API_URL

interface WhatsAppMessagePayload {
  phone: string
  message: string
}

interface WhatsAppApiResponse {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia uma mensagem de texto via WhatsApp
 */
export async function sendWhatsAppMessage(
  payload: WhatsAppMessagePayload
): Promise<WhatsAppApiResponse> {
  const apiUrl = process.env.WHATSAPP_API_URL
  const apiToken = process.env.WHATSAPP_API_TOKEN

  if (!apiUrl) {
    console.warn('[WhatsApp] WHATSAPP_API_URL não configurada, mensagem não enviada')
    return { success: false, error: 'API URL não configurada' }
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[WhatsApp] Erro na API:', response.status, errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const data = (await response.json()) as WhatsAppApiResponse
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[WhatsApp] Falha ao enviar mensagem:', message)
    return { success: false, error: message }
  }
}

/**
 * Notifica o cliente sobre o recebimento da solicitação de alteração
 */
export async function notifyClientReviewReceived(
  clientPhone: string,
  projectName?: string
): Promise<WhatsAppApiResponse> {
  const message = projectName
    ? `✅ Sua solicitação de alteração para o projeto *${projectName}* foi recebida! Em breve iniciaremos o desenvolvimento.`
    : `✅ Sua solicitação de alteração foi recebida! Em breve iniciaremos o desenvolvimento.`

  return sendWhatsAppMessage({ phone: clientPhone, message })
}

/**
 * Notifica o grupo interno sobre novo projeto em alteração
 */
export async function notifyInternalGroupReviewSubmitted(
  groupPhone: string,
  projectName: string,
  pdfUrl: string
): Promise<WhatsAppApiResponse> {
  const message =
    `🔧 Projeto *${projectName}* movido para alteração.\n` +
    `📄 PDF disponível em: ${pdfUrl}`

  return sendWhatsAppMessage({ phone: groupPhone, message })
}
