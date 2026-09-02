import React from 'react';

/**
 * Hook de toast: mensagem temporária exibida no App.
 .
 */
export function useToast(): {
  toastMessage: string | null;
  showToast: (msg: string) => void;
} {
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  return { toastMessage, showToast };
}
