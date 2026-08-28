import React from 'react';
import { ChevronDown, X } from 'lucide-react';
import { DEFAULT_TEMPLATES, TemplateItem } from '../data/defaultTemplates';

interface TemplateSelectorProps {
  currentXmlName: string;
  customTemplates: TemplateItem[];
  onSelectTemplate: (t: TemplateItem) => void;
  onRemoveCustomTemplate: (id: string) => void;
}

/**
 * Seletor de templates (customizados + modelos prontos) com dropdown.
 * Extraído de SidebarToolbar (sugestão G de modularização).
 */
export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  currentXmlName,
  customTemplates,
  onSelectTemplate,
  onRemoveCustomTemplate,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLabel =
    DEFAULT_TEMPLATES.find(t => t.nome === currentXmlName)?.nome ||
    customTemplates.find(t => t.nome === currentXmlName)?.nome ||
    currentXmlName ||
    'Selecione um modelo...';

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="w-full flex items-center justify-between bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none hover:bg-slate-700/80 transition-colors text-left"
      >
        <span className="truncate pr-2 font-medium">{currentLabel}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </button>

      {dropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50 max-h-72 overflow-y-auto">
          {/* Seção 1: Seus Templates */}
          <div className="py-1">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Seus Templates</span>
              <span className="text-[9px] text-slate-500 font-normal">{customTemplates.length}</span>
            </div>

            {customTemplates.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-slate-500 italic">
                Nenhum template salvo ainda. Arraste ou abra um arquivo XML/ZIP.
              </div>
            ) : (
              customTemplates.map(t => (
                <div
                  key={t.id}
                  className={`group flex items-center justify-between px-2 py-1.5 text-xs hover:bg-slate-700 cursor-pointer ${
                    currentXmlName === t.nome ? 'bg-blue-900/40 text-blue-300 font-medium' : 'text-slate-200'
                  }`}
                  onClick={() => {
                    onSelectTemplate(t);
                    setDropdownOpen(false);
                  }}
                >
                  <span className="truncate pr-2 flex-1">{t.nome}</span>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    onClick={e => {
                      e.stopPropagation();
                      onRemoveCustomTemplate(t.id);
                    }}
                    title="Remover template"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Seção 2: Modelos Prontos */}
          <div className="py-1 border-t border-slate-700/60">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modelos Prontos</div>
            {DEFAULT_TEMPLATES.map(t => (
              <div
                key={t.id}
                className={`px-2 py-1.5 text-xs hover:bg-slate-700 cursor-pointer ${
                  currentXmlName === t.nome ? 'bg-blue-900/40 text-blue-300 font-medium' : 'text-slate-200'
                }`}
                onClick={() => {
                  onSelectTemplate(t);
                  setDropdownOpen(false);
                }}
              >
                <span className="truncate">{t.nome}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
