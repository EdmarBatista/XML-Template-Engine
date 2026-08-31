import React from 'react';
import {
  AlertCircle,
  Braces,
  Check,
  Code2,
  Copy,
  Download,
  FileCode,
  FileJson,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { XmlPart } from '../types';
import { concatenarXmlsParticionados, parseXmlDocument } from '../utils/xmlParser';
import { CodeMirrorEditor } from './CodeMirrorEditor';

export interface XmlEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  xmlContent: string;
  xmlParts?: XmlPart[] | null;
  dadosContent?: Record<string, any>;
  onApply?: (
    newXml: string,
    newDados: Record<string, any>,
    newXmlName?: string,
    newXmlParts?: XmlPart[]
  ) => void;
  /** Compatibilidade retroativa com assinatura anterior */
  onApplyXml?: (newXml: string, newName?: string) => void;
  xmlName: string;
  initialTab?: 'xml' | 'json';
  initialPartIndex?: number;
}

function formatarXml(xmlStr: string): string {
  try {
    let formatted = '';
    let indent = '';
    const tab = '  ';
    xmlStr.split(/>\s*</).forEach(node => {
      if (node.match(/^\/\w/)) {
        indent = indent.substring(tab.length);
      }
      formatted += indent + '<' + node + '>\r\n';
      if (
        node.match(/^<?\w[^>]*[^\/]$/) &&
        !node.startsWith('input') &&
        !node.startsWith('number') &&
        !node.startsWith('hr') &&
        !node.startsWith('br') &&
        !node.startsWith('meta')
      ) {
        indent += tab;
      }
    });
    return formatted.substring(1, formatted.length - 3).trim();
  } catch {
    return xmlStr;
  }
}

export const XmlEditorModal: React.FC<XmlEditorModalProps> = ({
  isOpen,
  onClose,
  xmlContent,
  xmlParts = null,
  dadosContent = {},
  onApply,
  onApplyXml,
  xmlName,
  initialTab = 'xml',
  initialPartIndex = 0,
}) => {
  const [activeTab, setActiveTab] = React.useState<'xml' | 'json'>(initialTab);
  const [xmlCode, setXmlCode] = React.useState(xmlContent);
  const [jsonCode, setJsonCode] = React.useState('');
  const [localParts, setLocalParts] = React.useState<XmlPart[]>(() =>
    xmlParts ? JSON.parse(JSON.stringify(xmlParts)) : []
  );
  const [selectedPartIndex, setSelectedPartIndex] = React.useState<number>(
    typeof initialPartIndex === 'number' ? initialPartIndex : 0
  );
  const [erroSintaxeXml, setErroSintaxeXml] = React.useState<string | null>(null);
  const [erroSintaxeJson, setErroSintaxeJson] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editName, setEditName] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      const parts = xmlParts ? JSON.parse(JSON.stringify(xmlParts)) : [];
      setLocalParts(parts);
      const initialIdx = typeof initialPartIndex === 'number' && initialPartIndex < parts.length ? initialPartIndex : 0;
      setSelectedPartIndex(initialIdx);

      if (parts.length > 0 && parts[initialIdx]) {
        setXmlCode(parts[initialIdx].xml);
      } else {
        setXmlCode(xmlContent);
      }

      setJsonCode(JSON.stringify(dadosContent || {}, null, 2));
      setErroSintaxeXml(null);
      setErroSintaxeJson(null);
      setEditName(xmlName.replace(/\.xml$/i, ''));
      setIsEditingName(false);
      if (initialTab) setActiveTab(initialTab);
    }
  }, [isOpen, xmlContent, xmlParts, dadosContent, xmlName, initialTab, initialPartIndex]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleApply();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, xmlCode, jsonCode, localParts, selectedPartIndex, editName, xmlName]);

  if (!isOpen) return null;

  const validarXml = (xmlStr: string): boolean => {
    try {
      parseXmlDocument(xmlStr);
      setErroSintaxeXml(null);
      return true;
    } catch (err: any) {
      // Se for uma parte individual com apenas tags parciais, tenta envolver em <documento> para testar
      if (localParts && localParts.length > 0) {
        try {
          parseXmlDocument(`<documento>${xmlStr}</documento>`);
          setErroSintaxeXml(null);
          return true;
        } catch {}
      }
      setErroSintaxeXml(err.message || 'Erro de sintaxe no XML');
      return false;
    }
  };

  const validarJson = (jsonStr: string): { valido: boolean; parsed?: any } => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setErroSintaxeJson('O JSON deve ser um objeto com pares chave-valor (ex: { "campo": "valor" }).');
        return { valido: false };
      }
      setErroSintaxeJson(null);
      return { valido: true, parsed };
    } catch (err: any) {
      setErroSintaxeJson(err.message || 'Erro de sintaxe no JSON');
      return { valido: false };
    }
  };

  // Alterna entre partes individuais no dropdown ou chips
  const handleSelectPart = (targetIdx: number) => {
    if (isNaN(targetIdx) || targetIdx === selectedPartIndex) return;

    // 1. Salva o texto atual na parte ativa
    const updatedParts = [...localParts];
    if (updatedParts[selectedPartIndex]) {
      updatedParts[selectedPartIndex] = {
        ...updatedParts[selectedPartIndex],
        xml: xmlCode,
      };
      setLocalParts(updatedParts);
    }

    // 2. Carrega o texto da nova parte selecionada
    if (updatedParts[targetIdx]) {
      setSelectedPartIndex(targetIdx);
      setXmlCode(updatedParts[targetIdx].xml);
      validarXml(updatedParts[targetIdx].xml);
    }
  };

  const handleFormat = () => {
    if (activeTab === 'json') {
      const res = validarJson(jsonCode);
      if (res.valido && res.parsed) {
        setJsonCode(JSON.stringify(res.parsed, null, 2));
      }
    } else {
      const isOk = validarXml(xmlCode);
      if (isOk) {
        try {
          const formatted = formatarXml(xmlCode);
          if (formatted && formatted.length > 10) {
            setXmlCode(formatted);
          }
        } catch {}
      }
    }
  };

  const handleApply = () => {
    let finalXml = xmlCode;
    let updatedParts = localParts && localParts.length > 0 ? [...localParts] : [];

    // Se houver partes, atualiza a parte atual e gera o XML unificado completo
    if (updatedParts.length > 0 && updatedParts[selectedPartIndex]) {
      updatedParts[selectedPartIndex] = {
        ...updatedParts[selectedPartIndex],
        xml: xmlCode,
      };
      setLocalParts(updatedParts);
      finalXml = concatenarXmlsParticionados(updatedParts);
    }

    const isXmlValido = validarXml(finalXml);
    const jsonRes = validarJson(jsonCode);

    if (!isXmlValido) {
      setActiveTab('xml');
      return;
    }

    if (!jsonRes.valido) {
      setActiveTab('json');
      return;
    }

    let finalName = editName.trim() || xmlName.replace(/\.xml$/i, '');
    if (!finalName.toLowerCase().endsWith('.xml')) {
      finalName += '.xml';
    }

    if (onApply) {
      onApply(
        finalXml,
        jsonRes.parsed || {},
        finalName,
        updatedParts.length > 0 ? updatedParts : undefined
      );
    } else if (onApplyXml) {
      onApplyXml(finalXml, finalName);
    }

    setSucesso(true);
    setTimeout(() => {
      setSucesso(false);
      onClose();
    }, 600);
  };

  const handleCopy = () => {
    const contentToCopy = activeTab === 'xml' ? xmlCode : jsonCode;
    navigator.clipboard.writeText(contentToCopy).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const handleDownload = () => {
    if (activeTab === 'xml') {
      const blob = new Blob([xmlCode], { type: 'text/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      let downloadName = '';
      if (localParts && localParts.length > 0 && localParts[selectedPartIndex]) {
        downloadName = localParts[selectedPartIndex].nome;
      } else {
        const baseName = editName.trim() || xmlName.replace(/\.xml$/i, '');
        downloadName = baseName.endsWith('.xml') ? baseName : `${baseName}.xml`;
      }

      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([jsonCode], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = (editName.trim() || xmlName.replace(/\.xml$/i, '')).replace(/\.json$/i, '');
      a.download = `${baseName}_dados.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const xmlLinesCount = xmlCode.split('\n').length;
  const jsonLinesCount = jsonCode.split('\n').length;

  let chavesJsonCount = 0;
  try {
    const parsed = JSON.parse(jsonCode);
    if (parsed && typeof parsed === 'object') {
      chavesJsonCount = Object.keys(parsed).length;
    }
  } catch {}

  const erroAtual = activeTab === 'xml' ? erroSintaxeXml : erroSintaxeJson;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 text-slate-100 rounded-xl shadow-2xl border border-slate-700 w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-4 py-2.5 bg-slate-950 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            
            <div className="min-w-0 flex flex-col justify-center">
              <span className="text-[11px] text-slate-400 font-medium leading-tight">Nome do Modelo:</span>
              <div className="flex items-center gap-2 mt-0.5">
                {isEditingName ? (
                  <input
                    autoFocus
                    className="text-xs font-mono bg-slate-800 text-white px-2 py-0.5 rounded outline-none border border-purple-500 min-w-[180px]"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') setIsEditingName(false);
                      if (e.key === 'Escape') {
                        setEditName(xmlName.replace(/\.xml$/i, ''));
                        setIsEditingName(false);
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(xmlName.replace(/\.xml$/i, ''));
                      setIsEditingName(true);
                    }}
                    className="flex items-center text-xs font-mono bg-slate-800 hover:bg-slate-700 text-purple-300 px-2 py-0.5 rounded border border-slate-700 transition-colors w-fit"
                    title="Clique para renomear o documento"
                  >
                    <span>{editName || xmlName.replace(/\.xml$/i, '')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleFormat}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title={activeTab === 'json' ? 'Formatar e Indentar JSON' : 'Reformatar XML'}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Formatar</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title={`Copiar código ${activeTab.toUpperCase()}`}
            >
              {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiado ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title={
                activeTab === 'xml' && localParts && localParts.length > 0 && localParts[selectedPartIndex]
                  ? `Baixar arquivo da parte ${localParts[selectedPartIndex].nome}`
                  : `Baixar arquivo .${activeTab}`
              }
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">
                {activeTab === 'xml' && localParts && localParts.length > 0 && localParts[selectedPartIndex]
                  ? `Baixar Parte [${localParts[selectedPartIndex].index < 10 ? '0' + localParts[selectedPartIndex].index : localParts[selectedPartIndex].index}]`
                  : `Baixar .${activeTab}`}
              </span>
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition ml-1"
              title="Compilar e aplicar modelo XML (Ctrl + S)"
            >
              {sucesso ? <Check className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{sucesso ? 'Aplicado com Sucesso!' : 'Compilar & Aplicar'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab & Part Selector Bar */}
        <div className="px-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('xml')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
                activeTab === 'xml'
                  ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-purple-400" />
              <span>XML (Modelo)</span>
              {erroSintaxeXml && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Erro no XML" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
                activeTab === 'json'
                  ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Braces className="w-3.5 h-3.5 text-amber-400" />
              <span>JSON (Dados)</span>
              {erroSintaxeJson && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Erro no JSON" />
              )}
            </button>
          </div>

          {/* Multi-Part Selector Bar - APENAS LISTA DE PARTES */}
          {activeTab === 'xml' && localParts && localParts.length > 0 ? (
            <div className="flex items-center gap-1.5 py-1 bg-purple-950/40 px-2.5 rounded-lg border border-purple-800/50">
              <label htmlFor="xml-part-select" className="text-xs text-purple-300 flex items-center shrink-0" title="Selecionar Parte do Modelo">
                <Layers className="w-4 h-4 text-purple-400" />
              </label>

              {/* Dropdown de Partes */}
              <select
                id="xml-part-select"
                value={selectedPartIndex}
                onChange={e => handleSelectPart(parseInt(e.target.value, 10))}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-purple-200 border border-purple-500/70 hover:border-purple-400 rounded-md px-2.5 py-1 outline-none focus:ring-1 focus:ring-purple-400 transition cursor-pointer font-medium shadow-xs"
              >
                {localParts.map((part, idx) => (
                  <option key={idx} value={idx}>
                    📑 [Parte {part.index < 10 ? '0' + part.index : part.index}] {part.nome}
                  </option>
                ))}
              </select>
            </div>
          ) : activeTab === 'xml' ? (
            <div className="flex items-center gap-1.5 py-1 px-2 rounded bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium">
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>Arquivo Único (Monolítico)</span>
            </div>
          ) : null}

          <div className="text-[11px] text-slate-500 hidden xl:flex items-center gap-3">
            <span>Atalho: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Ctrl + S</kbd> para aplicar</span>
          </div>
        </div>

        {/* Syntax Error Banner */}
        {erroAtual && (
          <div className="bg-red-950/90 border-b border-red-800 px-4 py-2 text-xs text-red-200 flex items-center gap-2 shrink-0 animate-in fade-in duration-100">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-mono">{erroAtual}</span>
          </div>
        )}

        {/* Code Editor Body */}
        <div className="flex-1 p-0 relative overflow-hidden flex flex-col bg-slate-950">
          {activeTab === 'xml' ? (
            <CodeMirrorEditor
              value={xmlCode}
              onChange={code => {
                setXmlCode(code);
                validarXml(code);
              }}
              language="xml"
              onSave={handleApply}
              placeholder="<!-- Insira o código XML da parte aqui -->"
            />
          ) : (
            <CodeMirrorEditor
              value={jsonCode}
              onChange={code => {
                setJsonCode(code);
                validarJson(code);
              }}
              language="json"
              onSave={handleApply}
              placeholder='{\n  "campo": "valor"\n}'
            />
          )}
        </div>

        {/* Footer Reference / Tips */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {activeTab === 'xml' ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              <strong className="text-slate-300">Tags suportadas:</strong>
              <code className="text-purple-300">&lt;formulario&gt;</code>
              <code className="text-purple-300">&lt;grupo&gt;</code>
              <code className="text-purple-300">&lt;secao&gt;</code>
              <code className="text-purple-300">&lt;input&gt;</code>
              <code className="text-purple-300">&lt;number&gt;</code>
              <code className="text-purple-300">&lt;select&gt;</code>
              <code className="text-purple-300">&lt;if expr="..."&gt;</code>
              <code className="text-purple-300">&lt;foreach&gt;</code>
              <code className="text-purple-300">&lt;tabela&gt;</code>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 flex-wrap">
              <strong className="text-slate-300">JSON de Dados:</strong>
              <span className="text-slate-400">Edite valores de campos, listas de repetição e propriedades para sincronizar instantaneamente com o formulário e documento.</span>
            </span>
          )}
          
          <span className="text-slate-500">
            Pressione <strong>Compilar & Aplicar</strong> para atualizar ao vivo.
          </span>
        </div>
      </div>
    </div>
  );
};

