import { log } from './logger'

export interface DeliveryResult {
  success: boolean
  statusCode: number
  responseBody: string
}

export async function deliverWebhook(
  url: string,
  payload: unknown,
  deliveryId: string
): Promise<DeliveryResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trickle-Event': 'registration.queued',
        'X-Trickle-Delivery': deliveryId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const responseBody = await response.text().catch(() => '')

    return {
      success: response.status === 200,
      statusCode: response.status,
      responseBody: responseBody.slice(0, 1000), // cap at 1KB
    }
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    const message = err instanceof Error ? err.message : 'Unknown error'

    log.warn(`deliverWebhook failed`, { url, deliveryId, error: message })

    return {
      success: false,
      statusCode: isTimeout ? 408 : 0,
      responseBody: isTimeout ? 'Request timed out after 10s' : message,
    }
  } finally {
    clearTimeout(timeout)
  }
}
