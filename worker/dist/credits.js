"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deductCredit = deductCredit;
const serverless_1 = require("@neondatabase/serverless");
// Worker-local DB client — isolated from Next.js app
function getDb() {
    const url = process.env.DATABASE_URL;
    if (!url)
        throw new Error('DATABASE_URL is not set');
    return (0, serverless_1.neon)(url);
}
async function deductCredit(developerId, eventId) {
    const sql = getDb();
    await sql `
    INSERT INTO credits (id, developer_id, amount, source, reference, created_at)
    VALUES (
      gen_random_uuid(),
      ${developerId},
      -1,
      'delivery',
      ${eventId},
      NOW()
    )
  `;
}
