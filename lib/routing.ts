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

export function resolveWebhookUrl(
  payload: Record<string, unknown>,
  config: RoutingConfig | null | undefined,
  developerWebhookUrl: string | null
): string | null {
  if (!config || !config.rules || config.rules.length === 0) {
    return developerWebhookUrl
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
    if (matches) return rule.webhookUrl
  }
  return config.defaultWebhookUrl ?? developerWebhookUrl
}
