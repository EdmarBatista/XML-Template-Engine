import React from 'react';
import { ArrowLeft, ArrowRight, Code, Download, Edit3, FileDown, FileText, ListOrdered, Printer, RotateCcw, Sliders, Upload, ChevronsUpDown, Copy, Check, ZoomIn, ZoomOut, ChevronLeft, X, ChevronDown, Archive, FolderArchive } from 'lucide-react';
import { DEFAULT_TEMPLATES, TemplateItem } from '../data/defaultTemplates';

interface SidebarToolbarProps {
  currentXmlName: string;
  customTemplates: TemplateItem[];
  onRemoveCustomTemplate: (id: string) => void;
  onSelectTemplate: (t: TemplateItem) => void;
  onUploadXml: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadZip?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveJson: () => void;
  onSaveZip?: () => void;
  onExportWord: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  onOpenXmlEditor?: () => void;
  onOpenModelModal: () => void;
  onClearForm: () => void;
  variaveisVermelhasWord: boolean;
  onToggleVariaveisVermelhas: () => void;
  numeracaoAtiva: boolean;
  onToggleNumeracao: () => void;
  edicaoInline: boolean;
  onToggleEdicaoInline: () => void;
  irParaCampoAtivo: boolean;
  onToggleIrParaCampo: () => void;
  irParaDocumentoAtivo: boolean;
  onToggleIrParaDocumento: () => void;
  modoA4: boolean;
  onCopiarTexto?: () => void;
  copiado?: boolean;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onToggleSidebar?: () => void;
  onToggleModoA4: () => void;
  collapsed?: boolean;
}

export const SidebarToolbar: React.FC<SidebarToolbarProps> = ({
  currentXmlName, customTemplates, onRemoveCustomTemplate, onSelectTemplate, onUploadXml, onUploadJson, onUploadZip, onSaveJson, onSaveZip,
  onExportWord, onExportPdf, onPrint, onOpenXmlEditor, onOpenModelModal, onClearForm,
  variaveisVermelhasWord, onToggleVariaveisVermelhas, numeracaoAtiva, onToggleNumeracao,
  edicaoInline, onToggleEdicaoInline, irParaCampoAtivo, onToggleIrParaCampo,
  irParaDocumentoAtivo, onToggleIrParaDocumento, modoA4, onToggleModoA4, onCopiarTexto, copiado, zoom, onZoomIn, onZoomOut, onResetZoom, onToggleSidebar, collapsed
}) => {
  const xmlInputRef = React.useRef<HTMLInputElement>(null);
  const jsonInputRef = React.useRef<HTMLInputElement>(null);
  const zipInputRef = React.useRef<HTMLInputElement>(null);
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

  const actionButtons = (
    <>
      <input ref={xmlInputRef} type="file" accept=".xml,text/xml,application/xml,.zip,application/zip" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f && (f.name.toLowerCase().endsWith('.zip') || f.type.includes('zip')) && onUploadZip) {
          onUploadZip(e);
        } else {
          onUploadXml(e);
        }
      }} className="hidden" />
      <input ref={jsonInputRef} type="file" accept=".json,application/json" onChange={onUploadJson} className="hidden" />
      {onUploadZip && (
        <input ref={zipInputRef} type="file" accept=".zip,application/zip,application/x-zip-compressed" onChange={onUploadZip} className="hidden" />
      )}

      <button type="button" onClick={() => xmlInputRef.current?.click()} className="btn-toolbar" title="Abrir XML / Pacote ZIP">
        <Upload className="w-4 h-4 text-blue-400" />
      </button>
      
      <button type="button" onClick={() => jsonInputRef.current?.click()} className="btn-toolbar" title="Carregar Dados JSON">
        <FileDown className="w-4 h-4 text-amber-400" />
      </button>
      
      <button type="button" onClick={onSaveJson} className="btn-toolbar" title="Salvar Dados JSON">
        <Download className="w-4 h-4 text-emerald-400" />
      </button>

      {onSaveZip && (
        <button type="button" onClick={onSaveZip} className="btn-toolbar" title="Baixar Pacote ZIP (XML + JSON juntos)">
          <Archive className="w-4 h-4 text-cyan-400" />
        </button>
      )}

      <button type="button" onClick={onToggleIrParaCampo} className={`btn-toolbar ${irParaCampoAtivo ? 'active-toolbar' : ''}`} title="Ir para o Campo">
        <ArrowLeft className={`w-4 h-4 ${irParaCampoAtivo ? 'text-blue-400' : 'text-slate-400'}`} />
      </button>
      
      <button type="button" onClick={onToggleIrParaDocumento} className={`btn-toolbar ${irParaDocumentoAtivo ? 'active-toolbar' : ''}`} title="Ir para o Documento">
        <ArrowRight className={`w-4 h-4 ${irParaDocumentoAtivo ? 'text-blue-400' : 'text-slate-400'}`} />
      </button>
      
      <button type="button" onClick={onToggleEdicaoInline} className={`btn-toolbar ${edicaoInline ? 'active-toolbar-emerald' : ''}`} title="Edição Inline">
        <Edit3 className={`w-4 h-4 ${edicaoInline ? 'text-emerald-400' : 'text-slate-400'}`} />
      </button>
      
      <button type="button" onClick={onToggleNumeracao} className={`btn-toolbar ${numeracaoAtiva ? 'active-toolbar-purple' : ''}`} title="Numeração do Documento">
        <ListOrdered className={`w-4 h-4 ${numeracaoAtiva ? 'text-purple-400' : 'text-slate-400'}`} />
      </button>

      {onZoomOut && onZoomIn && (
        <div className={`flex ${collapsed ? 'flex-col-reverse w-8 h-auto py-1 items-center gap-1' : 'items-center justify-between w-[86px] h-7'} bg-slate-800 rounded-md border border-slate-600 p-0.5 shrink-0 shadow-sm`}>
          <button 
            type="button" 
            onClick={onZoomOut} 
            className="w-5 h-5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition flex items-center justify-center shrink-0" 
            title={modoA4 ? "Diminuir Zoom da Página A4" : "Diminuir Tamanho da Fonte"}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span 
            onDoubleClick={(e) => {
              e.stopPropagation();
              onResetZoom?.();
            }}
            className={`text-[10px] font-mono text-slate-300 hover:text-white cursor-pointer transition-colors text-center select-none tabular-nums shrink-0 ${collapsed ? 'w-full' : 'w-[38px]'}`}
            title={
              modoA4 
                ? `Zoom da página A4: ${zoom ?? 100}%\n(Duplo clique para restaurar 100%)` 
                : `Tamanho da fonte: ${zoom ?? 100}%\n(Duplo clique para restaurar 100%)`
            }
          >
            {zoom ?? 100}%
          </span>
          <button 
            type="button" 
            onClick={onZoomIn} 
            className="w-5 h-5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition flex items-center justify-center shrink-0" 
            title={modoA4 ? "Aumentar Zoom da Página A4" : "Aumentar Tamanho da Fonte"}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <button type="button" onClick={onToggleModoA4} className={`btn-toolbar flex items-center justify-center font-bold text-xs ${modoA4 ? '!text-blue-500 !bg-transparent !border-blue-500/50' : 'text-slate-400'}`} title="Modo Visualização (A4)">
         A4
      </button>

      <button type="button" onClick={onOpenModelModal} className="btn-toolbar" title="Variáveis e Modelo">
        <Sliders className="w-4 h-4 text-cyan-400" />
      </button>

      <button type="button" onClick={onExportWord} className="btn-toolbar" title="Exportar Documento Word (.docx)">
        <span className="font-black text-[13px] text-blue-500 leading-none">W</span>
      </button>

      <button type="button" onClick={onExportPdf} className="btn-toolbar" title="Salvar Documento PDF (.pdf)">
        <FileText className="w-4 h-4 text-rose-400" />
      </button>
      
      <button type="button" onClick={onPrint} className="btn-toolbar" title="Imprimir">
        <Printer className="w-4 h-4 text-slate-300" />
      </button>

      <button type="button" onClick={onToggleVariaveisVermelhas} className={`btn-toolbar ${variaveisVermelhasWord ? 'active-toolbar-rose' : ''}`} title="Variáveis em Vermelho no Word">
        <span className={`font-bold text-[13px] font-mono leading-none ${variaveisVermelhasWord ? 'text-rose-500' : 'text-slate-400'}`}>V</span>
      </button>
      
      {onCopiarTexto && (
        <button type="button" onClick={onCopiarTexto} className="btn-toolbar" title="Copiar Texto">
          {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
        </button>
      )}

      <button type="button" onClick={onClearForm} className="btn-toolbar hover:bg-red-500/20" title="Limpar Formulário">
        <RotateCcw className="w-4 h-4 text-red-400" />
      </button>
    </>
  );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5 w-full pb-4">
        {actionButtons}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 flex flex-col border-b border-slate-700">
      {/* Container of controls */}
      <div className="p-3 space-y-3">
        
        {/* Top row: Select template + Collapse button on the right */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none hover:bg-slate-700/80 transition-colors text-left"
            >
              <span className="truncate pr-2 font-medium">
                {DEFAULT_TEMPLATES.find(t => t.nome === currentXmlName)?.nome || customTemplates.find(t => t.nome === currentXmlName)?.nome || currentXmlName || "Selecione um modelo..."}
              </span>
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
                        className={`group flex items-center justify-between px-2 py-1.5 text-xs hover:bg-slate-700 cursor-pointer ${currentXmlName === t.nome ? 'bg-blue-900/40 text-blue-300 font-medium' : 'text-slate-200'}`}
                        onClick={() => {
                          onSelectTemplate(t);
                          setDropdownOpen(false);
                        }}
                      >
                        <span className="truncate pr-2 flex-1">{t.nome}</span>
                        <button 
                          type="button"
                          className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          onClick={(e) => {
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
                      className={`px-2 py-1.5 text-xs hover:bg-slate-700 cursor-pointer ${currentXmlName === t.nome ? 'bg-blue-900/40 text-blue-300 font-medium' : 'text-slate-200'}`}
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

          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition shrink-0"
              title="Recolher formulário"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>


        {/* Buttons Grid */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-800/40 border border-slate-700/60 rounded-md">
          {actionButtons}
        </div>
      </div>
      
    </div>
  );
};
