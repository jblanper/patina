import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@common': path.resolve(__dirname, './src/common'),
    },
  },
  base: './',
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './setupTests.ts',
    include: [
      '**/*.{test,spec}.?(c|m)[jt]s?(x)',
      path.resolve(__dirname, 'src/common/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)'),
      path.resolve(__dirname, 'src/main/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)'),
    ],
    coverage: {
      provider: 'v8',
      include: [
        '../../common/validation.ts',
        'hooks/useVocabularies.ts',
        'components/AutocompleteField.tsx',
        'contexts/FieldVisibilityContext.tsx',
        'components/FieldVisibilityDrawer.tsx',
        'components/CoinCard.tsx',
      ],
      thresholds: {
        '../../common/validation.ts': { branches: 100 },
        'hooks/useVocabularies.ts': { functions: 90 },
        'components/AutocompleteField.tsx': { statements: 80 },
        'contexts/FieldVisibilityContext.tsx': { functions: 90 },
        'components/FieldVisibilityDrawer.tsx': { statements: 80 },
        'components/CoinCard.tsx': { statements: 80 },
      },
    },
  },
});

