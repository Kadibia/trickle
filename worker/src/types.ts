export interface QueueJobData {
  eventId: string
  developerId: string
  webhookUrl: string
  payload: unknown
  dripRate: number
}
