import Stripe from 'stripe'

export const CREDIT_PACKS = [
  { id: 'starter', label: 'Starter', credits: 1_000,   usdPrice: 9,   ngnPrice: 14_900 },
  { id: 'growth',  label: 'Growth',  credits: 10_000,  usdPrice: 49,  ngnPrice: 79_900 },
  { id: 'scale',   label: 'Scale',   credits: 100_000, usdPrice: 199, ngnPrice: 329_900 },
] as const

export type PackId = (typeof CREDIT_PACKS)[number]['id']
export type CreditPack = (typeof CREDIT_PACKS)[number]

export function getPackById(packId: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === packId)
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
}
