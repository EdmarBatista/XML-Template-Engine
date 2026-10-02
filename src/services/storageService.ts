/**
 * Serviço de Gerenciamento Unificado de Armazenamento Local (LocalStorage).
 * Centraliza a leitura, gravação, defaults e migrações de preferências de interface,
 * modelos personalizados e dados preenchidos de formulários.
 */

import type { DadosDocumento } from '../types';

import { TemplateItem } from '../data/defaultTemplates';

export interface UserPreferences {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  toolbarLateral: boolean;
  darkMode: boolean;
  irParaCampoAtivo: boolean;
  irParaDocumentoAtivo: boolean;
  edicaoInline: boolean;
  variaveisVermelhasWord: boolean;
  numeracaoAtiva: boolean;
  modoA4: boolean;
  zoomA4: number;
  zoomFluido: number;
  activeModelModalTab: string;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  sidebarWidth: 380,
  sidebarCollapsed: false,
  toolbarLateral: false,
  darkMode: false,
  irParaCampoAtivo: true,
  irParaDocumentoAtivo: true,
  edicaoInline: true,
  variaveisVermelhasWord: true,
  numeracaoAtiva: true,
  modoA4: true,
  zoomA4: 100,
  zoomFluido: 100,
  activeModelModalTab: 'vars-edit',
};

// Chaves de armazenamento LocalStorage
const STORAGE_KEYS = {
  PREFERENCES: 'edm_user_preferences',
  CUSTOM_TEMPLATES: 'edm_custom_templates',
  LAST_TEMPLATE_ID: 'edm_last_template_id',
  SAVED_FORM_DATA: 'edm_saved_form_data',
  JSON_HISTORY: 'edm_json_history',
} as const;

/**
 * Avisos de LocalStorage sao esperados em producao (modo privado, cota excedida, dado
 * gravado por uma versao anterior do app). Em desenvolvimento eles ajudam a
 * diagnosticar, entao ficam restritos ao modo DEV em vez de poluir o console real.
 */
function avisarFalhaDeArmazenamento(mensagem: string, erro: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[storageService] ${mensagem}`, erro);
  }
}

export const StorageService = {
  /**
   * Carrega as preferências de interface unificadas com fallback para os valores padrão.
   */
  loadPreferences(): UserPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_USER_PREFERENCES,
          ...parsed,
        };
      }
      return { ...DEFAULT_USER_PREFERENCES };
    } catch (e) {
      avisarFalhaDeArmazenamento('Erro ao carregar preferências de interface do LocalStorage:', e);
      return { ...DEFAULT_USER_PREFERENCES };
    }
  },

  /**
   * Salva todas as preferências de interface de uma única vez em um registro unificado.
   */
  savePreferences(preferences: Partial<UserPreferences>): void {
    try {
      const current = this.loadPreferences();
      const updated = { ...current, ...preferences };
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    } catch (e) {
      avisarFalhaDeArmazenamento('Erro ao salvar preferências de interface no LocalStorage:', e);
    }
  },

  /**
   * Carrega a lista de templates customizados salvos pelo usuário.
   */
  loadCustomTemplates(): TemplateItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_TEMPLATES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      avisarFalhaDeArmazenamento('Erro ao carregar templates customizados:', e);
    }
    return [];
  },

  /**
   * Salva a lista de templates customizados.
   */
  saveCustomTemplates(templates: TemplateItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(templates));
    } catch (e) {
      avisarFalhaDeArmazenamento('Erro ao salvar templates customizados:', e);
    }
  },

  /**
   * Obtém o ID do último template selecionado.
   */
  getLastTemplateId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_TEMPLATE_ID);
    } catch {
      return null;
    }
  },

  /**
   * Salva o ID do template ativo.
   */
  setLastTemplateId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_TEMPLATE_ID, id);
    } catch {}
  },

  /**
   * Carrega os dados preenchidos de um template específico ou todo o mapa de formulários.
   */
  loadFormData(templateId?: string): DadosDocumento {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED_FORM_DATA);
      const allData = raw ? JSON.parse(raw) : {};
      if (templateId) {
        return allData[templateId] || {};
      }
      return allData;
    } catch (e) {
      avisarFalhaDeArmazenamento('Erro ao carregar dados de formulário salvos:', e);
      return {};
    }
  },

  /**
   * Salva os dados de preenchimento para um template específico no mapa persistido.
   */
  saveFormDataForTemplate(templateId: string, data: DadosDocumento): void {
    try {
      const allData = this.loadFormData();
      allData[templateId] = data;
      localStorage.setItem(STORAGE_KEYS.SAVED_FORM_DATA, JSON.stringify(allData));
    } catch (e) {
      avisarFalhaDeArmazenamento('Erro ao salvar dados do formulário:', e);
    }
  },

  /**
   * Limpa os dados de preenchimento salvos para um template específico.
   */
  clearFormDataForTemplate(templateId: string): void {
    try {
      const allData = this.loadFormData();
      delete allData[templateId];
      localStorage.setItem(STORAGE_KEYS.SAVED_FORM_DATA, JSON.stringify(allData));
    } catch (e) {
      avisarFalhaDeArmazenamento('Erro ao limpar dados do formulário no LocalStorage:', e);
    }
  },

  /**
   * Carrega o JSON histórico atrelado ao nome de um arquivo.
   */
  loadJsonHistory(fileName: string): string | undefined {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.JSON_HISTORY);
      if (raw) {
        const allHistory = JSON.parse(raw);
        return allHistory[fileName];
      }
    } catch (e) {
      avisarFalhaDeArmazenamento('Erro ao carregar histórico de JSON:', e);
    }
    return undefined;
  },

  /**
   * Salva o JSON histórico atrelado ao nome de um arquivo.
   */
  saveJsonHistory(fileName: string, jsonStr: string): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.JSON_HISTORY);
      const allHistory = raw ? JSON.parse(raw) : {};
      allHistory[fileName] = jsonStr;
      localStorage.setItem(STORAGE_KEYS.JSON_HISTORY, JSON.stringify(allHistory));
    } catch (e) {
      avisarFalhaDeArmazenamento('Erro ao salvar histórico de JSON:', e);
    }
  },

  /**
   * Remove o JSON histórico atrelado ao nome de um arquivo.
   */
  removeJsonHistory(fileName: string): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.JSON_HISTORY);
      if (raw) {
        const allHistory = JSON.parse(raw);
        delete allHistory[fileName];
        localStorage.setItem(STORAGE_KEYS.JSON_HISTORY, JSON.stringify(allHistory));
      }
    } catch (e) {
      avisarFalhaDeArmazenamento('Erro ao remover histórico de JSON:', e);
    }
  },
};
