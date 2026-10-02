import { defineConfig } from 'vitest/config';

/**
 * Configuração de testes unitários.
 *
 * Separada do `vite.config.ts` de propósito: os testes cobrem funções puras
 * (conversão DOCX -> XML e o contrato `data-word-*`), então não precisam dos plugins
 * de build (react, tailwind, singlefile, polyfills) nem do custo de montá-los.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
