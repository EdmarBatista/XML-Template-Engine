import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { FormGroup, FormItem } from '../../types';

interface SidebarGroupAccordionProps {
  grupo: FormGroup;
  idx: number;
  isOpen: boolean;
  onToggle: () => void;
  renderItens: (itens: FormItem[], nivel?: number) => React.ReactNode;
}

export const SidebarGroupAccordion: React.FC<SidebarGroupAccordionProps> = ({
  grupo,
  idx,
  isOpen,
  onToggle,
  renderItens,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200/90 dark:border-slate-700 shadow-2xs overflow-hidden transition-shadow hover:shadow-xs">
      {/* Group Accordion Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 text-left transition-colors cursor-pointer border-b border-slate-200/60 dark:border-slate-700/60"
      >
        <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-[10px] font-bold flex items-center justify-center">
            {idx + 1}
          </span>
          {grupo.titulo}
        </span>
        <span className="text-slate-400">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
      </button>

      {/* Group Content */}
      {isOpen && <div className="p-3 space-y-2.5">{renderItens(grupo.itens)}</div>}
    </div>
  );
};
