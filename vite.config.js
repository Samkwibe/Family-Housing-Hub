// vite.config.js - OPTIMIZED VERSION
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh
      fastRefresh: true,
      // Optimize JSX runtime
      jsxRuntime: 'automatic',
      // Babel config for better optimization
      babel: {
        plugins: [
          // Remove console logs in production
          process.env.NODE_ENV === 'production' && 'transform-remove-console'
        ].filter(Boolean)
      }
    })
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  // Build optimizations
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2015',
    
    // Enable minification
    minify: 'terser',
    
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    
    // Chunk splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          // React and related libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Firebase
          'firebase-vendor': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage'
          ],
          
          // UI libraries
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
          
          // Date utilities if you use them
          // 'date-vendor': ['date-fns']
        }
      }
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Source maps for production debugging (disable if not needed)
    sourcemap: false,
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Optimize assets
    assetsInlineLimit: 4096 // 4kb
  },

  // Development server
  server: {
    port: 3000,
    open: true,
    cors: true,
    // Enable HMR
    hmr: {
      overlay: true
    }
  },

  // Preview server
  preview: {
    port: 4173,
    open: true
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage'
    ],
    exclude: ['@firebase/app-check']
  },

  // Performance hints
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
});