"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliverWebhook = deliverWebhook;
const crypto_1 = require("crypto");
const logger_1 = require("./logger");
function signPayload(payload, secret) {
    return 'sha256=' + (0, crypto_1.createHmac)('sha256', secret).update(payload).digest('hex');
}
async function deliverWebhook(url, payload, deliveryId, webhookSecret) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const body = JSON.stringify(payload);
    const headers = {
        'Content-Type': 'application/json',
        'X-Trickle-Event': 'registration.queued',
        'X-Trickle-Delivery': deliveryId,
    };
    // Add signature if webhook secret exists
    if (webhookSecret) {
        headers['X-Trickle-Signature'] = signPayload(body, webhookSecret);
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal,
        });
        const responseBody = await response.text().catch(() => '');
        return {
            success: response.status === 200,
            statusCode: response.status,
            responseBody: responseBody.slice(0, 1000),
        };
    }
    catch (err) {
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger_1.log.warn('deliverWebhook failed', { url, deliveryId, error: message });
        return {
            success: false,
            statusCode: isTimeout ? 408 : 0,
            responseBody: isTimeout ? 'Request timed out after 10s' : message,
        };
    }
    finally {
        clearTimeout(timeout);
    }
}
