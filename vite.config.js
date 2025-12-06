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
          manualChunks: (id) => {
            // React and related libraries
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            
            // Firebase
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            
            // UI libraries
            if (id.includes('lucide-react') || id.includes('react-hot-toast')) {
              return 'ui-vendor';
            }
            
            // Stream Chat
            if (id.includes('stream-chat')) {
              return 'stream-vendor';
            }
            
            // Stripe
            if (id.includes('stripe')) {
              return 'stripe-vendor';
            }
            
            // Large node_modules
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
          // Optimize chunk names
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
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

    // Additional optimizations
    esbuild: {
      // Drop console and debugger in production
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },

    // Environment variables
    define: {
      'process.env.APPLITOOLS_API_KEY': JSON.stringify(env.APPLITOOLS_API_KEY || '')
    }
  };
});
