import { neon } from '@neondatabase/serverless'

// Worker-local DB client — isolated from Next.js app
function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return neon(url)
}

export async function deductCredit(
  developerId: string,
  eventId: string
): Promise<void> {
  const sql = getDb()
  await sql`
    INSERT INTO credits (id, developer_id, amount, source, reference, created_at)
    VALUES (
      gen_random_uuid(),
      ${developerId},
      -1,
      'delivery',
      ${eventId},
      NOW()
    )
  `
}
