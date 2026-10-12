import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: true,
    rolldownOptions: { input: { source:'source.html', neon:'neon-source.html' } },
    assetsInlineLimit: 0
  }
});
