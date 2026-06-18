import { eq } from 'drizzle-orm'
import { db } from './index'
import { developers, type Developer, type NewDeveloper } from './schema'
import { generateApiKey, hashApiKey } from '@/lib/api-keys'

export async function createDeveloper(
  data: Omit<NewDeveloper, 'apiKeyHash'>
): Promise<{ developer: Developer; rawApiKey: string }> {
  const rawApiKey = generateApiKey()
  const apiKeyHash = hashApiKey(rawApiKey)

  const [developer] = await db
    .insert(developers)
    .values({ ...data, apiKeyHash })
    .returning()

  return { developer, rawApiKey }
}

export async function getDeveloperByEmail(
  email: string
): Promise<Developer | undefined> {
  return db.query.developers.findFirst({
    where: eq(developers.email, email),
  })
}

export async function getDeveloperById(
  id: string
): Promise<Developer | undefined> {
  return db.query.developers.findFirst({
    where: eq(developers.id, id),
  })
}

export async function getDeveloperByApiKeyHash(
  apiKeyHash: string
): Promise<Developer | undefined> {
  return db.query.developers.findFirst({
    where: eq(developers.apiKeyHash, apiKeyHash),
  })
}

export async function updateApiKey(
  developerId: string
): Promise<{ rawApiKey: string }> {
  const rawApiKey = generateApiKey()
  const apiKeyHash = hashApiKey(rawApiKey)

  await db
    .update(developers)
    .set({ apiKeyHash })
    .where(eq(developers.id, developerId))

  return { rawApiKey }
}

export async function revokeApiKey(developerId: string): Promise<void> {
  await db
    .update(developers)
    .set({ apiKeyHash: null })
    .where(eq(developers.id, developerId))
}

export async function updateDeveloperSettings(
  id: string,
  data: { webhookUrl?: string; dripRate?: number }
): Promise<Developer> {
  const [updated] = await db
    .update(developers)
    .set(data)
    .where(eq(developers.id, id))
    .returning()
  return updated
}

export async function getAllActiveDevelopers(): Promise<Developer[]> {
  return db.select().from(developers)
}
