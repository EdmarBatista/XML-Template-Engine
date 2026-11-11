import React from 'react';
import { calcularProximoNumero } from '../../../utils/numbering';
import { obterValorPorCaminho } from '../../../utils/documentUtils';
import { normalizarAlinhamento } from '../../../utils/alinhamento';




import { AstNode, NumberingContext, ContextoLocal, DadosDocumento } from '../../../types';
import { dividirEmLinhas } from '../../../utils/paragraphs';
import { calcularRecuoHierarquicoCm } from '../../../utils/domDocumentExtractor';

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
  /** Nó AST completo do parágrafo, se disponível */
  node?: AstNode;
  /** Alinhamento horizontal do texto */
  alinhamentoPadrao?: string;
  /** Função de renderização de nós inline passada pelo despachante */
  renderInlineNodes: (
    inlineNodes: AstNode[],
    path: string,
    contextoLocal?: ContextoLocal,
    numeracaoInfo?: { contextoNumeracao?: NumberingContext; effectiveNivel: number; nivelBase: number; isNumerado: boolean; extraNumbers?: string[]; extraNumbersState?: { currentIndex: number } }
  ) => React.ReactNode[];
  /** Escopo local de variáveis (ex: repetições foreach) */
  contextoLocal?: ContextoLocal;
  dados?: DadosDocumento;
  comentarios?: import('../../../types').WordComment[];
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
  node,
  alinhamentoPadrao = 'justify',
  renderInlineNodes,
  contextoLocal,
  dados,
  comentarios,
}: DocumentParagraphNodeProps): React.ReactNode[] {
  const linhas = dividirEmLinhas(nos);
  const paragrafos: React.ReactNode[] = [];
  const alinhamento = normalizarAlinhamento(alinhamentoPadrao);
  const alignClass =
    alinhamento === 'centro'
      ? 'text-center'
      : alinhamento === 'direita'
      ? 'text-right'
      : alinhamento === 'esquerda'
      ? 'text-left'
      : 'text-justify';

  // `<p>` é puro: `nivel` e `numerado` não têm efeito (regra do projeto). O nível
  // vem do contexto hierárquico da <secao>; numeração e recuo seguem apenas ele.
  const effectiveNivel = nivel;
  // O recuo absoluto vem do nível de contexto; a variável --edm-secao-indent,
  // publicada pelo conteúdo da seção, desconta o acumulado dos containers
  // aninhados. Assim a tela reproduz o mesmo cálculo do Word e do PDF.
  const recuoParagrafoCm = calcularRecuoHierarquicoCm(effectiveNivel);

  linhas.forEach((linha, li) => {
    let prefixoNum = '';

    // A numeração do parágrafo vem só do contexto: dentro de uma seção com
    // numeração ativa, os parágrafos do nível de conteúdo são numerados.
    let extraNumbers: string[] = [];
    const shouldNumber =
      contextoNumeracao.habilitado &&
      Boolean(contextoNumeracao.numerarBlocos) &&
      effectiveNivel >= 2;

    if (shouldNumber) {
      let extraLineBreaks = 0;
      const escopo = { ...(dados || {}), ...(contextoLocal || {}) };
      const processNodeForLineBreaks = (n: AstNode) => {
        if (n.tipo === 'texto' && n.texto) {
          const matches = n.texto.match(/\{\{\s*([^}|]+?)(?:\s*\|[^}]+)?\s*\}\}/g);
          if (matches && escopo) {
            matches.forEach((m: string) => {
              const varName = m.replace(/\{\{|\}\}/g, '').split('|')[0].trim();
              const val = escopo[varName] !== undefined ? escopo[varName] : obterValorPorCaminho(escopo, varName);
              if (typeof val === 'string') {
                const parts = val.split(/\r?\n/);
                for (let i = 1; i < parts.length; i++) {
                  if (parts[i].trim().length > 0) {
                    extraLineBreaks++;
                  }
                }
              }
            });
          }
        }
        if ((n.tipo === 'var' || n.tipo === 'variavel') && n.atributos?.id && escopo) {
          const val = escopo[n.atributos.id] !== undefined ? escopo[n.atributos.id] : obterValorPorCaminho(escopo, n.atributos.id);
          if (typeof val === 'string') {
            const parts = val.split(/\r?\n/);
            for (let i = 1; i < parts.length; i++) {
              if (parts[i].trim().length > 0) {
                extraLineBreaks++;
              }
            }
          }
        }
        if (n.filhos && Array.isArray(n.filhos)) {
          n.filhos.forEach(processNodeForLineBreaks);
        }
      };
      linha.forEach(processNodeForLineBreaks);

      const num = calcularProximoNumero(contextoNumeracao, effectiveNivel, nivel);
      prefixoNum = `${num}.`;
      for (let k = 0; k < extraLineBreaks; k++) {
        const nNext = calcularProximoNumero(contextoNumeracao, effectiveNivel, nivel);
        extraNumbers.push(`${nNext}.`);
      }
    }

    // Verifica se algum comentario pertence a esta linha
    const linhaText = linha.map(n => n.texto || '').join('');
    const comentariosLinha = (comentarios || []).filter(c => linhaText.includes(c.trecho) || (c.trecho && c.trecho.includes(linhaText)));

    paragrafos.push(
      <div
        key={`${pPath}_p_${li}`}
        data-word-type="paragrafo"
        data-word-level={effectiveNivel}
        data-word-align={alinhamento}
        data-word-numerado={prefixoNum ? 'true' : 'false'}
        data-word-indent-cm={recuoParagrafoCm}
        className={`text-slate-800 dark:text-slate-200 my-2 leading-relaxed select-text ${alignClass} relative group`}
        style={{
          fontSize: `${fontScale}rem`,
          marginLeft: `calc(${recuoParagrafoCm}cm - var(--edm-secao-indent, 0cm))`,
        }}
      >
        {prefixoNum && (
          <span data-word-num="true" data-num-prefix="true" className="font-bold mr-2 text-slate-900 dark:text-slate-100">{prefixoNum}</span>
        )}
        {renderInlineNodes(linha, `${pPath}_inline_${li}`, contextoLocal, { contextoNumeracao, effectiveNivel, nivelBase: nivel, isNumerado: shouldNumber, extraNumbers: [...extraNumbers] })}
        
        {comentariosLinha.length > 0 && (
          <span className="inline-flex items-center ml-2 align-middle">
            {comentariosLinha.map((c, idx) => (
              <span key={c.id} className="relative inline-block group/tooltip cursor-help">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400 text-yellow-900 text-[10px] font-bold shadow-sm ring-2 ring-white dark:ring-slate-900 hover:scale-110 transition-transform">
                  💬
                </span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-64 p-3 bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100 text-xs rounded-lg shadow-xl border border-yellow-200 dark:border-yellow-800 z-50">
                  <strong className="block mb-1 border-b border-yellow-200/50 pb-1">Comentário Word:</strong>
                  {c.texto}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-yellow-100 dark:border-t-yellow-900" />
                </span>
              </span>
            ))}
          </span>
        )}
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
