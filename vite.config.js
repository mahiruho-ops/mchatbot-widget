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
    }
  }
});