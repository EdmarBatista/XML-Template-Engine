import React from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Download, Edit3, FileText, ListOrdered, RotateCcw, Sliders, Upload, Copy, Check, ZoomIn, ZoomOut, ChevronLeft, Archive, Moon, Sun, X } from 'lucide-react';
import { TemplateItem } from '../data/defaultTemplates';
import { TemplateSelector } from './TemplateSelector';
import type { Pendencia } from '../utils/pendencias';

interface SidebarToolbarProps {
  currentXmlName: string;
  customTemplates: TemplateItem[];
  onRemoveCustomTemplate: (t: TemplateItem) => void;
  onSelectTemplate: (t: TemplateItem) => void;
  onNewTemplate?: () => void;
  onLoadJson?: (jsonStr: string) => void;
  onUploadXml: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadZip?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveJson: () => void;
  onSaveZip?: () => void;
  onExportWord: () => void;
  onExportPdf: () => void;
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
  onDoubleToggleSidebar?: () => void;
  onToggleModoA4: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  collapsed?: boolean;
  /** Pendências que bloqueiam Word/PDF/pacote. */
  pendencias?: Pendencia[];
  /** Leva o usuário ao campo que gerou a pendência. */
  onIrParaPendencia?: (id: string) => void;
}

export const SidebarToolbar: React.FC<SidebarToolbarProps> = ({
  currentXmlName, customTemplates, onRemoveCustomTemplate, onSelectTemplate, onNewTemplate, onLoadJson, onUploadXml, onUploadJson, onUploadZip, onSaveJson, onSaveZip,
  onExportWord, onExportPdf, onOpenModelModal, onClearForm,
  variaveisVermelhasWord, onToggleVariaveisVermelhas, numeracaoAtiva, onToggleNumeracao,
  edicaoInline, onToggleEdicaoInline, irParaCampoAtivo, onToggleIrParaCampo,
  irParaDocumentoAtivo, onToggleIrParaDocumento, modoA4, onToggleModoA4, darkMode, onToggleDarkMode, onCopiarTexto, copiado, zoom, onZoomIn, onZoomOut, onResetZoom, onToggleSidebar, onDoubleToggleSidebar, collapsed,
  pendencias,
  onIrParaPendencia
}) => {
  const xmlInputRef = React.useRef<HTMLInputElement>(null);
  const zipInputRef = React.useRef<HTMLInputElement>(null);
  const clickTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dialogoPendenciasAberto, setDialogoPendenciasAberto] = React.useState(false);
  const pendenciasAtuais = pendencias || [];

  React.useEffect(() => {
    if (pendenciasAtuais.length === 0) setDialogoPendenciasAberto(false);
  }, [pendenciasAtuais.length]);

  const executarComValidacao = (acao: () => void) => {
    if (pendenciasAtuais.length > 0) {
      setDialogoPendenciasAberto(true);
      return;
    }
    acao();
  };

  // Limpa o timer pendente ao desmontar
  React.useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  // Lógica de clique simples vs. duplo no botão recolher (mesma abordagem das variáveis):
  // - 1 clique -> aguarda o timer e recolhe
  // - 2 cliques rápidos -> cancela o recolhimento e aplica o modo barra lateral
  const handleCollapseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      onToggleSidebar?.();
    }, 260);
  };

  const handleCollapseDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onDoubleToggleSidebar?.();
  };

  const actionButtons = (
    <>
      <input ref={xmlInputRef} type="file" multiple accept=".xml,text/xml,application/xml,.zip,application/zip,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.json,application/json" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f && (f.name.toLowerCase().endsWith('.zip') || f.type.includes('zip')) && onUploadZip) {
          onUploadZip(e);
        } else {
          onUploadXml(e);
        }
      }} className="hidden" />
      {onUploadZip && (
        <input ref={zipInputRef} type="file" accept=".zip,application/zip,application/x-zip-compressed" onChange={onUploadZip} className="hidden" />
      )}

      <button type="button" onClick={() => xmlInputRef.current?.click()} className="btn-toolbar" title="Abrir Modelo ou Dados (.xml, .zip, .docx, .json)">
        <Upload className="w-4 h-4 text-blue-400" />
      </button>
      

      
      <button type="button" onClick={onSaveJson} className="btn-toolbar" title="Salvar Dados Preenchidos (.json) (Ctrl + S)">
        <Download className="w-4 h-4 text-emerald-400" />
      </button>

      {onSaveZip && (
        <button type="button" onClick={() => executarComValidacao(() => onSaveZip?.())} className="btn-toolbar" title="Baixar Pacote Completo (Modelo e Dados em .zip)">
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

      <button type="button" onClick={onOpenModelModal} className="btn-toolbar" title="Painel de Variáveis e Modelo (Ctrl + M)">
        <Sliders className="w-4 h-4 text-cyan-400" />
      </button>

      <button type="button" onClick={() => executarComValidacao(onExportWord)} className="btn-toolbar" title="Exportar Documento Word (.docx)">
        <span className="font-black text-[13px] text-blue-500 leading-none">W</span>
      </button>

      <button type="button" onClick={() => executarComValidacao(onExportPdf)} className="btn-toolbar" title="Salvar Documento PDF (.pdf)">
        <FileText className="w-4 h-4 text-rose-400" />
      </button>

      <button
        type="button"
        onClick={onToggleDarkMode}
        className={`btn-toolbar ${darkMode ? 'active-toolbar' : ''}`}
        title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
      >
        {darkMode ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-300" />
        )}
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

  const dialogoPendencias =
    dialogoPendenciasAberto && pendenciasAtuais.length > 0 ? (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pendencias-titulo"
      >
        <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
          <div className="flex items-start gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 id="pendencias-titulo" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Exportação bloqueada
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Resolva {pendenciasAtuais.length === 1 ? 'a pendência abaixo' : 'as pendências abaixo'} antes de gerar Word, PDF ou pacote.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDialogoPendenciasAberto(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <ul className="overflow-y-auto p-4 space-y-3">
            {pendenciasAtuais.map(pendencia => (
              <li
                key={pendencia.id}
                className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 p-3"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  {pendencia.grupo}
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {pendencia.rotulo}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {pendencia.mensagem}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onIrParaPendencia?.(pendencia.id);
                    setDialogoPendenciasAberto(false);
                  }}
                  className="mt-2 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Ir para o campo
                </button>
              </li>
            ))}
          </ul>

          <div className="flex justify-end p-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setDialogoPendenciasAberto(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    ) : null;

  if (collapsed) {
    return (
      <>
        <div className="flex flex-col items-center gap-1.5 w-full pb-4">
          {actionButtons}
        </div>
        {dialogoPendencias}
      </>
    );
  }

  return (
    <>
    <div className="bg-slate-900 flex flex-col border-b border-slate-700">
      {/* Container of controls */}
      <div className="p-3 space-y-3">
        
        {/* Top row: Select template + Collapse button on the right */}
        <div className="flex items-center gap-1.5">
          <TemplateSelector
            currentXmlName={currentXmlName}
            customTemplates={customTemplates}
            onSelectTemplate={onSelectTemplate}
            onRemoveCustomTemplate={onRemoveCustomTemplate}
            
            onLoadJson={onLoadJson}
          />

          {onToggleSidebar && (
            <button
              type="button"
              onClick={handleCollapseClick}
              onDoubleClick={handleCollapseDoubleClick}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition shrink-0"
              title="Recolher formulário (Duplo clique: mantém campos abertos e move os botões para a esquerda)"
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
    {dialogoPendencias}
    </>
  );
};
