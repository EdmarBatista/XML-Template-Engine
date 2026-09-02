import React from 'react';
import { FormStructure } from '../../../types';
import { aplicarFiltroDocumento, obterValorPorCaminho } from '../../../utils/documentUtils';
import { DocumentInlineTableAccess } from './DocumentInlineTableAccess';
import { DocumentInlineVariable } from './DocumentInlineVariable';
import { DocumentInlineAutoTable } from './DocumentInlineAutoTable';

export const extrairTooltip = (id: string, estrutura?: FormStructure): string => {
  if (!estrutura || !estrutura.campos) return id;
  const campo = estrutura.campos[id];
  if (!campo) return id;
  const grupo = (estrutura.grupos || []).find(g => g.campos && g.campos.includes(id));
  const caminho = grupo ? `${grupo.titulo} > ${campo.label}` : campo.label;
  return campo.descricao ? `${caminho} — ${campo.descricao}` : caminho;
};

export interface ProcessarTextoOptions {
  textoOriginal: string;
  prefixKey?: string;
  ctxLocal?: Record<string, any>;
  dados: Record<string, any>;
  estrutura: FormStructure;
  destaquesAtivos: Record<string, number>;
  onFocusField: (fieldId: string) => void;
  onUpdateField: (fieldId: string, value: any, origem?: string) => void;
  edicaoInline: boolean;
  variaveisVermelhasWord: boolean;
  fontScale: number;
}

export function processarTextoComVariaveis({
  textoOriginal,
  prefixKey = 'text',
  ctxLocal,
  dados,
  estrutura,
  destaquesAtivos,
  onFocusField,
  onUpdateField,
  edicaoInline,
  variaveisVermelhasWord,
  fontScale,
}: ProcessarTextoOptions): React.ReactNode[] {
  const escopo = { ...dados, ...(ctxLocal || {}) };
  const regex = /\{\{\s*([^}|]+?)\s*(?:\|\s*([^}]+?)\s*)?\}\}/g;
  const partes: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let matchCount = 0;

  while ((match = regex.exec(textoOriginal)) !== null) {
    if (match.index > lastIdx) {
      partes.push(textoOriginal.substring(lastIdx, match.index));
    }
    const chave = match[1].trim();
    const filtro = match[2]?.trim();
    const isLocalVar = ctxLocal && Object.prototype.hasOwnProperty.call(ctxLocal, chave);
    let valorBruto = escopo[chave] !== undefined ? escopo[chave] : obterValorPorCaminho(escopo, chave);
    const valorFormatado = filtro ? aplicarFiltroDocumento(valorBruto, filtro as any) : valorBruto;

    const primeiroSegmentoCaminho = chave.includes('.') ? chave.split('.')[0] : chave;
    const ehCelulaForeachPorPonto =
      chave.includes('.') &&
      !ctxLocal?.__edmListaOrigem?.[chave] &&
      !!ctxLocal?.__edmListaOrigem?.[primeiroSegmentoCaminho];
    const origemLista =
      ctxLocal?.__edmListaOrigem?.[chave] ||
      (ehCelulaForeachPorPonto ? ctxLocal?.__edmListaOrigem?.[primeiroSegmentoCaminho] : undefined);
    const isForeachVar = !!origemLista;
    const chaveReal = origemLista || chave;

    const ehCelulaForeach = isForeachVar && ehCelulaForeachPorPonto;
    const valorBrutoReal = isForeachVar
      ? ehCelulaForeach
        ? valorBruto
        : escopo[chaveReal]
      : valorBruto;
    const listaForeachEstaVar = isForeachVar && !ehCelulaForeach;

    // Se o valor for um array de objetos (tabela/grade de dados) e a chave representar uma tabela
    const isArrayOfObjects =
      Array.isArray(valorFormatado) &&
      valorFormatado.length > 0 &&
      valorFormatado.some(item => typeof item === 'object' && item !== null);

    if (isArrayOfObjects) {
      const colunasSet = new Set<string>();
      valorFormatado.forEach(row => {
        if (typeof row === 'object' && row !== null) {
          Object.keys(row).forEach(k => colunasSet.add(k));
        }
      });
      const colunas = Array.from(colunasSet);

      if (colunas.length > 0) {
        partes.push(
          <DocumentInlineAutoTable
            key={`${prefixKey}_autotable_${chave}_${matchCount++}_${match.index}`}
            chaveReal={chaveReal}
            colunas={colunas}
            valorFormatado={valorFormatado}
            dados={dados}
            estrutura={estrutura}
            destaquesAtivos={destaquesAtivos}
            edicaoInline={edicaoInline}
            variaveisVermelhasWord={variaveisVermelhasWord}
            fontScale={fontScale}
            onFocusField={onFocusField}
            onUpdateField={onUpdateField}
          />
        );
        lastIdx = match.index + match[0].length;
        continue;
      }
    }

    // Normaliza o valor para renderização no documento
    let textoExibicao: string = '';
    if (valorFormatado !== null && valorFormatado !== undefined) {
      if (typeof valorFormatado === 'object') {
        if (Array.isArray(valorFormatado)) {
          textoExibicao = valorFormatado
            .map(item =>
              typeof item === 'object' && item !== null
                ? Object.values(item)
                    .filter(v => v !== '' && v !== null && v !== undefined)
                    .join(' - ')
                : String(item)
            )
            .filter(Boolean)
            .join(', ');
        } else {
          const vals = Object.values(valorFormatado).filter(
            v => v !== '' && v !== null && v !== undefined
          );
          textoExibicao = vals.length > 0 ? vals.join(' - ') : '';
        }
      } else if (typeof valorFormatado === 'boolean') {
        textoExibicao = valorFormatado ? 'Sim' : 'Não';
      } else {
        textoExibicao = String(valorFormatado);
      }
    }

    // Se for acesso direto indexado a item/linha de tabela ou variável dentro de loop foreach
    const baseKey = chave.split(/[.[]/)[0];
    const baseListaFromFor = ctxLocal?.__edmListaOrigem?.[baseKey];
    const loopIndexFromFor = ctxLocal?.__edmLoopIndex?.[baseKey];
    const ehVariavelForeach = Boolean(baseListaFromFor && loopIndexFromFor !== undefined);

    if (ehVariavelForeach || chave.includes('.') || chave.includes('[')) {
      const campoFoco = baseListaFromFor || baseKey;
      const ehCampoValido = Boolean(baseListaFromFor || estrutura?.campos?.[baseKey]);
      const comValor = textoExibicao !== '';
      const destacado = Boolean(destaquesAtivos[campoFoco]);

      const listaParaTabela = (nome: string) =>
        Array.isArray(escopo[nome]) ? escopo[nome] : [];

      let tabelaAcesso: {
        listaNome: string;
        coluna: string;
        indice: number | null;
        listaAtual: any[];
      } | null = null;

      if (ehVariavelForeach && baseListaFromFor && loopIndexFromFor !== undefined) {
        if (chave.includes('.')) {
          const subKey = chave.substring(baseKey.length + 1).trim();
          const isSyntheticIndex = ['_indice', '_index', '_idx', 'index', 'numero'].includes(subKey.toLowerCase());
          if (isSyntheticIndex) {
            partes.push(
              <span
                key={`${prefixKey}_rowidx_${chave}_${matchCount++}_${match.index}`}
                data-vars={campoFoco}
                title={`${extrairTooltip(campoFoco, estrutura)}\n(Índice do item ${loopIndexFromFor + 1} — Clique: localizar tabela)`}
                onClick={e => {
                  e.stopPropagation();
                  onFocusField(campoFoco);
                }}
                className={`inline cursor-pointer px-1 py-0.5 rounded border transition-colors select-text ${
                  destacado
                    ? 'bg-emerald-200 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border-emerald-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700 font-medium'
                }`}
              >
                {textoExibicao !== '' ? textoExibicao : `${loopIndexFromFor + 1}`}
              </span>
            );
            lastIdx = match.index + match[0].length;
            continue;
          } else {
            tabelaAcesso = {
              listaNome: baseListaFromFor,
              coluna: subKey,
              indice: loopIndexFromFor,
              listaAtual: listaParaTabela(baseListaFromFor),
            };
          }
        } else {
          tabelaAcesso = {
            listaNome: baseListaFromFor,
            coluna: '',
            indice: loopIndexFromFor,
            listaAtual: listaParaTabela(baseListaFromFor),
          };
        }
      } else {
        const matchColIdx = chave.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\[(\d+)\]$/);
        const matchLinhaIdx = chave.match(/^([a-zA-Z0-9_]+)\[(\d+)\]\.([a-zA-Z0-9_]+)$/);
        const matchColuna = chave.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)$/);

        if (matchColIdx) {
          tabelaAcesso = {
            listaNome: matchColIdx[1],
            coluna: matchColIdx[2],
            indice: Number(matchColIdx[3]),
            listaAtual: listaParaTabela(matchColIdx[1]),
          };
        } else if (matchLinhaIdx) {
          tabelaAcesso = {
            listaNome: matchLinhaIdx[1],
            coluna: matchLinhaIdx[3],
            indice: Number(matchLinhaIdx[2]),
            listaAtual: listaParaTabela(matchLinhaIdx[1]),
          };
        } else if (
          matchColuna &&
          (estrutura?.campos?.[matchColuna[1]]?.tipo === 'tabela' || Array.isArray(escopo[matchColuna[1]]))
        ) {
          tabelaAcesso = {
            listaNome: matchColuna[1],
            coluna: matchColuna[2],
            indice: null,
            listaAtual: listaParaTabela(matchColuna[1]),
          };
        }
      }

      if (tabelaAcesso) {
        const tooltipAcesso = tabelaAcesso.indice !== null
          ? `${extrairTooltip(campoFoco, estrutura)} [Linha ${tabelaAcesso.indice + 1}${tabelaAcesso.coluna ? ` > ${tabelaAcesso.coluna}` : ''}]`
          : extrairTooltip(campoFoco, estrutura);

        const colMeta = estrutura?.campos?.[tabelaAcesso.listaNome]?.colunas?.find(
          c => c.id === tabelaAcesso.coluna
        );

        partes.push(
          <DocumentInlineTableAccess
            key={`${prefixKey}_tabelaacesso_${chave}_${matchCount++}_${match.index}`}
            id={campoFoco}
            caminho={chave}
            valorBruto={valorBruto}
            valorExibido={textoExibicao}
            filtro={filtro}
            tooltip={tooltipAcesso}
            isHighlighted={destacado}
            edicaoInline={edicaoInline}
            variaveisVermelhasWord={variaveisVermelhasWord}
            onFocusField={onFocusField}
            onUpdateField={onUpdateField}
            fontScale={fontScale}
            tabelaAcesso={tabelaAcesso}
            colMeta={colMeta}
          />
        );
      } else if (ehCampoValido) {
        partes.push(
          <span
            key={`${prefixKey}_nestedvar_${chave}_${matchCount++}_${match.index}`}
            data-vars={campoFoco}
            title={`${extrairTooltip(campoFoco, estrutura)}\n(Clique: localizar no formulário)`}
            onClick={e => {
              e.stopPropagation();
              onFocusField(campoFoco);
            }}
            className={`inline cursor-pointer px-1 py-0.5 rounded border transition-colors duration-500 ease-in-out select-text ${
              comValor
                ? destacado
                  ? 'bg-emerald-200 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border-emerald-400 dark:border-emerald-500'
                  : variaveisVermelhasWord
                  ? 'text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/40 border-transparent dark:border-rose-900/30 hover:bg-red-100 dark:hover:bg-rose-900/60 hover:border-red-400 dark:hover:border-rose-600/60'
                  : 'text-slate-900 dark:text-slate-100 bg-blue-50/80 dark:bg-slate-800/70 border-transparent dark:border-slate-700/50 hover:bg-blue-100 dark:hover:bg-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
                : destacado
                ? 'bg-emerald-200 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 font-mono text-xs border-emerald-500'
                : 'text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/50 font-mono text-xs border-amber-300 dark:border-amber-700/60 hover:bg-amber-200 dark:hover:bg-amber-900/60'
            }`}
          >
            {comValor ? textoExibicao : `{{${chave}${filtro ? ' | ' + filtro : ''}}}`}
          </span>
        );
      } else {
        partes.push(
          <span
            key={`${prefixKey}_nestedvar_${chave}_${matchCount++}_${match.index}`}
            className="text-slate-900 dark:text-slate-100 font-medium"
          >
            {textoExibicao !== '' ? textoExibicao : `{{${chave}}}`}
          </span>
        );
      }
      lastIdx = match.index + match[0].length;
      continue;
    }

    if (isLocalVar && !origemLista) {
      partes.push(
        <span
          key={`${prefixKey}_localvar_${chave}_${matchCount++}_${match.index}`}
          className="text-slate-900"
        >
          {textoExibicao || `{{${chave}}}`}
        </span>
      );
    } else {
      partes.push(
        <DocumentInlineVariable
          key={`${prefixKey}_var_${chave}_${matchCount++}_${match.index}`}
          id={chaveReal}
          valorBruto={valorBrutoReal}
          valorExibido={textoExibicao}
          filtro={filtro}
          listaForeach={listaForeachEstaVar}
          campo={estrutura.campos[chaveReal]}
          tooltip={extrairTooltip(chaveReal, estrutura)}
          isHighlighted={Boolean(destaquesAtivos[chaveReal])}
          edicaoInline={edicaoInline}
          variaveisVermelhasWord={variaveisVermelhasWord}
          onFocusField={onFocusField}
          onUpdateField={onUpdateField}
          fontScale={fontScale}
        />
      );
    }
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < textoOriginal.length) {
    partes.push(textoOriginal.substring(lastIdx));
  }

  return partes.length > 0 ? partes : [textoOriginal];
}
