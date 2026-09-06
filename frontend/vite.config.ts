import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'PraatNederlands B1-B2 AI Tutor',
          short_name: 'PraatNederlands',
          description: 'Interactive Dutch conversational tutor with speech recognition, role-play scenarios, and real-time grammar corrections.',
          theme_color: '#ea580c',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'portrait-primary',
          icons: [
            {
              src: '/icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        // Proxy all API requests to the Java 25 Spring Boot backend on port 8080
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
