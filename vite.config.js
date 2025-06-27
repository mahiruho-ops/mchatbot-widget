import { defineConfig } from 'vite';

export default defineConfig({
  base: '/mchatbot-widget/',
  build: {
    lib: {
      entry: './src/mchatbot.js',
      name: 'MChatBot',
      fileName: 'mchatbot',
      formats: ['es']
    },
    rollupOptions: {
      input: {
        main: './index.html',
        widget: './src/mchatbot.js'
      },
      output: {
        assetFileNames: 'mchatbot.[ext]',
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'main' ? 'index.js' : 'mchatbot.js';
        }
      }
    },
    // Ensure assets are properly handled
    assetsInlineLimit: 0,
    // Generate source maps for debugging
    sourcemap: true
  },
  // Development server configuration
  server: {
    port: process.env.PORT || 3333,
    headers: {
      // CORS headers for development
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  }
});