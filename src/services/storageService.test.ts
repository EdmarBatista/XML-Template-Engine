// @vitest-environment jsdom
// O serviço lê e escreve localStorage (preferências, templates, formulários e histórico).

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PREFERENCES, StorageService } from './storageService';
import type { TemplateItem } from '../data/defaultTemplates';

const template = (id: string): TemplateItem => ({ id, nome: `Modelo ${id}`, xml: '<documento />' } as TemplateItem);

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  // Os testes de dado corrompido provocam o aviso de DEV do próprio serviço de propósito.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('preferências', () => {
  it('devolve os padrões quando não há nada salvo', () => {
    expect(StorageService.loadPreferences()).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it('mescla o que está salvo sobre os padrões', () => {
    localStorage.setItem('edm_user_preferences', JSON.stringify({ darkMode: true, zoomA4: 150 }));

    const prefs = StorageService.loadPreferences();
    expect(prefs.darkMode).toBe(true);
    expect(prefs.zoomA4).toBe(150);
    // o que não estava salvo continua vindo do padrão
    expect(prefs.sidebarWidth).toBe(DEFAULT_USER_PREFERENCES.sidebarWidth);
    expect(prefs.activeModelModalTab).toBe('vars-edit');
  });

  it('volta aos padrões quando o dado salvo está corrompido', () => {
    localStorage.setItem('edm_user_preferences', '{isso não é json');

    expect(StorageService.loadPreferences()).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it('salva de forma incremental, sem apagar as outras preferências', () => {
    StorageService.savePreferences({ sidebarWidth: 500 });
    StorageService.savePreferences({ darkMode: true });

    const prefs = StorageService.loadPreferences();
    expect(prefs.sidebarWidth).toBe(500);
    expect(prefs.darkMode).toBe(true);
  });

  it('não deixa a falha de escrita escapar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cota excedida');
    });

    expect(() => StorageService.savePreferences({ darkMode: true })).not.toThrow();
  });
});

describe('templates customizados', () => {
  it('devolve lista vazia quando não há nada salvo', () => {
    expect(StorageService.loadCustomTemplates()).toEqual([]);
  });

  it('guarda e lê a lista de modelos', () => {
    const lista = [template('a'), template('b')];
    StorageService.saveCustomTemplates(lista);

    expect(StorageService.loadCustomTemplates()).toEqual(lista);
  });

  it('ignora conteúdo que não é lista', () => {
    localStorage.setItem('edm_custom_templates', JSON.stringify({ id: 'a' }));
    expect(StorageService.loadCustomTemplates()).toEqual([]);

    localStorage.setItem('edm_custom_templates', 'quebrado');
    expect(StorageService.loadCustomTemplates()).toEqual([]);
  });

  it('guarda e lê o id do último template', () => {
    expect(StorageService.getLastTemplateId()).toBeNull();

    StorageService.setLastTemplateId('termo-referencia');
    expect(StorageService.getLastTemplateId()).toBe('termo-referencia');
  });
});

describe('dados de formulário por template', () => {
  it('devolve objeto vazio quando não há nada salvo', () => {
    expect(StorageService.loadFormData()).toEqual({});
    expect(StorageService.loadFormData('qualquer')).toEqual({});
  });

  it('guarda por template sem apagar os outros', () => {
    StorageService.saveFormDataForTemplate('a', { nome: 'Um' });
    StorageService.saveFormDataForTemplate('b', { nome: 'Dois' });

    expect(StorageService.loadFormData('a')).toEqual({ nome: 'Um' });
    expect(StorageService.loadFormData('b')).toEqual({ nome: 'Dois' });
    expect(StorageService.loadFormData()).toEqual({ a: { nome: 'Um' }, b: { nome: 'Dois' } });
  });

  it('limpa apenas o template pedido', () => {
    StorageService.saveFormDataForTemplate('a', { nome: 'Um' });
    StorageService.saveFormDataForTemplate('b', { nome: 'Dois' });

    StorageService.clearFormDataForTemplate('a');

    expect(StorageService.loadFormData('a')).toEqual({});
    expect(StorageService.loadFormData('b')).toEqual({ nome: 'Dois' });
  });

  it('volta a vazio quando o dado salvo está corrompido', () => {
    localStorage.setItem('edm_saved_form_data', 'não é json');
    expect(StorageService.loadFormData()).toEqual({});
  });
});

describe('histórico de JSON por arquivo', () => {
  it('devolve undefined para arquivo desconhecido', () => {
    expect(StorageService.loadJsonHistory('modelo.xml')).toBeUndefined();
  });

  it('guarda, lê e remove mantendo os outros arquivos', () => {
    StorageService.saveJsonHistory('a.xml', '{"a":1}');
    StorageService.saveJsonHistory('b.xml', '{"b":2}');

    expect(StorageService.loadJsonHistory('a.xml')).toBe('{"a":1}');

    StorageService.removeJsonHistory('a.xml');
    expect(StorageService.loadJsonHistory('a.xml')).toBeUndefined();
    expect(StorageService.loadJsonHistory('b.xml')).toBe('{"b":2}');
  });

  it('não explode ao remover quando nunca houve histórico', () => {
    expect(() => StorageService.removeJsonHistory('inexistente.xml')).not.toThrow();
  });
});
