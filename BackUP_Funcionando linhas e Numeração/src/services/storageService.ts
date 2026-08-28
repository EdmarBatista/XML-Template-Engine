/**
 * Serviço de Gerenciamento Unificado de Armazenamento Local (LocalStorage).
 * Centraliza a leitura, gravação, defaults e migrações de preferências de interface,
 * modelos personalizados e dados preenchidos de formulários.
 */

import { TemplateItem } from '../data/defaultTemplates';

export interface UserPreferences {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  irParaCampoAtivo: boolean;
  irParaDocumentoAtivo: boolean;
  edicaoInline: boolean;
  variaveisVermelhasWord: boolean;
  numeracaoAtiva: boolean;
  modoA4: boolean;
  zoomA4: number;
  zoomFluido: number;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  sidebarWidth: 380,
  sidebarCollapsed: false,
  irParaCampoAtivo: true,
  irParaDocumentoAtivo: true,
  edicaoInline: true,
  variaveisVermelhasWord: true,
  numeracaoAtiva: true,
  modoA4: true,
  zoomA4: 100,
  zoomFluido: 100,
};

// Chaves de armazenamento LocalStorage
const STORAGE_KEYS = {
  PREFERENCES: 'edm_user_preferences',
  CUSTOM_TEMPLATES: 'edm_custom_templates',
  LAST_TEMPLATE_ID: 'edm_last_template_id',
  SAVED_FORM_DATA: 'edm_saved_form_data',
} as const;

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
      console.warn('Erro ao carregar preferências de interface do LocalStorage:', e);
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
      console.warn('Erro ao salvar preferências de interface no LocalStorage:', e);
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
      console.warn('Erro ao carregar templates customizados:', e);
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
      console.warn('Erro ao salvar templates customizados:', e);
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
  loadFormData(templateId?: string): Record<string, any> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED_FORM_DATA);
      const allData = raw ? JSON.parse(raw) : {};
      if (templateId) {
        return allData[templateId] || {};
      }
      return allData;
    } catch (e) {
      console.warn('Erro ao carregar dados de formulário salvos:', e);
      return {};
    }
  },

  /**
   * Salva os dados de preenchimento para um template específico no mapa persistido.
   */
  saveFormDataForTemplate(templateId: string, data: Record<string, any>): void {
    try {
      const allData = this.loadFormData();
      allData[templateId] = data;
      localStorage.setItem(STORAGE_KEYS.SAVED_FORM_DATA, JSON.stringify(allData));
    } catch (e) {
      console.warn('Erro ao salvar dados do formulário:', e);
    }
  },
};
