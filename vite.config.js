import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5.2 still uses @import and global built-ins internally,
        // which Dart Sass flags as deprecated. Silence warnings that come from
        // dependencies only; our own SCSS is still checked.
        quietDeps: true,
      },
    },
  },
  build: {
    outDir: 'build',
  },
  server: {
    port: 3000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    css: false,
  },
});
