import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ── Better Auth tables ────────────────────────────────────────────
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── Trickle tables ────────────────────────────────────────────────
export const developers = pgTable('developers', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull().default(''),
  apiKeyHash: text('api_key_hash').unique(),
  webhookUrl: text('webhook_url'),
  webhookSecret: text('webhook_secret'),
  dripRate: integer('drip_rate').default(10).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const credits = pgTable('credits', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  developerId: text('developer_id')
    .references(() => developers.id, { onDelete: 'cascade' })
    .notNull(),
  amount: integer('amount').notNull(),
  source: text('source').notNull(),
  reference: text('reference'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const queueEvents = pgTable('queue_events', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  developerId: text('developer_id')
    .references(() => developers.id, { onDelete: 'cascade' })
    .notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').default('queued').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  eventId: text('event_id')
    .references(() => queueEvents.id, { onDelete: 'cascade' })
    .notNull(),
  attempt: integer('attempt').notNull(),
  statusCode: integer('status_code'),
  responseBody: text('response_body'),
  attemptedAt: timestamp('attempted_at').defaultNow().notNull(),
})

// ── Inferred types ────────────────────────────────────────────────
export type Developer = typeof developers.$inferSelect
export type NewDeveloper = typeof developers.$inferInsert
export type Credit = typeof credits.$inferSelect
export type NewCredit = typeof credits.$inferInsert
export type QueueEvent = typeof queueEvents.$inferSelect
export type NewQueueEvent = typeof queueEvents.$inferInsert
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert
