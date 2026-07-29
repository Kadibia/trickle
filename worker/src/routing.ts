// Mirrors lib/routing.ts in the Next.js app. The worker is a standalone
// package (deployed separately to Railway) and can't import from '@/lib',
// so this logic is duplicated here. Keep both files in sync.

export interface RoutingRule {
  id: string
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'exists'
  value?: string
  webhookUrl: string
}

export interface RoutingConfig {
  rules: RoutingRule[]
  defaultWebhookUrl?: string
}

export interface ResolvedRoute {
  webhookUrl: string | null
  /** id of the rule that matched, or null if the default/fallback URL was used */
  matchedRuleId: string | null
}

export function resolveWebhookUrl(
  payload: Record<string, unknown>,
  config: RoutingConfig | null | undefined,
  developerWebhookUrl: string | null
): string | null {
  return resolveRoute(payload, config, developerWebhookUrl).webhookUrl
}

export function resolveRoute(
  payload: Record<string, unknown>,
  config: RoutingConfig | null | undefined,
  developerWebhookUrl: string | null
): ResolvedRoute {
  if (!config || !config.rules || config.rules.length === 0) {
    return { webhookUrl: developerWebhookUrl, matchedRuleId: null }
  }
  for (const rule of config.rules) {
    const fieldValue = payload[rule.field]
    let matches = false
    switch (rule.operator) {
      case 'equals':     matches = String(fieldValue) === rule.value; break
      case 'not_equals': matches = String(fieldValue) !== rule.value; break
      case 'contains':   matches = typeof fieldValue === 'string' && fieldValue.includes(rule.value ?? ''); break
      case 'exists':     matches = fieldValue !== undefined && fieldValue !== null; break
    }
    if (matches) return { webhookUrl: rule.webhookUrl, matchedRuleId: rule.id }
  }
  return { webhookUrl: config.defaultWebhookUrl ?? developerWebhookUrl, matchedRuleId: null }
}