// vite.config.js - OPTIMIZED VERSION
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react({
        // Enable Fast Refresh
        fastRefresh: true,
        // Optimize JSX runtime
        jsxRuntime: 'automatic',
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

      // Enable minification (using esbuild - default, faster and no extra dependency)
      minify: 'esbuild',

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
      port: 3001,
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
    },

    // Environment variables
    define: {
      'process.env.APPLITOOLS_API_KEY': JSON.stringify(env.APPLITOOLS_API_KEY || '')
    }
  };
});
