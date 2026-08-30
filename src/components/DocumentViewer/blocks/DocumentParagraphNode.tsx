import React from 'react';
import { AstNode, NumberingContext } from '../../../types';
import { dividirEmLinhas } from '../../../utils/paragraphs';

export interface DocumentParagraphNodeProps {
  /** Nós AST que compõem o corpo do parágrafo */
  nos: AstNode[];
  /** Caminho/chave única do nó para renderização React */
  pPath: string;
  /** Contexto mutável de numeração do documento */
  contextoNumeracao: NumberingContext;
  /** Fator multiplicador de escala da fonte */
  fontScale: number;
  /** Nível hierárquico do parágrafo na seção */
  nivel: number;
  /** Alinhamento horizontal do texto */
  alinhamentoPadrao?: string;
  /** Função de renderização de nós inline passada pelo despachante */
  renderInlineNodes: (
    inlineNodes: AstNode[],
    path: string,
    contextoLocal?: Record<string, any>
  ) => React.ReactNode[];
  /** Escopo local de variáveis (ex: repetições foreach) */
  contextoLocal?: Record<string, any>;
}

/**
 * Função utilitária que processa os nós AST e gera um array de elementos React para os parágrafos.
 */
export function renderDocumentParagraphNodes({
  nos,
  pPath,
  contextoNumeracao,
  fontScale,
  nivel,
  alinhamentoPadrao = 'justify',
  renderInlineNodes,
  contextoLocal,
}: DocumentParagraphNodeProps): React.ReactNode[] {
  const linhas = dividirEmLinhas(nos);
  const paragrafos: React.ReactNode[] = [];
  const alignClass =
    alinhamentoPadrao === 'centro'
      ? 'text-center'
      : alinhamentoPadrao === 'direita'
      ? 'text-right'
      : alinhamentoPadrao === 'esquerda'
      ? 'text-left'
      : 'text-justify';

  linhas.forEach((linha, li) => {
    let prefixoNum = '';
    if (contextoNumeracao.habilitado && contextoNumeracao.numerarBlocos) {
      const num = contextoNumeracao.prefixo
        ? `${contextoNumeracao.prefixo}.${contextoNumeracao.next}`
        : String(contextoNumeracao.next);
      contextoNumeracao.next++;
      contextoNumeracao.lastNumber = num;
      prefixoNum = `${num}.`;
    }

    paragrafos.push(
      <div
        key={`${pPath}_p_${li}`}
        data-word-type="paragrafo"
        data-word-level={nivel}
        data-word-align={alinhamentoPadrao}
        data-word-numerado={prefixoNum ? 'true' : 'false'}
        className={`text-slate-800 dark:text-slate-200 my-2 leading-relaxed select-text ${alignClass}`}
        style={{
          fontSize: `${14 * fontScale}px`,
          lineHeight: 1.6,
        }}
      >
        {prefixoNum && (
          <span data-word-num="true" className="font-semibold text-slate-900 dark:text-slate-100 mr-0.5 select-text">
            {prefixoNum}{' '}
          </span>
        )}
        {renderInlineNodes(linha, `${pPath}_p_${li}`, contextoLocal)}
      </div>
    );
  });

  return paragrafos;
}

/**
 * Componente React wrapper para o renderizador de parágrafos
 */
export const DocumentParagraphNode: React.FC<DocumentParagraphNodeProps> = (props) => {
  return <>{renderDocumentParagraphNodes(props)}</>;
};
