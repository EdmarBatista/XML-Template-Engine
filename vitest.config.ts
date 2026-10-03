import { defineConfig } from 'vitest/config';

/**
 * Configuração de testes unitários.
 *
 * Separada do `vite.config.ts` de propósito: os testes cobrem funções puras
 * (conversão DOCX -> XML e o contrato `data-word-*`) e, em jsdom, o preview do
 * documento, então não precisam dos plugins de build (react, tailwind, singlefile,
 * polyfills) nem do custo de montá-los — o plugin de react entra por conta do
 * ambiente uma vez que existem testes de componente (.tsx).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
