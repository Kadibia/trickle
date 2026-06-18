import { eq, sql, desc, and } from 'drizzle-orm'
import { db } from './index'
import { credits, type Credit, type NewCredit } from './schema'

// Balance is ALWAYS aggregated — never read from a stored column
export async function getBalance(developerId: string): Promise<number> {
  const result = await db
    .select({ balance: sql<number>`COALESCE(SUM(${credits.amount}), 0)` })
    .from(credits)
    .where(eq(credits.developerId, developerId))
  return Number(result[0]?.balance ?? 0)
}

export async function getCreditHistory(
  developerId: string,
  limit = 50
): Promise<Credit[]> {
  return db
    .select()
    .from(credits)
    .where(eq(credits.developerId, developerId))
    .orderBy(desc(credits.createdAt))
    .limit(limit)
}

async function insertCredit(data: NewCredit): Promise<Credit> {
  const [credit] = await db.insert(credits).values(data).returning()
  return credit
}

// Idempotent — safe to call twice; only seeds if no signup row exists
export async function seedSignupCredits(developerId: string): Promise<void> {
  const existing = await db
    .select({ id: credits.id })
    .from(credits)
    .where(
      and(
        eq(credits.developerId, developerId),
        eq(credits.source, 'signup')
      )
    )
    .limit(1)

  if (existing.length > 0) return

  await insertCredit({ developerId, amount: 500, source: 'signup', reference: null })
}

export async function addMonthlyCredits(developerId: string): Promise<void> {
  await insertCredit({ developerId, amount: 10, source: 'monthly', reference: null })
}

export async function addPurchasedCredits(
  developerId: string,
  amount: number,
  reference: string
): Promise<void> {
  await insertCredit({ developerId, amount, source: 'purchase', reference })
}

// Called only after confirmed 200 webhook delivery
export async function deductDeliveryCredit(
  developerId: string,
  eventId: string
): Promise<void> {
  await insertCredit({
    developerId,
    amount: -1,
    source: 'delivery',
    reference: eventId,
  })
}
