function timestamp(): string {
  return new Date().toISOString()
}

function formatData(data?: unknown): string {
  if (data === undefined) return ''
  return ' ' + (typeof data === 'object' ? JSON.stringify(data) : String(data))
}

export const log = {
  info(message: string, data?: unknown): void {
    console.log(`${timestamp()} [INFO] ${message}${formatData(data)}`)
  },
  error(message: string, data?: unknown): void {
    console.error(`${timestamp()} [ERROR] ${message}${formatData(data)}`)
  },
  warn(message: string, data?: unknown): void {
    console.warn(`${timestamp()} [WARN] ${message}${formatData(data)}`)
  },
}
