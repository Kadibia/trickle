"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processJob = processJob;
const serverless_1 = require("@neondatabase/serverless");
const logger_1 = require("./logger");
const webhook_1 = require("./webhook");
const credits_1 = require("./credits");
const smart_rate_1 = require("./smart-rate");
const routing_1 = require("./routing");
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000];
const MAX_ATTEMPTS = 3;
function getDb() {
    const url = process.env.DATABASE_URL;
    if (!url)
        throw new Error('DATABASE_URL is not set');
    return (0, serverless_1.neon)(url);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function getDeveloperWebhookInfo(developerId) {
    const sql = getDb();
    const rows = await sql `
    SELECT webhook_url, webhook_secret, drip_rate, routing_rules
    FROM developers
    WHERE id = ${developerId}
    LIMIT 1
  `;
    return {
        webhookUrl: rows[0]?.webhook_url ?? null,
        webhookSecret: rows[0]?.webhook_secret ?? null,
        dripRate: rows[0]?.drip_rate ?? 10,
        routingRules: rows[0]?.routing_rules ?? null,
    };
}
async function recordRoutingMatch(eventId, ruleId) {
    const sql = getDb();
    await sql `UPDATE queue_events SET routing_rule_id = ${ruleId} WHERE id = ${eventId}`;
}
async function markDelivered(eventId) {
    const sql = getDb();
    await sql `UPDATE queue_events SET status = 'delivered', delivered_at = NOW() WHERE id = ${eventId}`;
}
async function markFailed(eventId) {
    const sql = getDb();
    await sql `UPDATE queue_events SET status = 'failed' WHERE id = ${eventId}`;
}
async function incrementAttempts(eventId) {
    const sql = getDb();
    await sql `UPDATE queue_events SET attempts = attempts + 1 WHERE id = ${eventId}`;
}
async function recordDeliveryAttempt(eventId, attempt, statusCode, responseBody) {
    const sql = getDb();
    await sql `
    INSERT INTO webhook_deliveries (event_id, attempt, status_code, response_body, attempted_at)
    VALUES (${eventId}, ${attempt}, ${statusCode}, ${responseBody}, NOW())
  `;
}
async function processJob(job) {
    const { eventId, developerId, payload } = job;
    logger_1.log.info(`Processing event ${eventId}`, { developerId });
    let webhookUrl;
    let webhookSecret;
    let configuredRate;
    try {
        const info = await getDeveloperWebhookInfo(developerId);
        webhookSecret = info.webhookSecret;
        configuredRate = info.dripRate;
        const payloadRecord = (payload && typeof payload === 'object' ? payload : {});
        const route = (0, routing_1.resolveRoute)(payloadRecord, info.routingRules, info.webhookUrl);
        webhookUrl = route.webhookUrl;
        if (route.matchedRuleId) {
            logger_1.log.info(`Routing rule matched for ${developerId}`, { eventId, ruleId: route.matchedRuleId, webhookUrl });
            await recordRoutingMatch(eventId, route.matchedRuleId).catch((err) => logger_1.log.warn('Failed to record routing match', err));
        }
    }
    catch (err) {
        logger_1.log.error(`Failed to fetch webhook info for ${developerId}`, err);
        await markFailed(eventId).catch(() => { });
        return;
    }
    if (!webhookUrl) {
        logger_1.log.warn(`No webhookUrl for developer ${developerId}`, { eventId });
        await markFailed(eventId).catch(() => { });
        return;
    }
    // Get smart effective rate
    const effectiveRate = (0, smart_rate_1.getEffectiveRate)(developerId, configuredRate);
    const p95 = (0, smart_rate_1.getP95)(developerId);
    if (effectiveRate !== configuredRate) {
        logger_1.log.info(`Smart rate adjustment for ${developerId}`, {
            configured: configuredRate,
            effective: effectiveRate,
            p95Ms: p95,
        });
    }
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const deliveryId = `${eventId}-attempt-${attempt}`;
        logger_1.log.info(`Delivery attempt ${attempt}/${MAX_ATTEMPTS}`, { eventId, webhookUrl });
        await incrementAttempts(eventId).catch(() => { });
        const startTime = Date.now();
        const result = await (0, webhook_1.deliverWebhook)(webhookUrl, payload, deliveryId, webhookSecret);
        const responseTimeMs = Date.now() - startTime;
        // Record response time for smart rate calculation
        (0, smart_rate_1.recordResponseTime)(developerId, responseTimeMs);
        logger_1.log.info(`Attempt ${attempt} result`, {
            eventId,
            statusCode: result.statusCode,
            success: result.success,
            responseTimeMs,
        });
        await recordDeliveryAttempt(eventId, attempt, result.statusCode, result.responseBody).catch((err) => logger_1.log.warn('Failed to record delivery attempt', err));
        if (result.success) {
            await markDelivered(eventId).catch((err) => logger_1.log.error('Failed to mark delivered', err));
            await (0, credits_1.deductCredit)(developerId, eventId).catch((err) => logger_1.log.error('Failed to deduct credit', err));
            logger_1.log.info(`Event ${eventId} delivered on attempt ${attempt} in ${responseTimeMs}ms`);
            return;
        }
        if (attempt < MAX_ATTEMPTS) {
            const delay = RETRY_DELAYS_MS[attempt - 1] ?? 5_000;
            logger_1.log.warn(`Attempt ${attempt} failed (${result.statusCode}) — retrying in ${delay}ms`, { eventId });
            await sleep(delay);
        }
    }
    await markFailed(eventId).catch((err) => logger_1.log.error('Failed to mark failed', err));
    logger_1.log.error(`Event ${eventId} failed after ${MAX_ATTEMPTS} attempts`, { eventId, developerId });
}
