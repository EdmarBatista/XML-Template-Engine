import React from 'react';

/** Tipo do toast. `erro` fica mais tempo na tela e recebe destaque visual. */
export type ToastTipo = 'info' | 'erro';

const DURACAO_INFO_MS = 3000;
const DURACAO_ERRO_MS = 9000;

/**
 * Hook de toast: mensagem temporária exibida no App.
 *
 * O timer e unico e reiniciado a cada chamada. Sem isso, a mensagem anterior
 * ("Gerando arquivo PDF...", 3s) agendava um clear que podia apagar o toast de
 * erro que viesse logo depois — justamente o que precisa durar mais.
 */
export function useToast(): {
  toastMessage: string | null;
  toastTipo: ToastTipo;
  showToast: (msg: string, tipo?: ToastTipo) => void;
} {
  const [toast, setToast] = React.useState<{ msg: string; tipo: ToastTipo } | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const showToast = React.useCallback((msg: string, tipo: ToastTipo = 'info') => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    setToast({ msg, tipo });
    timerRef.current = window.setTimeout(
      () => setToast(null),
      tipo === 'erro' ? DURACAO_ERRO_MS : DURACAO_INFO_MS
    );
  }, []);

  React.useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  return { toastMessage: toast?.msg ?? null, toastTipo: toast?.tipo ?? 'info', showToast };
}
