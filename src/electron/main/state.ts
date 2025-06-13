export const appState = {
  backendPort: process.env.BACKEND_PORT ? parseInt(process.env.BACKEND_PORT, 10) : 3030,
}
