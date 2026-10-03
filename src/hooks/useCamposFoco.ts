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
}

/**
 * Hook de foco/destaque bidirecional entre documento e sidebar.
 *
 * O rastreamento de "último campo alterado" (ultimoCampoAlterado/versaoCampoAlterado/
 * origemCampoAlterado) e o handleUpdateField foram removidos: useFormHistory já mantém
 * esses mesmos dados para os consumidores, e nada lia os valores daqui.
 */
export function useCamposFoco({ sidebarCollapsed, irParaCampoAtivo, setSidebarCollapsed }: CamposFocoArgs) {
  const bloquearScrollDocAte = React.useRef(0);

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
    campoFocadoDoc,
    campoFocadoSidebar,
    handleFocusFieldFromSidebar,
    handleFocusFieldInSidebar,
  };
}
