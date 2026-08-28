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
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  preenchidos,
  totalCampos,
  pct,
  busca,
  onBuscaChange,
  onExpandirRecolherTudo,
  headerActions,
}) => {
  return (
    <>
      {headerActions}

      {/* Barra de Progresso */}
      <div className="px-3 pb-3 bg-slate-900 border-b border-slate-700 space-y-1 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>
            {preenchidos} de {totalCampos} campos preenchidos
          </span>
          <span className="text-blue-400 font-bold">{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Campo de Busca e Ação Expandir/Recolher */}
      <div className="p-3 bg-slate-100 border-b border-slate-200 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar campos ou variáveis..."
              value={busca}
              onChange={e => onBuscaChange(e.target.value)}
              className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400 shadow-xs"
            />
          </div>
          <button
            type="button"
            onClick={onExpandirRecolherTudo}
            className="p-1.5 rounded-md text-slate-500 bg-white border border-slate-200 hover:text-slate-800 hover:bg-slate-50 transition shadow-xs shrink-0 cursor-pointer"
            title="Expandir ou recolher todos os grupos"
          >
            <ChevronsUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
