import { describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATES } from './defaultTemplates';
import { verificarVariaveisXml } from '../utils/xmlEditorCompletions';

/**
 * Os modelos que vêm no app são XML de verdade e passam pelo mesmo aviso de variável do
 * editor. Depois de a leitura das colunas da tabela ser corrigida (antes nenhuma coluna era
 * lida), este teste garante que os modelos embutidos não acendem aviso nenhum — nem de
 * variável usada sem declaração, nem de campo declarado sem uso.
 */
describe('modelos embutidos — nenhum aviso de variável', () => {
  DEFAULT_TEMPLATES.forEach(modelo => {
    it(`modelo ${modelo.id} está limpo`, () => {
      expect(verificarVariaveisXml(modelo.xml)).toEqual({
        usadasNaoDeclaradas: [],
        declaradasNaoUsadas: [],
      });
    });
  });
});
