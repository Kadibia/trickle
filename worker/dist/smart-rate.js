"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordResponseTime = recordResponseTime;
exports.getEffectiveRate = getEffectiveRate;
exports.saveEffectiveRate = saveEffectiveRate;
exports.getP95 = getP95;
const serverless_1 = require("@neondatabase/serverless");
// Tracks response times and adjusts effective drip rate automatically
// Uses a sliding window of last 20 deliveries per developer
const RESPONSE_TIMES = new Map();
const EFFECTIVE_RATES = new Map();
const MAX_HISTORY = 20;
const P95_SLOW_THRESHOLD_MS = 3000; // slow down if p95 > 3s
const P95_FAST_THRESHOLD_MS = 500; // speed up if p95 < 500ms
const RATE_DECREASE_FACTOR = 0.5; // halve on slow
const RATE_INCREASE_FACTOR = 1.25; // +25% on fast
const MIN_RATE = 1;
const MAX_MULTIPLIER = 1.0; // never exceed configured rate
function getDb() {
    const url = process.env.DATABASE_URL;
    if (!url)
        throw new Error('DATABASE_URL is not set');
    return (0, serverless_1.neon)(url);
}
function percentile(sorted, p) {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}
function recordResponseTime(developerId, responseTimeMs) {
    const history = RESPONSE_TIMES.get(developerId) ?? [];
    history.push(responseTimeMs);
    if (history.length > MAX_HISTORY)
        history.shift();
    RESPONSE_TIMES.set(developerId, history);
}
function getEffectiveRate(developerId, configuredRate) {
    const history = RESPONSE_TIMES.get(developerId) ?? [];
    // Not enough data — use configured rate
    if (history.length < 5)
        return configuredRate;
    const sorted = [...history].sort((a, b) => a - b);
    const p95 = percentile(sorted, 95);
    let currentRate = EFFECTIVE_RATES.get(developerId) ?? configuredRate;
    if (p95 > P95_SLOW_THRESHOLD_MS) {
        // Server is slow — reduce rate
        currentRate = Math.max(MIN_RATE, Math.floor(currentRate * RATE_DECREASE_FACTOR));
    }
    else if (p95 < P95_FAST_THRESHOLD_MS) {
        // Server is fast — increase rate toward configured max
        const maxRate = configuredRate * MAX_MULTIPLIER;
        currentRate = Math.min(maxRate, Math.ceil(currentRate * RATE_INCREASE_FACTOR));
    }
    EFFECTIVE_RATES.set(developerId, currentRate);
    return currentRate;
}
async function saveEffectiveRate(developerId, rate) {
    try {
        const sql = getDb();
        await sql `
      UPDATE developers
      SET drip_rate = ${rate}
      WHERE id = ${developerId}
    `;
    }
    catch {
        // Non-fatal — in-memory rate still applies
    }
}
function getP95(developerId) {
    const history = RESPONSE_TIMES.get(developerId) ?? [];
    if (history.length < 3)
        return null;
    const sorted = [...history].sort((a, b) => a - b);
    return percentile(sorted, 95);
}
