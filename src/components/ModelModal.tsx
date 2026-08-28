import React from 'react';
import {
  AlertTriangle,
  Braces,
  Check,
  Code,
  Copy,
  Download,
  Edit2,
  Eye,
  FileCode,
  Filter,
  Layers,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Table,
  Sliders,
  X,
} from 'lucide-react';
import { IntermediateModel } from '../types';
import { parseXmlDocument } from '../utils/xmlParser';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { VarsTabEditor, VarsTableResumo } from './ModelModal/VarsTabs';

export interface ModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelo: IntermediateModel;
  rawXml?: string;
  xmlName: string;
  onUpdateField: (id: string, value: any) => void;
  onUpdateMultipleFields?: (novosDados: Record<string, any>) => void;
  onApplyXml?: (novoXml: string, novoNome?: string) => void;
  onApplyAll?: (novoXml: string, novosDados: Record<string, any>, novoNome?: string) => void;
  initialTab?: TabType;
}

export type TabType = 'vars-edit' | 'vars-readonly' | 'json-dados' | 'xml-edit' | 'json-modelo';

function formatarXmlString(xmlStr: string): string {
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

export const ModelModal: React.FC<ModelModalProps> = ({
  isOpen,
  onClose,
  modelo,
  rawXml = '',
  xmlName,
  onUpdateField,
  onUpdateMultipleFields,
  onApplyXml,
  onApplyAll,
  initialTab = 'vars-edit',
}) => {
  const [tab, setTab] = React.useState<TabType>(initialTab);
  const [busca, setBusca] = React.useState('');
  const [filtroStatus, setFiltroStatus] = React.useState<'todos' | 'preenchidos' | 'vazios'>('todos');
  const [copiado, setCopiado] = React.useState(false);

  // Estados de Edição JSON
  const [isEditingJson, setIsEditingJson] = React.useState(false);
  const [jsonCode, setJsonCode] = React.useState('');
  const [erroSintaxeJson, setErroSintaxeJson] = React.useState<string | null>(null);
  const [sucessoJson, setSucessoJson] = React.useState(false);

  // Estados de Edição XML
  const [xmlCode, setXmlCode] = React.useState('');
  const [editXmlName, setEditXmlName] = React.useState('');
  const [isEditingXmlName, setIsEditingXmlName] = React.useState(false);
  const [erroSintaxeXml, setErroSintaxeXml] = React.useState<string | null>(null);
  const [sucessoXml, setSucessoXml] = React.useState(false);

  const campos = modelo?.formulario?.campos || {};
  const dados = modelo?.dados || {};
  const chaves = Object.keys(campos);

  const payloadDados = {
    xml: xmlName,
    dados,
  };

  // Inicializa quando o modal abre ou os dados mudam
  React.useEffect(() => {
    if (isOpen) {
      const formattedJson = JSON.stringify(payloadDados, null, 2);
      setJsonCode(formattedJson);
      setXmlCode(rawXml || '');
      setEditXmlName(xmlName.replace(/\.xml$/i, ''));
      setErroSintaxeJson(null);
      setErroSintaxeXml(null);
      setIsEditingJson(false);
      setIsEditingXmlName(false);
      if (initialTab) setTab(initialTab);
    }
  }, [isOpen, rawXml, xmlName, initialTab]);

  if (!isOpen) return null;

  const copiarConteudo = (texto: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const baixarArquivo = (conteudo: string, filename: string, type = 'application/json;charset=utf-8') => {
    const blob = new Blob([conteudo], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Validação JSON
  const validarJson = (jsonStr: string): { valido: boolean; extrairDados?: Record<string, any> } => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setErroSintaxeJson('O JSON deve ser um objeto válido.');
        return { valido: false };
      }
      // Se tiver estrutura { xml: '...', dados: { ... } }, extrai o interior
      let targetDados = parsed;
      if (parsed.dados && typeof parsed.dados === 'object' && !Array.isArray(parsed.dados)) {
        targetDados = parsed.dados;
      }
      setErroSintaxeJson(null);
      return { valido: true, extrairDados: targetDados };
    } catch (err: any) {
      setErroSintaxeJson(err.message || 'Erro de sintaxe no JSON');
      return { valido: false };
    }
  };

  // Formatar JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonCode);
      setJsonCode(JSON.stringify(parsed, null, 2));
      setErroSintaxeJson(null);
    } catch (e: any) {
      setErroSintaxeJson(e.message || 'JSON inválido para formatar');
    }
  };

  // Aplicar alterações do JSON
  const handleApplyJson = () => {
    const check = validarJson(jsonCode);
    if (!check.valido || !check.extrairDados) return;

    if (onUpdateMultipleFields) {
      onUpdateMultipleFields(check.extrairDados);
    } else {
      Object.entries(check.extrairDados).forEach(([k, v]) => {
        onUpdateField(k, v);
      });
    }

    setSucessoJson(true);
    setTimeout(() => {
      setSucessoJson(false);
      setIsEditingJson(false);
    }, 600);
  };

  // Validação XML
  const validarXml = (xmlStr: string): boolean => {
    try {
      parseXmlDocument(xmlStr);
      setErroSintaxeXml(null);
      return true;
    } catch (err: any) {
      setErroSintaxeXml(err.message || 'Erro de sintaxe no XML');
      return false;
    }
  };

  // Formatar XML
  const handleFormatXml = () => {
    const isOk = validarXml(xmlCode);
    if (isOk) {
      const formatted = formatarXmlString(xmlCode);
      if (formatted && formatted.length > 10) {
        setXmlCode(formatted);
      }
    }
  };

  // Aplicar alterações do XML
  const handleApplyXml = () => {
    if (!validarXml(xmlCode)) return;

    let finalName = editXmlName.trim() || xmlName.replace(/\.xml$/i, '');
    if (!finalName.toLowerCase().endsWith('.xml')) {
      finalName += '.xml';
    }

    if (onApplyAll) {
      onApplyAll(xmlCode, dados, finalName);
    } else if (onApplyXml) {
      onApplyXml(xmlCode, finalName);
    }

    setSucessoXml(true);
    setTimeout(() => {
      setSucessoXml(false);
    }, 800);
  };

  const handleJsonKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleApplyJson();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      setJsonCode(newVal);
      validarJson(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleXmlKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleApplyXml();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      setXmlCode(newVal);
      validarXml(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const chavesFiltradas = chaves.filter(k => {
    const campo = campos[k];
    const valor = dados[k];
    const temValor = valor !== '' && valor !== null && valor !== undefined && valor !== false;

    if (filtroStatus === 'preenchidos' && !temValor) return false;
    if (filtroStatus === 'vazios' && temValor) return false;

    if (busca.trim()) {
      const q = busca.toLowerCase();
      const matchKey = k.toLowerCase().includes(q);
      const matchLabel = (campo?.label || '').toLowerCase().includes(q);
      const matchVal = String(valor || '').toLowerCase().includes(q);
      return matchKey || matchLabel || matchVal;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-slate-100">Painel de Variáveis & Modelo</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {xmlName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Edição e inspeção de modelo XML, variáveis e payload JSON</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5">
            <button
              type="button"
              onClick={() => setTab('vars-edit')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                tab === 'vars-edit'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-slate-600'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Variáveis</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('vars-readonly')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                tab === 'vars-readonly'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-slate-600'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tabela Resumo</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('json-dados')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                tab === 'json-dados'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-slate-600'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Braces className="w-3.5 h-3.5 text-emerald-600" />
              <span>JSON Dados</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('xml-edit')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                tab === 'xml-edit'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-slate-600'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-purple-600" />
              <span>Editar Modelo (XML)</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('json-modelo')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                tab === 'json-modelo'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-slate-600'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-sky-600" />
              <span>JSON Modelo Completo</span>
            </button>
          </div>

          {/* Botões Copiar e Baixar padronizados no canto superior direito (idêntico em todas as abas de código) */}
          {(tab === 'json-dados' || tab === 'xml-edit' || tab === 'json-modelo') && (
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => {
                  if (tab === 'json-dados') {
                    copiarConteudo(isEditingJson ? jsonCode : JSON.stringify(payloadDados, null, 2));
                  } else if (tab === 'xml-edit') {
                    copiarConteudo(xmlCode);
                  } else {
                    copiarConteudo(JSON.stringify(modelo, null, 2));
                  }
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                title={
                  tab === 'json-dados'
                    ? 'Copiar dados JSON'
                    : tab === 'xml-edit'
                    ? 'Copiar código XML do Modelo'
                    : 'Copiar JSON completo do Modelo'
                }
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (tab === 'json-dados') {
                    baixarArquivo(
                      isEditingJson ? jsonCode : JSON.stringify(payloadDados, null, 2),
                      `${xmlName.replace(/\.xml$/i, '')}_dados.json`
                    );
                  } else if (tab === 'xml-edit') {
                    const downloadName = (editXmlName.trim() || xmlName.replace(/\.xml$/i, '')) + '.xml';
                    baixarArquivo(xmlCode, downloadName, 'text/xml;charset=utf-8');
                  } else {
                    baixarArquivo(JSON.stringify(modelo, null, 2), `modelo_arvore_${xmlName}.json`);
                  }
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
                title={
                  tab === 'json-dados'
                    ? 'Baixar arquivo JSON de dados'
                    : tab === 'xml-edit'
                    ? 'Baixar arquivo XML do Modelo'
                    : 'Baixar JSON completo do Modelo'
                }
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter bar for Variable Tabs */}
        {(tab === 'vars-edit' || tab === 'vars-readonly') && (
          <div className="px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nome ou ID..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              <button
                type="button"
                onClick={() => setFiltroStatus('todos')}
                className={`px-2.5 py-1 rounded transition ${
                  filtroStatus === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Todos ({chaves.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('preenchidos')}
                className={`px-2.5 py-1 rounded transition ${
                  filtroStatus === 'preenchidos' ? 'bg-emerald-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Preenchidos
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('vazios')}
                className={`px-2.5 py-1 rounded transition ${
                  filtroStatus === 'vazios' ? 'bg-amber-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Pendentes
              </button>
            </div>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 flex flex-col">
          {tab === "vars-edit" && (
            <VarsTabEditor
              chavesFiltradas={chavesFiltradas}
              estrutura={modelo?.formulario}
              dados={dados}
              onUpdateField={onUpdateField}
            />
          )}
          {tab === "vars-readonly" && (
            <VarsTableResumo
              chavesFiltradas={chavesFiltradas}
              estrutura={modelo?.formulario}
              dados={dados}
            />
          )}
          {tab === 'json-dados' && (
            <div className="flex flex-col flex-1 h-full min-h-[380px] space-y-2">
              {erroSintaxeJson && (
                <div className="bg-red-950/90 border border-red-800 px-3 py-2 text-xs text-red-200 rounded-md flex items-center gap-2 shrink-0 animate-in fade-in duration-100">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="font-mono">{erroSintaxeJson}</span>
                </div>
              )}

              <div className="flex-1 min-h-[360px] relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex flex-col shadow-inner">
                <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] text-emerald-400/90 flex items-center justify-between shrink-0 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {isEditingJson ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-semibold text-emerald-300">Modo de Edição Ativo (JSON de Dados)</span>
                        <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">(Ctrl + S para aplicar)</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-mono text-slate-300">payload_dados.json</span>
                        <span className="text-slate-500 text-[10px] hidden sm:inline">(Modo de leitura com cores ativas)</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isEditingJson ? (
                      <>
                        <button
                          type="button"
                          onClick={handleFormatJson}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 hover:bg-slate-700 transition"
                          title="Formatar e indentar JSON de Dados"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Formatar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsEditingJson(false)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 hover:bg-slate-700 transition"
                          title="Voltar ao modo de visualização"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Visualizar</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleApplyJson}
                          className="flex items-center gap-1 text-xs font-semibold px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-xs transition"
                          title="Aplicar dados ao formulário (Ctrl + S)"
                        >
                          {sucessoJson ? <Check className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                          <span>{sucessoJson ? 'Aplicado!' : 'Aplicar Dados'}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingJson(true);
                          setJsonCode(JSON.stringify(payloadDados, null, 2));
                        }}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-xs transition"
                        title="Habilitar edição dos dados JSON"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Habilitar Edição</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden bg-slate-950 flex flex-col">
                  <CodeMirrorEditor
                    value={isEditingJson ? jsonCode : JSON.stringify(payloadDados, null, 2)}
                    onChange={code => {
                      if (isEditingJson) {
                        setJsonCode(code);
                        validarJson(code);
                      }
                    }}
                    language="json"
                    readOnly={!isEditingJson}
                    onSave={isEditingJson ? handleApplyJson : undefined}
                    placeholder='{\n  "campo": "valor"\n}'
                  />
                </div>
              </div>
            </div>
          )}

          {/* EDITAR MODELO XML TAB: Editor XML com validação, renomear e compilação */}
          {tab === 'xml-edit' && (
            <div className="flex flex-col flex-1 h-full min-h-[380px] space-y-2">
              {erroSintaxeXml && (
                <div className="bg-red-950/90 border border-red-800 px-3 py-2 text-xs text-red-200 rounded-md flex items-center gap-2 shrink-0 animate-in fade-in duration-100">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="font-mono">{erroSintaxeXml}</span>
                </div>
              )}

              <div className="flex-1 min-h-[360px] relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex flex-col shadow-inner">
                <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] text-purple-300 flex items-center justify-between shrink-0 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Nome do Modelo:</span>
                    {isEditingXmlName ? (
                      <input
                        autoFocus
                        className="text-xs font-mono bg-slate-800 text-white px-2 py-0.5 rounded outline-none border border-purple-500 min-w-[180px]"
                        value={editXmlName}
                        onChange={e => setEditXmlName(e.target.value)}
                        onBlur={() => setIsEditingXmlName(false)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === 'Escape') setIsEditingXmlName(false);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingXmlName(true)}
                        className="flex items-center text-xs font-mono bg-slate-800 hover:bg-slate-700 text-purple-300 px-2 py-0.5 rounded border border-slate-700 transition-colors"
                        title="Clique para renomear este modelo"
                      >
                        <span>{(editXmlName || xmlName.replace(/\.xml$/i, '')) + '.xml'}</span>
                      </button>
                    )}
                    <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">(Ctrl + S para compilar)</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleFormatXml}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 hover:bg-slate-700 transition"
                      title="Formatar tags do XML"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Formatar XML</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyXml}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded shadow-xs transition"
                      title="Compilar e aplicar modelo XML (Ctrl + S)"
                    >
                      {sucessoXml ? <Check className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                      <span>{sucessoXml ? 'Compilado!' : 'Compilar & Aplicar'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden bg-slate-950 flex flex-col">
                  <CodeMirrorEditor
                    value={xmlCode}
                    onChange={code => {
                      setXmlCode(code);
                      validarXml(code);
                    }}
                    language="xml"
                    onSave={handleApplyXml}
                    placeholder="<!-- Insira o código XML do modelo aqui -->"
                  />
                </div>
              </div>
            </div>
          )}

          {/* JSON MODELO COMPLETO TAB */}
          {tab === 'json-modelo' && (
            <div className="flex-1 min-h-[360px] rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex flex-col shadow-inner">
              <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] text-sky-300 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span className="font-mono text-slate-300">modelo_ast_completo.json</span>
                  <span className="text-slate-500 text-[10px] hidden sm:inline">(Árvore de componentes e metadados)</span>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden bg-slate-950 flex flex-col">
                <CodeMirrorEditor
                  value={JSON.stringify(modelo, null, 2)}
                  language="json"
                  readOnly={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

