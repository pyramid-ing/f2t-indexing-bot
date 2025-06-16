export interface BingIndexerOptions {
  url?: string
  urls?: string[]
  siteUrl: string
}

export interface BingSubmitPayload {
  siteUrl: string
  urlList: string[]
}
