/**
 * =========================================================================================
 * PROPOSTA DE DECOMPOSIÇÃO APLICADA (Sidebar):
 * 
 * 1. Sidebar.tsx: Orquestrador da barra lateral, gerenciamento de acordeões, busca e auto-scroll (~200 linhas).
 * 2. SidebarHeader.tsx: Barra de progresso de preenchimento, campo de busca de campos e botão expandir/recolher tudo.
 * 3. SidebarGroupAccordion.tsx: Bloco colapsável modular para cada <grupo> do formulário.
 * 4. fields/: Componentes especialistas desacoplados por tipo de entrada:
 *    - TextFieldInput.tsx: Inputs de texto e strings com máscaras automáticas (CPF, CNPJ, Moeda, CEP, etc.).
 *    - NumberFieldInput.tsx: Inputs numéricos (min, max, step, quantitativos).
 *    - DateFieldInput.tsx: Seletores de data.
 *    - TextAreaFieldInput.tsx: Áreas de texto com múltiplas linhas e auto-redimensionamento.
 *    - SelectFieldInput.tsx: Caixas de seleção suspensas (dropdowns com suporte a opções condicionais).
 *    - ChoiceFieldInput.tsx: Caixas de opção exclusivas (radios) e booleanas (checkboxes) com sub-inputs aninhados.
 * =========================================================================================
 */

import React from 'react';
import {
  AlertCircle,
  Building,
  ChevronRight,
  Loader2,
  MapPin,
} from 'lucide-react';
import { FieldMetadata, FormItem, FormStructure } from '../types';
import {
  normalizarDigitos,
  validarCEP,
  validarCNPJ,
  validarCPF,
  validarEmail,
} from '../utils/documentUtils';
import { avaliarExpressao } from '../utils/expressionEvaluator';
import { SidebarHeader } from './Sidebar/SidebarHeader';
import { SidebarGroupAccordion } from './Sidebar/SidebarGroupAccordion';
import { TextFieldInput } from './Sidebar/fields/TextFieldInput';
import { NumberFieldInput } from './Sidebar/fields/NumberFieldInput';
import { DateFieldInput } from './Sidebar/fields/DateFieldInput';
import { TextAreaFieldInput } from './Sidebar/fields/TextAreaFieldInput';
import { SelectFieldInput } from './Sidebar/fields/SelectFieldInput';
import { ChoiceFieldInput } from './Sidebar/fields/ChoiceFieldInput';

interface SidebarProps {
  estrutura: FormStructure;
  dados: Record<string, any>;
  onChange: (id: string, valor: any, origem?: string) => void;
  onFieldFocus?: (id: string) => void;
  campoFocadoSidebar?: { id: string; timestamp: number } | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  sidebarWidth: number;
  headerActions?: React.ReactNode;
  deslocarSidebar?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  estrutura,
  dados,
  onChange,
  onFieldFocus,
  campoFocadoSidebar,
  collapsed,
  onToggleCollapse,
  sidebarWidth,
  headerActions,
  deslocarSidebar = true,
}) => {
  const [busca, setBusca] = React.useState('');
  const [secoesAbertas, setSecoesAbertas] = React.useState<Record<number, boolean>>({});
  const [cnpjLookup, setCnpjLookup] = React.useState<{
    loading: boolean;
    data: any | null;
    error: string | null;
    cnpj: string;
  }>({ loading: false, data: null, error: null, cnpj: '' });

  const [cepLookup, setCepLookup] = React.useState<{
    loading: boolean;
    data: any | null;
    error: string | null;
    cep: string;
  }>({ loading: false, data: null, error: null, cep: '' });

  // Inicializa seções abertas
  React.useEffect(() => {
    const estado: Record<number, boolean> = {};
    let saved: Record<number, boolean> | null = null;
    try {
      const stored = localStorage.getItem('edm_sidebar_groups');
      if (stored) saved = JSON.parse(stored);
    } catch {}

    estrutura.grupos.forEach((_, idx) => {
      if (saved && saved[idx] !== undefined) {
        estado[idx] = saved[idx];
      } else {
        estado[idx] = true;
      }
    });
    setSecoesAbertas(estado);
  }, [estrutura]);

  // Salva no localStorage sempre que mudar
  React.useEffect(() => {
    if (Object.keys(secoesAbertas).length > 0) {
      localStorage.setItem('edm_sidebar_groups', JSON.stringify(secoesAbertas));
    }
  }, [secoesAbertas]);

  // Efeito para rolar e focar suavemente no campo quando solicitado pelo Documento ou por If blocks
  React.useEffect(() => {
    if (!campoFocadoSidebar?.id) return;
    const targetId = campoFocadoSidebar.id;

    const grupoIdx = estrutura.grupos.findIndex(g => g.campos && g.campos.includes(targetId));
    if (grupoIdx >= 0) {
      setSecoesAbertas(prev => ({ ...prev, [grupoIdx]: true }));
    }

    if (busca) {
      setBusca('');
    }

    setTimeout(() => {
      const container = document.getElementById(`campo-container-${targetId}`);
      if (container) {
        if (deslocarSidebar) {
          container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const input = container.querySelector('input, select, textarea') as HTMLElement;
        if (input) {
          input.focus({ preventScroll: true });
        }

        container.classList.remove('campo-foco-animado');
        void container.offsetWidth;
        container.classList.add('campo-foco-animado');
        setTimeout(() => container.classList.remove('campo-foco-animado'), 7100);
      }
    }, 100);
  }, [campoFocadoSidebar, estrutura, deslocarSidebar]);

  // Consulta API de CNPJ (OpenCNPJ)
  React.useEffect(() => {
    const cnpj = normalizarDigitos(dados?.cnpj || dados?.contratante_cnpj || dados?.contratada_cnpj);
    if (!cnpj || cnpj.length !== 14 || !validarCNPJ(cnpj)) {
      setCnpjLookup({ loading: false, data: null, error: null, cnpj });
      return;
    }

    let cancelado = false;
    setCnpjLookup(prev => (prev.cnpj === cnpj && prev.data ? prev : { loading: true, data: null, error: null, cnpj }));

    const timer = setTimeout(() => {
      fetch(`https://api.opencnpj.org/${cnpj}`)
        .then(async res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(info => {
          if (cancelado) return;
          setCnpjLookup({ loading: false, data: info, error: null, cnpj });
        })
        .catch(() => {
          if (cancelado) return;
          setCnpjLookup({
            loading: false,
            data: null,
            error: 'Dados da empresa indisponíveis no momento',
            cnpj,
          });
        });
    }, 600);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [dados?.cnpj, dados?.contratante_cnpj, dados?.contratada_cnpj]);

  // Consulta API de CEP (ViaCEP)
  React.useEffect(() => {
    const cep = normalizarDigitos(dados?.cep || dados?.contratante_cep);
    if (!cep || cep.length !== 8) {
      setCepLookup({ loading: false, data: null, error: null, cep });
      return;
    }

    let cancelado = false;
    setCepLookup(prev => (prev.cep === cep && prev.data ? prev : { loading: true, data: null, error: null, cep }));

    const timer = setTimeout(() => {
      fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(async res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(info => {
          if (cancelado) return;
          if (info.erro) {
            setCepLookup({ loading: false, data: null, error: 'CEP não localizado na base', cep });
          } else {
            setCepLookup({ loading: false, data: info, error: null, cep });
          }
        })
        .catch(() => {
          if (cancelado) return;
          setCepLookup({ loading: false, data: null, error: 'Erro ao consultar CEP', cep });
        });
    }, 500);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [dados?.cep, dados?.contratante_cep]);

  const toggleGrupo = (idx: number) => {
    setSecoesAbertas(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const expandirOuRecolherTudo = () => {
    const allOpen = Object.values(secoesAbertas).every(Boolean);
    const novo: Record<number, boolean> = {};
    estrutura.grupos.forEach((_, idx) => {
      novo[idx] = !allOpen;
    });
    setSecoesAbertas(novo);
  };

  const campoVisivel = (campo: FieldMetadata) => {
    if (!campo.condicao) return true;
    return avaliarExpressao(campo.condicao, dados);
  };

  const isValido = (campo: FieldMetadata, valor: any): { valido: boolean; msg?: string } => {
    const v = String(valor ?? '').trim();
    if (!v) {
      return { valido: true };
    }
    const valType = (campo.validar || campo.tipoInput || '').toLowerCase();
    if (valType === 'email' && !validarEmail(v)) {
      return { valido: false, msg: 'E-mail em formato inválido' };
    }
    if (valType === 'cpf' && !validarCPF(v)) {
      return { valido: false, msg: 'CPF inválido (verifique os dígitos verificadores)' };
    }
    if (valType === 'cnpj' && !validarCNPJ(v)) {
      return { valido: false, msg: 'CNPJ inválido (verifique os dígitos verificadores)' };
    }
    if (valType === 'cpfcnpj' && !validarCPF(v) && !validarCNPJ(v)) {
      return { valido: false, msg: 'CPF ou CNPJ inválido' };
    }
    if (valType === 'cep' && !validarCEP(v)) {
      return { valido: false, msg: 'CEP deve conter 8 dígitos' };
    }
    return { valido: true };
  };

  const renderCampo = (campoId: string, nivel = 0) => {
    const campo = estrutura.campos[campoId];
    if (!campo || !campoVisivel(campo)) return null;

    if (busca.trim()) {
      const q = busca.toLowerCase();
      const matchLabel = campo.label.toLowerCase().includes(q);
      const matchId = campo.id.toLowerCase().includes(q);
      const matchDesc = (campo.descricao || '').toLowerCase().includes(q);
      if (!matchLabel && !matchId && !matchDesc) return null;
    }

    const valor = dados[campo.id] ?? '';
    const statusValidacao = isValido(campo, valor);
    const isCondicional = Boolean(campo.condicao || nivel > 0);

    return (
      <div
        key={campo.id}
        id={`campo-container-${campo.id}`}
        data-field-id={campo.id}
        onPointerDown={() => onFieldFocus?.(campo.id)}
        style={{
          '--campo-border-orig': isCondicional ? 'rgba(191, 219, 254, 0.8)' : '#e2e8f0',
        } as React.CSSProperties}
        className={`group relative p-3 rounded-lg border transition-all duration-200 ${
          isCondicional
            ? 'bg-blue-50/60 border-blue-200/80 ml-3 pl-3 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
        } ${!statusValidacao.valido ? 'border-red-300 ring-1 ring-red-200' : ''}`}
      >
        {/* Label & Type Tag */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          {campo.tipo === 'radio' || campo.tipo === 'checkbox' ? (
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 select-none">
              <span>{campo.label}</span>
            </span>
          ) : (
            <label
              htmlFor={campo.id}
              className="text-xs font-semibold text-slate-800 cursor-pointer flex items-center gap-1.5 select-none"
            >
              <span>{campo.label}</span>
            </label>
          )}

          <span className="text-[10px] font-mono text-slate-400 group-hover:text-blue-600 transition-colors">
            {`{{${campo.id}}}`}
          </span>
        </div>

        {/* Input especializado desacoplado por tipo */}
        {campo.tipo === 'input' && (
          <TextFieldInput
            campo={campo}
            valor={valor}
            onChange={onChange}
            statusValidacao={statusValidacao}
          />
        )}

        {campo.tipo === 'number' && (
          <NumberFieldInput
            campo={campo}
            valor={valor}
            onChange={onChange}
          />
        )}

        {campo.tipo === 'date' && (
          <DateFieldInput
            campo={campo}
            valor={valor}
            onChange={onChange}
          />
        )}

        {campo.tipo === 'textarea' && (
          <TextAreaFieldInput
            campo={campo}
            valor={valor}
            onChange={onChange}
          />
        )}

        {campo.tipo === 'select' && (
          <SelectFieldInput
            campo={campo}
            valor={valor}
            dados={dados}
            onChange={onChange}
          />
        )}

        {(campo.tipo === 'radio' || campo.tipo === 'checkbox') && (
          <ChoiceFieldInput
            campo={campo}
            valor={valor}
            dados={dados}
            onChange={onChange}
            nivel={nivel}
            renderCampo={renderCampo}
          />
        )}

        {/* Mensagem de Erro de Validação */}
        {!statusValidacao.valido && (
          <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {statusValidacao.msg}
          </p>
        )}

        {/* Texto descritivo de ajuda */}
        {campo.descricao && (
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{campo.descricao}</p>
        )}

        {/* Feedback visual de consulta de CNPJ */}
        {campo.tipoInput === 'cnpj' && cnpjLookup.cnpj === normalizarDigitos(valor) && (
          <div className="mt-2 text-xs">
            {cnpjLookup.loading && (
              <div className="flex items-center gap-1.5 text-blue-600 py-1 bg-blue-50 px-2 rounded">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Consultando dados da empresa no OpenCNPJ...</span>
              </div>
            )}
            {cnpjLookup.data && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-950 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1 text-emerald-800">
                    <Building className="w-3.5 h-3.5" />
                    {cnpjLookup.data.razao_social || 'Empresa Identificada'}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800 leading-tight">
                  <p>
                    Situação:{' '}
                    <span className="font-semibold">{cnpjLookup.data.situacao_cadastral || 'Ativa'}</span>
                  </p>
                  <p>
                    Local: {cnpjLookup.data.municipio} - {cnpjLookup.data.uf}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback visual de consulta de CEP */}
        {campo.tipoInput === 'cep' && cepLookup.cep === normalizarDigitos(valor) && (
          <div className="mt-2 text-xs">
            {cepLookup.loading && (
              <div className="flex items-center gap-1.5 text-blue-600 py-1 bg-blue-50 px-2 rounded">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Buscando endereço no ViaCEP...</span>
              </div>
            )}
            {cepLookup.data && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-950 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1 text-emerald-800">
                    <MapPin className="w-3.5 h-3.5" />
                    {cepLookup.data.localidade} - {cepLookup.data.uf}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  {cepLookup.data.logradouro}, {cepLookup.data.bairro}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderItens = (itens: FormItem[], nivel = 0) => {
    return itens.map((item, idx) => {
      if (item.tipo === 'campo') {
        return renderCampo(item.id, nivel);
      }
      if (item.tipo === 'if') {
        if (!item.expr || !avaliarExpressao(item.expr, dados)) return null;
        return (
          <div key={idx} className="space-y-2 border-l-2 border-blue-400 pl-2 my-1">
            {renderItens(item.itens, nivel + 1)}
          </div>
        );
      }
      return null;
    });
  };

  const grupoPossuiCamposVisiveis = React.useCallback((itens: FormItem[]): boolean => {
    for (const item of itens) {
      if (item.tipo === 'campo') {
        const campo = estrutura.campos[item.id];
        if (!campo || !campoVisivel(campo)) continue;

        if (busca.trim()) {
          const q = busca.toLowerCase();
          const matchLabel = campo.label.toLowerCase().includes(q);
          const matchId = campo.id.toLowerCase().includes(q);
          const matchDesc = (campo.descricao || '').toLowerCase().includes(q);
          if (matchLabel || matchId || matchDesc) return true;
        } else {
          return true;
        }
      } else if (item.tipo === 'if') {
        if (item.expr && avaliarExpressao(item.expr, dados)) {
          if (grupoPossuiCamposVisiveis(item.itens)) return true;
        }
      }
    }
    return false;
  }, [estrutura.campos, dados, busca, campoVisivel]);

  const coletarCamposVisiveis = React.useCallback((): string[] => {
    const idsVisiveis = new Set<string>();

    const percorrerItens = (itens: FormItem[]) => {
      for (const item of itens) {
        if (item.tipo === 'campo') {
          const campo = estrutura.campos[item.id];
          if (campo && campoVisivel(campo)) {
            idsVisiveis.add(item.id);
          }
        } else if (item.tipo === 'if') {
          if (item.expr && avaliarExpressao(item.expr, dados)) {
            percorrerItens(item.itens);
          }
        }
      }
    };

    estrutura.grupos.forEach(grupo => {
      if (grupo.itens && grupo.itens.length > 0) {
        percorrerItens(grupo.itens);
      } else if (grupo.campos) {
        grupo.campos.forEach(cId => {
          const campo = estrutura.campos[cId];
          if (campo && campoVisivel(campo)) {
            idsVisiveis.add(cId);
          }
        });
      }
    });

    return Array.from(idsVisiveis);
  }, [estrutura, dados]);

  if (collapsed) {
    return (
      <aside className="w-12 bg-slate-900 border-r border-slate-800 shrink-0 flex flex-col items-center py-3 gap-3 h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition shrink-0 cursor-pointer"
          title="Expandir formulário"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {headerActions}
      </aside>
    );
  }

  const camposVisiveis = coletarCamposVisiveis();
  const totalCampos = camposVisiveis.length;
  const preenchidos = camposVisiveis.filter(id => {
    const v = dados[id];
    return v !== '' && v !== null && v !== undefined && v !== false;
  }).length;
  const pct = totalCampos > 0 ? Math.round((preenchidos / totalCampos) * 100) : 0;

  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className="bg-slate-50 border-r border-slate-200 shrink-0 flex flex-col h-full overflow-hidden select-text"
    >
      <SidebarHeader
        preenchidos={preenchidos}
        totalCampos={totalCampos}
        pct={pct}
        busca={busca}
        onBuscaChange={setBusca}
        onExpandirRecolherTudo={expandirOuRecolherTudo}
        headerActions={headerActions}
      />

      {/* Accordion Groups List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {estrutura.grupos.map((grupo, idx) => {
          if (!grupoPossuiCamposVisiveis(grupo.itens)) return null;
          const isOpen = Boolean(secoesAbertas[idx]);
          return (
            <SidebarGroupAccordion
              key={idx}
              grupo={grupo}
              idx={idx}
              isOpen={isOpen}
              onToggle={() => toggleGrupo(idx)}
              renderItens={renderItens}
            />
          );
        })}
      </div>
    </aside>
  );
};
