/**
 * ============================================================================
 * useSidebarResizer
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Gerenciar o estado de arrasto e redimensionamento do divisor entre formulário e documento.
 * 2. Vincular e desvincular listeners de 'mousemove' e 'mouseup' na janela com limites de largura.
 */

import React from 'react';

interface UseSidebarResizerProps {
  isResizing: boolean;
  setIsResizing: (val: boolean) => void;
  setSidebarWidth: (width: number) => void;
}

export function useSidebarResizer({
  isResizing,
  setIsResizing,
  setSidebarWidth,
}: UseSidebarResizerProps) {
  const startResizing = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
    },
    [setIsResizing]
  );

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(280, Math.min(e.clientX, window.innerWidth - 350));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setIsResizing, setSidebarWidth]);

  return {
    startResizing,
  };
}
