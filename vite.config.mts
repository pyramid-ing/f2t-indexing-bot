import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePluginDoubleshot } from 'vite-plugin-doubleshot'

// https://vitejs.dev/config/
export default defineConfig({
  root: join(__dirname, 'src/render'),
  plugins: [
    react(),
    VitePluginDoubleshot({
      type: 'electron',
      main: 'dist/main/index.cjs',
      entry: 'src/main/index.ts',
      outDir: 'dist/main',
      external: ['electron'],
      electron: {
        build: {
          config: './electron-builder.config.cjs',
        },
        preload: {
          entry: 'src/preload/index.ts',
          outDir: 'dist/preload',
        },
      },
      waitTimeout: 60000,
    }),
  ],
  resolve: {
    alias: {
      '@render': join(__dirname, 'src/render'),
      '@main': join(__dirname, 'src/main'),
    },
    // extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  base: './',
  build: {
    outDir: join(__dirname, 'dist/render'),
    emptyOutDir: true,
    // rollupOptions: {
    //   input: {
    //     main: join(__dirname, 'src/render/index.html'),
    //   },
    // },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  optimizeDeps: {
    exclude: ['@nestjs/microservices', '@nestjs/websockets', 'class-transformer', 'class-validator'],
  },
})
