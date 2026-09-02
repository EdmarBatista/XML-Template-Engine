import React from 'react';
import { StorageService, UserPreferences } from '../services/storageService';

export interface PrefsState {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  toolbarLateral: boolean;
  darkMode: boolean;
  zoomA4: number;
  zoomFluido: number;
  modoA4: boolean;
  variaveisVermelhasWord: boolean;
  numeracaoAtiva: boolean;
  irParaCampoAtivo: boolean;
  irParaDocumentoAtivo: boolean;
  edicaoInline: boolean;
  isResizing: boolean;
  activeModelModalTab: string;
}

export interface PrefsSetters {
  setSidebarWidth: React.Dispatch<React.SetStateAction<number>>;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setToolbarLateral: React.Dispatch<React.SetStateAction<boolean>>;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  setZoomA4: React.Dispatch<React.SetStateAction<number>>;
  setZoomFluido: React.Dispatch<React.SetStateAction<number>>;
  setModoA4: React.Dispatch<React.SetStateAction<boolean>>;
  setVariaveisVermelhasWord: React.Dispatch<React.SetStateAction<boolean>>;
  setNumeracaoAtiva: React.Dispatch<React.SetStateAction<boolean>>;
  setIrParaCampoAtivo: React.Dispatch<React.SetStateAction<boolean>>;
  setIrParaDocumentoAtivo: React.Dispatch<React.SetStateAction<boolean>>;
  setEdicaoInline: React.Dispatch<React.SetStateAction<boolean>>;
  setIsResizing: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveModelModalTab: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Hook de preferências de interface: carrega os valores iniciais,
 * mantém os estados e persiste automaticamente no localStorage.
 .
 */
export function usePreferencias(): PrefsState & PrefsSetters {
  const initialPrefs = React.useMemo(() => StorageService.loadPreferences(), []);
  const [sidebarWidth, setSidebarWidth] = React.useState<number>(initialPrefs.sidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(initialPrefs.sidebarCollapsed);
  const [toolbarLateral, setToolbarLateral] = React.useState<boolean>(initialPrefs.toolbarLateral);
  const [darkMode, setDarkMode] = React.useState<boolean>(initialPrefs.darkMode);
  const [isResizing, setIsResizing] = React.useState(false);
  const [zoomA4, setZoomA4] = React.useState<number>(initialPrefs.zoomA4);
  const [zoomFluido, setZoomFluido] = React.useState<number>(initialPrefs.zoomFluido);
  const [modoA4, setModoA4] = React.useState<boolean>(initialPrefs.modoA4);
  const [variaveisVermelhasWord, setVariaveisVermelhasWord] = React.useState<boolean>(initialPrefs.variaveisVermelhasWord);
  const [numeracaoAtiva, setNumeracaoAtiva] = React.useState<boolean>(initialPrefs.numeracaoAtiva);
  const [irParaCampoAtivo, setIrParaCampoAtivo] = React.useState<boolean>(initialPrefs.irParaCampoAtivo);
  const [irParaDocumentoAtivo, setIrParaDocumentoAtivo] = React.useState<boolean>(initialPrefs.irParaDocumentoAtivo);
  const [edicaoInline, setEdicaoInline] = React.useState<boolean>(initialPrefs.edicaoInline);
  const [activeModelModalTab, setActiveModelModalTab] = React.useState<string>(initialPrefs.activeModelModalTab || 'vars-edit');

  React.useEffect(() => {
    if (isResizing) return;
    const currentPrefs: UserPreferences = {
      sidebarWidth,
      sidebarCollapsed,
      toolbarLateral,
      darkMode,
      irParaCampoAtivo,
      irParaDocumentoAtivo,
      edicaoInline,
      variaveisVermelhasWord,
      numeracaoAtiva,
      modoA4,
      zoomA4,
      zoomFluido,
      activeModelModalTab,
    };
    StorageService.savePreferences(currentPrefs);
  }, [
    sidebarWidth,
    sidebarCollapsed,
    toolbarLateral,
    darkMode,
    irParaCampoAtivo,
    irParaDocumentoAtivo,
    edicaoInline,
    variaveisVermelhasWord,
    numeracaoAtiva,
    modoA4,
    zoomA4,
    zoomFluido,
    isResizing,
    activeModelModalTab,
  ]);

  // Aplica/reverte a classe .dark no <html> (controla os tokens do tema)
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', darkMode);
    }
  }, [darkMode]);

  return {
    sidebarWidth,
    sidebarCollapsed,
    toolbarLateral,
    darkMode,
    setDarkMode,
    zoomA4,
    zoomFluido,
    modoA4,
    variaveisVermelhasWord,
    numeracaoAtiva,
    irParaCampoAtivo,
    irParaDocumentoAtivo,
    edicaoInline,
    isResizing,
    activeModelModalTab,
    setSidebarWidth,
    setSidebarCollapsed,
    setToolbarLateral,
    setZoomA4,
    setZoomFluido,
    setModoA4,
    setVariaveisVermelhasWord,
    setNumeracaoAtiva,
    setIrParaCampoAtivo,
    setIrParaDocumentoAtivo,
    setEdicaoInline,
    setIsResizing,
    setActiveModelModalTab,
  };
}
