import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 80,
    host: true,
    allowedHosts: [
      'memeticnote.kr',
      'www.memeticnote.kr',
      '.memeticnote.kr'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // 청크 사이즈 경고 제한 (500KB -> 1MB)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 수동 청크 분리로 번들 최적화
        manualChunks: {
          // React 관련 라이브러리를 별도 청크로
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Axios를 별도 청크로
          'axios-vendor': ['axios'],
          // Tesseract.js를 별도 청크로 (큰 라이브러리)
          'tesseract-vendor': ['tesseract.js']
        }
      }
    },
    // 최적화 옵션
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 프로덕션에서 console.log 제거
        drop_debugger: true
      }
    },
    // CSS 코드 스플리팅
    cssCodeSplit: true,
    // 소스맵 비활성화 (프로덕션)
    sourcemap: false
  },
  // 최적화 옵션
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios']
  }
})
