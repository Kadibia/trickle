import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

type TrickleDb = ReturnType<typeof drizzle<typeof schema>>

let _db: TrickleDb | null = null

export function getDb(): TrickleDb {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    const sql = neon(process.env.DATABASE_URL)
    _db = drizzle(sql, { schema })
  }
  return _db
}

// Safe direct export — initializes on first import but only once
// Use this for all existing imports that expect `db`
export const db = getDb()