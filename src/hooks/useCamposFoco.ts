import React from 'react';

export interface CampoFocoDoc {
  id: string;
  timestamp: number;
  origem?: string;
}

export interface CamposFocoArgs {
  sidebarCollapsed: boolean;
  irParaCampoAtivo: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setDados: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

/**
 * Hook de foco/destaque bidirecional entre documento e sidebar.
 * Extraído de App.tsx (sugestão A de modularização).
 */
export function useCamposFoco({ sidebarCollapsed, irParaCampoAtivo, setSidebarCollapsed, setDados }: CamposFocoArgs) {
  const bloquearScrollDocAte = React.useRef(0);

  const [ultimoCampoAlterado, setUltimoCampoAlterado] = React.useState<string | null>(null);
  const [versaoCampoAlterado, setVersaoCampoAlterado] = React.useState(0);
  const [origemCampoAlterado, setOrigemCampoAlterado] = React.useState<string | null>(null);
  const [campoFocadoDoc, setCampoFocadoDoc] = React.useState<CampoFocoDoc | null>(null);
  const [campoFocadoSidebar, setCampoFocadoSidebar] = React.useState<{ id: string; timestamp: number } | null>(null);

  // Previne deslocamento involuntário quando a janela ganha foco ou ao alternar abas
  React.useEffect(() => {
    const handleWindowFocus = () => {
      bloquearScrollDocAte.current = Date.now() + 1000;
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        bloquearScrollDocAte.current = Date.now() + 1000;
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Atualização de campos com emissão de destaque
  const handleUpdateField = React.useCallback((id: string, value: any, origem = 'painel') => {
    setDados(prev => ({ ...prev, [id]: value }));
    setUltimoCampoAlterado(id);
    setOrigemCampoAlterado(origem);
    setVersaoCampoAlterado(v => v + 1);
  }, [setDados]);

  // Foco acionado ao clicar no campo do Sidebar -> rola para o documento se ativo
  const handleFocusFieldFromSidebar = React.useCallback((fieldId: string) => {
    if (Date.now() < bloquearScrollDocAte.current) return;
    setCampoFocadoDoc({ id: fieldId, timestamp: Date.now(), origem: 'painel' });
  }, []);

  // Foco acionado ao clicar na variável ou condição If do Documento
  const handleFocusFieldInSidebar = React.useCallback((fieldId: string) => {
    bloquearScrollDocAte.current = Date.now() + 1200;
    if (sidebarCollapsed && irParaCampoAtivo) setSidebarCollapsed(false);
    setCampoFocadoSidebar({ id: fieldId, timestamp: Date.now() });
    // Destaca também no documento sem rolar
    setCampoFocadoDoc({ id: fieldId, timestamp: Date.now(), origem: 'documento' });
  }, [sidebarCollapsed, irParaCampoAtivo, setSidebarCollapsed]);

  return {
    bloquearScrollDocAte,
    ultimoCampoAlterado,
    setUltimoCampoAlterado,
    versaoCampoAlterado,
    setVersaoCampoAlterado,
    origemCampoAlterado,
    setOrigemCampoAlterado,
    campoFocadoDoc,
    campoFocadoSidebar,
    handleUpdateField,
    handleFocusFieldFromSidebar,
    handleFocusFieldInSidebar,
  };
}
