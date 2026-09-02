import React from 'react';
import { X, FileText, Loader2, Sparkles } from 'lucide-react';

interface ConvertWordModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isConverting?: boolean;
}

export const ImportWordModal: React.FC<ConvertWordModalProps> = ({
  file,
  isOpen,
  onClose,
  onConfirm,
  isConverting = false,
}) => {
  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                Converter Documento Word?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Importação e conversão para Modelo XML
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isConverting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3.5 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
            <span className="truncate">📄 {file.name}</span>
            <span className="text-[10px] text-slate-400 shrink-0">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <p className="leading-relaxed">
            Deseja converter a estrutura deste arquivo Word (títulos, seções, parágrafos, listas numeradas e tabelas) em um novo modelo XML editável?
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isConverting}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConverting}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {isConverting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Convertendo...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Converter para XML</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
