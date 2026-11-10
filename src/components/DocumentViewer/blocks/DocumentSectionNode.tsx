import React from 'react';
import { AstNode, NumberingContext, ContextoLocal } from '../../../types';
import {
  ATRIBUTOS_SECAO_CONTEUDO,
  atributosDeSecao,
  atributosDeTituloDeSecao,
} from '../../../utils/wordDom';
import { calcularRecuoHierarquicoCm } from '../../../utils/domDocumentExtractor';

export interface DocumentSectionNodeProps {
  node: AstNode;
  blockKey: string;
  contextoNumeracao: NumberingContext;
  nivelSecao: number;
  fontScale: number;
  processarTextoComVariaveis: (texto: string, prefixKey: string, contextoLocal?: ContextoLocal) => React.ReactNode[];
  renderAstBlocos: (
    nodes: AstNode[],
    contextoNumeracao: NumberingContext,
    pathPrefix: string,
    contextoLocal?: ContextoLocal,
    nivelSecao?: number
  ) => React.ReactNode[];
  contextoLocal?: ContextoLocal;
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
  processarTextoComVariaveis: (texto: string, prefixKey: string, contextoLocal?: ContextoLocal) => React.ReactNode[],
  renderAstBlocos: (
    nodes: AstNode[],
    contextoNumeracao: NumberingContext,
    pathPrefix: string,
    contextoLocal?: ContextoLocal,
    nivelSecao?: number
  ) => React.ReactNode[],
  contextoLocal?: ContextoLocal
): React.ReactNode {
  const titulo = String(node.atributos?.titulo || '').trim();
  const numerarSecao = node.atributos?.numerar !== 'false';
  const reiniciar = node.atributos?.reiniciar === 'true';

  if (reiniciar) {
    contextoNumeracao.next = 1;
    contextoNumeracao.subNext = 1;
    contextoNumeracao.subSubNext = 1;
    contextoNumeracao.lastLevel2Number = '';
    contextoNumeracao.lastLevel3Number = '';
    contextoNumeracao.lastLevel4Number = '';
    contextoNumeracao.lastLevel5Number = '';
    contextoNumeracao.lastLevel6Number = '';
    contextoNumeracao.lastLevel7Number = '';
    contextoNumeracao.lastLevel8Number = '';
    contextoNumeracao.lastNumber = '';
    contextoNumeracao.levelCounters = { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 };
    contextoNumeracao.levelNumbers = {};
  }

  const numerar = numerarSecao && contextoNumeracao.habilitado;
  let numStr = '';
  let subPrefix = '';

  if (titulo) {
    if (numerar) {
      const num = contextoNumeracao.prefixo
        ? `${contextoNumeracao.prefixo}.${contextoNumeracao.next}`
        : String(contextoNumeracao.next);
      contextoNumeracao.next++;
      contextoNumeracao.lastNumber = num;
      numStr = `${num}.`;
      subPrefix = num;
    }
  } else {
    if (numerar) {
      if (contextoNumeracao.lastNumber) {
        subPrefix = contextoNumeracao.lastNumber;
      } else {
        const num = contextoNumeracao.prefixo
          ? `${contextoNumeracao.prefixo}.${contextoNumeracao.next}`
          : String(contextoNumeracao.next);
        contextoNumeracao.next++;
        contextoNumeracao.lastNumber = num;
        subPrefix = num;
      }
    }
  }

  const numerarFilhos = numerarSecao;
  const safeNivelSecao = nivelSecao || 1;
  const proximoNivel = numerarFilhos ? safeNivelSecao + 1 : safeNivelSecao;

  const subContexto: NumberingContext = {
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
    habilitado: numerar,
    numerarBlocos: numerar,
  };

  // Uma <secao> sem título é só um contêiner de nível: ela não imprime cabeçalho e
  // não consome número de seção. Os filhos, porém, precisam continuar a numeração
  // do escopo corrente no nível que ela abre — sem isto, cada grupo de subitens
  // voltaria para x.1 (ex.: 1.1.4 imprimindo 1.1.1).
  const contadorHerdadoNoPai = !titulo && numerar;
  const nivelRelativoAberto = proximoNivel - safeNivelSecao + 2;
  if (contadorHerdadoNoPai) {
    if (!contextoNumeracao.levelCounters) {
      contextoNumeracao.levelCounters = { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 };
    }
    subContexto.levelCounters[2] = contextoNumeracao.levelCounters[nivelRelativoAberto] ?? 1;
  }

  const filhosRenderizados = renderAstBlocos(
    node.filhos || [],
    subContexto,
    `${blockKey}_sec`,
    contextoLocal,
    proximoNivel
  );

  // Devolve ao escopo pai o contador do nível aberto, para o próximo grupo de
  // subitens (e não apenas o seguinte dentro deste contêiner) continuar a série.
  if (contadorHerdadoNoPai) {
    const contadoresPai = contextoNumeracao.levelCounters!;
    contadoresPai[nivelRelativoAberto] = subContexto.levelCounters[2] ?? 1;
    const ultimoNumero = subContexto.levelNumbers?.[2];
    if (ultimoNumero) {
      if (!contextoNumeracao.levelNumbers) contextoNumeracao.levelNumbers = {};
      contextoNumeracao.levelNumbers[nivelRelativoAberto] = ultimoNumero;
    }
  }

  // Determina tamanho de fonte e estilo baseado no nível de profundidade da seção (outline hierarchy)
  let fontSizePx = 17 * fontScale;
  let titleClass = "font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-1 mt-5 select-text";
  let containerClass = "my-5 space-y-2 select-text";

  if (safeNivelSecao === 2) {
    fontSizePx = 15.5 * fontScale;
    titleClass = "font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-0.5 mt-4 select-text";
    containerClass = "my-4 pl-2 border-l-2 border-slate-100 dark:border-slate-800 space-y-2 select-text";
  } else if (safeNivelSecao >= 3) {
    fontSizePx = 14.5 * fontScale;
    titleClass = "font-semibold italic text-slate-700 dark:text-slate-300 mt-3 select-text";
    containerClass = "my-3 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-2 select-text";
  }

  // A seção aninhada acrescenta apenas o degrau em relação ao pai; os elementos
  // de conteúdo descontam esse acumulado para chegar ao recuo absoluto do nível.
  const recuoSecaoCm = calcularRecuoHierarquicoCm(safeNivelSecao);
  const recuoPaiCm = calcularRecuoHierarquicoCm(Math.max(0, safeNivelSecao - 1));
  const degrauSecaoCm = Math.max(0, recuoSecaoCm - recuoPaiCm);

  return (
    <div
      key={blockKey}
      {...atributosDeSecao({
        nivel: safeNivelSecao,
        numeracaoPropria: numerarSecao,
        numeracaoEfetiva: numerar,
        reiniciar,
      })}
      className={containerClass}
      style={degrauSecaoCm > 0 ? { marginLeft: `${degrauSecaoCm}cm` } : undefined}
    >
      {titulo && (
        <h3
          {...atributosDeTituloDeSecao({
            // A base do titulo e a bruta: 0 na secao raiz (o extrator usa esse valor
            // para por em negrito so o numero do titulo principal).
            nivel: nivelSecao,
            numeracaoPropria: numerarSecao,
          })}
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
      <div
        className="space-y-2"
        {...ATRIBUTOS_SECAO_CONTEUDO}
        data-word-indent-base-cm={recuoSecaoCm}
        style={{ '--edm-secao-indent': `${recuoSecaoCm}cm` } as React.CSSProperties}
      >
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
