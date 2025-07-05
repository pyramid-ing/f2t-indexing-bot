import { Job as PrismaJob } from '@prisma/client'

export interface JobResult {
  message: string
  resultUrl?: string
}

export interface JobProcessor {
  process(job: any): Promise<JobResult>
  canProcess(job: PrismaJob): boolean
}
