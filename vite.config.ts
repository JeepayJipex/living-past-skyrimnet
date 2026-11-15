import { defineConfig } from 'vite';

export default defineConfig({
  root: 'ui',
  base: './',
  build: {
    outDir: '../build/Data/Magelight/LivingPast/views/spike',
    emptyOutDir: true,
    target: 'es2022',
    modulePreload: { polyfill: false },
  },
});
