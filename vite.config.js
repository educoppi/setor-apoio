import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiUrl = env.API_URL || 'http://10.110.18.11:10901'

  return {
    plugins: [react()],
    // Expõe ao front o endereço real da API para montar links absolutos (ex.: fotoUrl).
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    server: {
      // A API não libera CORS para o servidor de desenvolvimento, então as
      // chamadas a /api passam por este proxy (sem o cabeçalho Origin).
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
          },
        },
      },
    },
  }
})
