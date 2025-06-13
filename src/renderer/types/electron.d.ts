export interface IElectronAPI {
  getBackendPort: () => Promise<number>
  openExternal: (url: string) => void
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
