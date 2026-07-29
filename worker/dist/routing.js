"use strict";
// Mirrors lib/routing.ts in the Next.js app. The worker is a standalone
// package (deployed separately to Railway) and can't import from '@/lib',
// so this logic is duplicated here. Keep both files in sync.
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWebhookUrl = resolveWebhookUrl;
exports.resolveRoute = resolveRoute;
function resolveWebhookUrl(payload, config, developerWebhookUrl) {
    return resolveRoute(payload, config, developerWebhookUrl).webhookUrl;
}
function resolveRoute(payload, config, developerWebhookUrl) {
    if (!config || !config.rules || config.rules.length === 0) {
        return { webhookUrl: developerWebhookUrl, matchedRuleId: null };
    }
    for (const rule of config.rules) {
        const fieldValue = payload[rule.field];
        let matches = false;
        switch (rule.operator) {
            case 'equals':
                matches = String(fieldValue) === rule.value;
                break;
            case 'not_equals':
                matches = String(fieldValue) !== rule.value;
                break;
            case 'contains':
                matches = typeof fieldValue === 'string' && fieldValue.includes(rule.value ?? '');
                break;
            case 'exists':
                matches = fieldValue !== undefined && fieldValue !== null;
                break;
        }
        if (matches)
            return { webhookUrl: rule.webhookUrl, matchedRuleId: rule.id };
    }
    return { webhookUrl: config.defaultWebhookUrl ?? developerWebhookUrl, matchedRuleId: null };
}
