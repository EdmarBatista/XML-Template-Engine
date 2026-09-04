import React from 'react';
import { AstNode, NumberingContext } from '../../../types';

export interface DocumentSectionNodeProps {
  node: AstNode;
  blockKey: string;
  contextoNumeracao: NumberingContext;
  nivelSecao: number;
  fontScale: number;
  processarTextoComVariaveis: (texto: string, prefixKey: string, contextoLocal?: Record<string, any>) => React.ReactNode[];
  renderAstBlocos: (
    nodes: AstNode[],
    contextoNumeracao: NumberingContext,
    pathPrefix: string,
    contextoLocal?: Record<string, any>,
    nivelSecao?: number
  ) => React.ReactNode[];
  contextoLocal?: Record<string, any>;
}

/**
 * Renderizador hierárquico e síncrono de seções (<secao>), títulos (<titulo>, <subtitulo>) e numeração.
 * Executado como função pura durante a travessia da AST para garantir determinismo absoluto na numeração.
 */
export function renderDocumentSectionNode(
  node: AstNode,
  blockKey: string,
  contextoNumeracao: NumberingContext,
  nivelSecao: number,
  fontScale: number,
  processarTextoComVariaveis: (texto: string, prefixKey: string, contextoLocal?: Record<string, any>) => React.ReactNode[],
  renderAstBlocos: (
    nodes: AstNode[],
    contextoNumeracao: NumberingContext,
    pathPrefix: string,
    contextoLocal?: Record<string, any>,
    nivelSecao?: number
  ) => React.ReactNode[],
  contextoLocal?: Record<string, any>
): React.ReactNode {
  const titulo = String(node.atributos?.titulo || '').trim();
  const numerarSecao = node.atributos?.numerar !== 'false';
  const numerar = numerarSecao && contextoNumeracao.habilitado;
  // Número EXIBIDO do Word (quando o conversor o marcou via <secao numero=X>); tem prioridade
  // sobre o contador automático do painel e mantém numeração dinâmica/desabilitável.
  const numeroWord =
    numerar && node.atributos?.numero ? String(node.atributos.numero).trim() : undefined;
  let numStr = '';
  let subPrefix = '';

  if (titulo) {
    if (numerar) {
      if (numeroWord) {
        // Representa FIELMENTE o número exibido pelo Word (reinício por startOverride já aplicado).
        numStr = `${numeroWord}.`;
        subPrefix = numeroWord;
      } else {
        const num = contextoNumeracao.prefixo
          ? `${contextoNumeracao.prefixo}.${contextoNumeracao.next}`
          : String(contextoNumeracao.next);
        contextoNumeracao.next++;
        contextoNumeracao.lastNumber = num;
        numStr = `${num}.`;
        subPrefix = num;
      }
    } else {
      subPrefix = contextoNumeracao.prefixo;
    }
  } else {
    // Seção SEM TÍTULO:
    // Não exibe numStr (numStr = '') e não consome número.
    // Herda o prefixo da seção pai para que subseções numeradas filhas continuem
    // a hierarquia a partir do pai diretamente.
    numStr = '';
    subPrefix = contextoNumeracao.prefixo;
  }

  const numerarFilhos = numerar;
  const nivelEfetivo = Math.max(1, nivelSecao);
  const proximoNivel = nivelEfetivo + 1;

  let subContexto: NumberingContext;
  if (!titulo) {
    // Seção interna sem título (subnível de lista/tópico ou agrupamento de parágrafos):
    // Mantém e compartilha o mesmo contexto de numeração e contadores do pai para continuidade da numeração hierárquica (ex: 7.3 -> 7.3.1, 7.3.2 -> 7.4)
    subContexto = {
      ...contextoNumeracao,
      prefixo: subPrefix,
      habilitado: numerarSecao ? contextoNumeracao.habilitado : false,
      numerarBlocos: numerarSecao ? contextoNumeracao.numerarBlocos : false,
      levelCounters: contextoNumeracao.levelCounters || { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 },
      levelNumbers: contextoNumeracao.levelNumbers || {},
    };
  } else {
    subContexto = {
      prefixo: subPrefix,
      next: 1,
      subNext: 1,
      subSubNext: 1,
      lastLevel2Number: '',
      lastLevel3Number: '',
      lastLevel4Number: '',
      lastLevel5Number: '',
      lastLevel6Number: '',
      lastLevel7Number: '',
      lastLevel8Number: '',
      levelCounters: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 },
      levelNumbers: {},
      lastNumber: '',
      habilitado: numerarFilhos,
      numerarBlocos: numerar,
    };
  }

  const filhosRenderizados = renderAstBlocos(
    node.filhos || [],
    subContexto,
    `${blockKey}_sec`,
    contextoLocal,
    proximoNivel
  );

  // Determina tamanho de fonte e estilo baseado no nível de profundidade da seção (outline hierarchy)
  let fontSizePx = 17 * fontScale;
  let titleClass = "font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-1 mt-5 select-text";
  let containerClass = "my-5 space-y-2 select-text";

  if (!titulo) {
    // Para subníveis sem título, aplica indentação sem borda pesada
    containerClass = nivelEfetivo >= 3 ? "my-2 ml-4 space-y-2 select-text" : "space-y-2 select-text";
  } else if (nivelEfetivo === 2) {
    fontSizePx = 15.5 * fontScale;
    titleClass = "font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-0.5 mt-4 select-text";
    containerClass = "my-4 ml-2 pl-2 border-l-2 border-slate-100 dark:border-slate-800 space-y-2 select-text";
  } else if (nivelEfetivo >= 3) {
    fontSizePx = 14.5 * fontScale;
    titleClass = "font-semibold italic text-slate-700 dark:text-slate-300 mt-3 select-text";
    containerClass = "my-3 ml-3 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-2 select-text";
  }

  return (
    <div
      key={blockKey}
      data-word-type="secao"
      
      data-word-numerar={numerarSecao ? 'true' : 'false'}
      className={containerClass}
    >
      {titulo && (
        <h3
          data-word-type="secao-titulo"
          
          data-word-numerar={numerarSecao ? 'true' : 'false'}
          className={titleClass}
          style={{
            fontSize: `${fontSizePx}px`,
            lineHeight: 1.35,
          }}
        >
          {numStr && <span data-word-num="true" className="select-text">{numStr} </span>}
          {typeof processarTextoComVariaveis === 'function'
            ? processarTextoComVariaveis(titulo, `${blockKey}_h3`, contextoLocal)
            : titulo}
        </h3>
      )}
      <div className="space-y-2" data-word-type="secao-conteudo">
        {filhosRenderizados}
      </div>
    </div>
  );
}

export const DocumentSectionNode: React.FC<DocumentSectionNodeProps> = (props) => {
  return <>{renderDocumentSectionNode(
    props.node,
    props.blockKey,
    props.contextoNumeracao,
    props.nivelSecao,
    props.fontScale,
    props.processarTextoComVariaveis,
    props.renderAstBlocos,
    props.contextoLocal
  )}</>;
};
