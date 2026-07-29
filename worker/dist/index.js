"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = require("http");
const node_cron_1 = __importDefault(require("node-cron"));
const serverless_1 = require("@neondatabase/serverless");
const logger_1 = require("./logger");
const processor_1 = require("./processor");
const { UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN, DATABASE_URL } = process.env;
if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN || !DATABASE_URL) {
    logger_1.log.error('Missing required env vars');
    process.exit(1);
}
const QUEUE_KEY = 'trickle:jobs';
const POLL_INTERVAL_MS = 2000;
let lastPollAt = Date.now();
let jobsProcessed = 0;
const startedAt = Date.now();
// ── Poll Redis list for jobs via Upstash REST ──────────────────────
async function pollQueue() {
    lastPollAt = Date.now();
    try {
        // Upstash REST API: POST /pipeline for atomic rpop
        const res = await fetch(`${UPSTASH_REDIS_URL}/rpop/${encodeURIComponent(QUEUE_KEY)}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`,
            },
        });
        if (!res.ok) {
            logger_1.log.error(`Redis poll HTTP error: ${res.status}`);
            return;
        }
        const data = await res.json();
        if (!data.result)
            return;
        const job = JSON.parse(data.result);
        logger_1.log.info(`Picked up job for event ${job.eventId}`);
        await (0, processor_1.processJob)(job);
        jobsProcessed++;
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger_1.log.error(`Poll error: ${message}`);
    }
}
// ── Monthly credit allocation ──────────────────────────────────────
async function runMonthlyCreditAllocation() {
    logger_1.log.info('Running monthly credit allocation...');
    const sql = (0, serverless_1.neon)(DATABASE_URL);
    try {
        const developers = await sql `SELECT id FROM developers`;
        let count = 0;
        for (const dev of developers) {
            try {
                await sql `
          INSERT INTO credits (developer_id, amount, source, created_at)
          VALUES (${dev.id}, 10, 'monthly', NOW())
        `;
                count++;
            }
            catch (err) {
                logger_1.log.error(`Failed monthly credit for ${dev.id}`, err);
            }
        }
        logger_1.log.info(`Monthly allocation complete — ${count} developers credited +10`);
    }
    catch (err) {
        logger_1.log.error('Monthly credit allocation failed', err);
    }
}
node_cron_1.default.schedule('0 0 1 * *', () => { void runMonthlyCreditAllocation(); }, { timezone: 'UTC' });
logger_1.log.info('Monthly credit cron scheduled (1st of each month, 00:00 UTC)');
logger_1.log.info('Trickle worker started. Polling for jobs...');
setInterval(() => { void pollQueue(); }, POLL_INTERVAL_MS);
// ── Health-check HTTP server ────────────────────────────────────────
// Render's free tier only offers always-on compute for "Web Services"
// (which need to bind to $PORT and respond to HTTP), not for
// "Background Workers". This tiny server exists purely so the worker
// qualifies as a Web Service. An external uptime pinger (e.g.
// UptimeRobot) hitting GET / every few minutes keeps it from spinning
// down on Render's free tier. The actual work still happens in the
// setInterval poll loop above, this server doesn't drive it.
const PORT = process.env.PORT ?? 3000;
const server = (0, http_1.createServer)((_req, res) => {
    const secondsSincePoll = Math.round((Date.now() - lastPollAt) / 1000);
    const healthy = secondsSincePoll < 30; // poll loop should tick every 2s
    res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: healthy ? 'ok' : 'stalled',
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        secondsSinceLastPoll: secondsSincePoll,
        jobsProcessed,
    }));
});
server.listen(PORT, () => {
    logger_1.log.info(`Health-check server listening on port ${PORT}`);
});
async function shutdown(signal) {
    logger_1.log.warn(`${signal} received — shutting down`);
    server.close();
    process.exit(0);
}
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });
