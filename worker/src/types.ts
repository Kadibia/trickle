export interface QueueJobData {
  eventId: string
  developerId: string
  webhookUrl: string
  webhookSecret?: string | null
  payload: unknown
  dripRate: number
}
