import React from 'react';
import { AstNode, NumberingContext } from '../../types';

interface DocumentSectionNodeProps {
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
 * Renderizador hierárquico de seções (<secao>), títulos (<titulo>, <subtitulo>) e numeração
 */
export const DocumentSectionNode: React.FC<DocumentSectionNodeProps> = ({
  node,
  blockKey,
  contextoNumeracao,
  nivelSecao,
  fontScale,
  processarTextoComVariaveis,
  renderAstBlocos,
  contextoLocal,
}) => {
  const titulo = String(node.atributos?.titulo || '').trim();
  const numerarSecao = node.atributos?.numerar !== 'false';
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
  const proximoNivel = numerarFilhos ? nivelSecao + 1 : nivelSecao;

  const subContexto: NumberingContext = {
    prefixo: subPrefix,
    next: 1,
    lastNumber: '',
    habilitado: numerar,
    numerarBlocos: numerar,
  };

  const filhosRenderizados = renderAstBlocos(
    node.filhos || [],
    subContexto,
    `${blockKey}_sec`,
    contextoLocal,
    proximoNivel
  );

  return (
    <div
      key={blockKey}
      data-word-type="secao"
      data-word-level={nivelSecao}
      data-word-numerar={numerarSecao ? 'true' : 'false'}
      className="my-5 space-y-2 select-text"
    >
      {titulo && (
        <h3
          data-word-type="secao-titulo"
          data-word-level={nivelSecao}
          data-word-numerar={numerarSecao ? 'true' : 'false'}
          className="font-bold text-slate-900 border-b border-slate-200 pb-1 mt-4 select-text"
          style={{
            fontSize: `${16 * fontScale}px`,
            lineHeight: 1.35,
          }}
        >
          {numStr && <span data-word-num="true" className="select-text">{numStr} </span>}
          {processarTextoComVariaveis(titulo, `${blockKey}_h3`, contextoLocal)}
        </h3>
      )}
      <div className="space-y-2" data-word-type="secao-conteudo">
        {filhosRenderizados}
      </div>
    </div>
  );
};
