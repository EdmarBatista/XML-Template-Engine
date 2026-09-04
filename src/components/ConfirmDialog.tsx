import React from 'react';
import { X } from 'lucide-react';

export interface ConfirmDialogProps {
  onClose: () => void;
  /** Ícone exibido à esquerda do título (ex.: <AlertTriangle className="w-5 h-5" />). */
  icon?: React.ReactNode;
  /** Classes do "caixote" do ícone. */
  iconClassName?: string;
  title: string;
  /** Texto descritivo (aceita JSX, ex.: nome do documento em destaque). */
  description?: React.ReactNode;
  /** Conteúdo opcional entre a descrição e o rodapé (ex.: ações adicionais). */
  children?: React.ReactNode;
  /** Botões do rodapé. Se ausente, renderiza apenas "Cancelar". */
  footer?: React.ReactNode;
}

/**
 * Diálogo de confirmação reutilizável (fundo escurecido + painel central).
 * Centraliza o markup que antes era copiado em cada modal de confirmação do App.
 */
export function ConfirmDialog({
  onClose,
  icon,
  iconClassName = 'p-2.5 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',
  title,
  description,
  children,
  footer,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-800 dark:text-slate-100 space-y-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className={`rounded-lg shrink-0 ${iconClassName}`}>{icon}</div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition shrink-0"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {footer ?? (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
