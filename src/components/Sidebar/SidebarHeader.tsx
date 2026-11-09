import React from 'react';
import { Search, ChevronsUpDown } from 'lucide-react';

interface SidebarHeaderProps {
  preenchidos: number;
  totalCampos: number;
  pct: number;
  busca: string;
  onBuscaChange: (val: string) => void;
  onExpandirRecolherTudo: () => void;
  headerActions?: React.ReactNode;
  progressoExtra?: React.ReactNode;
  esconderProgresso?: boolean;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  preenchidos,
  totalCampos,
  pct,
  busca,
  onBuscaChange,
  onExpandirRecolherTudo,
  headerActions,
  progressoExtra,
  esconderProgresso = false,
}) => {
  return (
    <>
      {headerActions}

      {/* Barra de Progresso */}
      {!esconderProgresso && totalCampos > 0 && (
        <div className="px-3 pt-3 pb-3 bg-slate-900 border-b border-slate-700 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>
              {preenchidos} de {totalCampos} campos preenchidos
            </span>
            <span className="text-blue-400 font-bold">{pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Campo de Busca e Ação Expandir/Recolher */}
      {totalCampos > 0 && (
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar campos ou variáveis..."
                value={busca}
                onChange={e => onBuscaChange(e.target.value)}
                className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-md focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400 shadow-xs"
              />
            </div>
            <button
              type="button"
              onClick={onExpandirRecolherTudo}
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs shrink-0 cursor-pointer"
              title="Expandir ou recolher todos os grupos"
            >
              <ChevronsUpDown className="w-4 h-4" />
            </button>
            {progressoExtra}
          </div>
        </div>
      )}
    </>
  );
};
