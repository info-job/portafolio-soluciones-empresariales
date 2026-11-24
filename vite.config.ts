import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        strictPort: true,
        hmr: false,
      },
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'lucide-react',
          'recharts',
          'xlsx',
          'file-saver',
          'jspdf',
          'jspdf-autotable',
          'firebase/app',
          'firebase/auth',
          'firebase/firestore',
          'firebase/storage'
        ],
        esbuildOptions: {
          target: 'esnext'
        }
      },
      plugins: [react(), tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'esnext',
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
          output: {
            manualChunks: {
              'jde-core-vendor': ['react', 'react-dom'],
              'jde-icons': ['lucide-react'],
              'jde-charts': ['recharts'],
              'jde-data-engine': ['xlsx', 'exceljs', 'jszip', 'file-saver'],
              'jde-docs-engine': ['jspdf', 'jspdf-autotable'],
              'jde-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            }
          }
        }
      }
    };
});
