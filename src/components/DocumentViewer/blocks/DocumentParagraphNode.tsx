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
  /** Nó AST completo do parágrafo, se disponível */
  node?: AstNode;
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
  comentarios,
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

  // O nível do parágrafo pode vir do atributo do nó ou do contexto hierárquico
  const explicitNivel = node?.atributos?.nivel ? parseInt(node.atributos.nivel, 10) : undefined;
  const effectiveNivel = explicitNivel !== undefined ? explicitNivel : nivel;

  linhas.forEach((linha, li) => {
    // Linha vazia ou composta somente por espaços/quebras não deve ser numerada nem renderizada como parágrafo vazio
    const isWhitespaceOnly = linha.every(n => n.tipo === 'texto' && !(n.texto || '').trim());
    if (isWhitespaceOnly) return;

    const numeroWord = node?.atributos?.numero;
    let prefixoNum = '';
    const isExplicitlyDisabled = node?.atributos?.numerado === 'false';
    const isExplicitlyEnabled = node?.atributos?.numerado === 'true';
    const hasNivel = explicitNivel !== undefined;

    // Um parágrafo recebe numeração se:
    // 1. A numeração estiver habilitada no contexto
    // 2. Não estiver explicitamente desabilitada (numerado="false")
    // 3. Tiver nível explícito (nivel="2", "3", etc.) OU estiver explicitamente habilitado (numerado="true")
    //    OU estiver em uma seção numerada no nível 2 ou superior (contextoNumeracao.numerarBlocos && effectiveNivel >= 2)
    const shouldNumber =
      contextoNumeracao.habilitado &&
      !isExplicitlyDisabled &&
      (hasNivel || isExplicitlyEnabled || (contextoNumeracao.numerarBlocos && effectiveNivel >= 2) || !!numeroWord);

    if (shouldNumber) {
      if (numeroWord) {
        prefixoNum = numeroWord.endsWith('.') || numeroWord.endsWith(')') ? numeroWord : `${numeroWord}.`;
      } else {
        if (!contextoNumeracao.levelCounters) {
        contextoNumeracao.levelCounters = {
          2: contextoNumeracao.next || 1,
          3: contextoNumeracao.subNext || 1,
          4: contextoNumeracao.subSubNext || 1,
          5: 1,
          6: 1,
          7: 1,
          8: 1,
        };
      }
      if (!contextoNumeracao.levelNumbers) {
        contextoNumeracao.levelNumbers = {};
        if (contextoNumeracao.lastLevel2Number) contextoNumeracao.levelNumbers[2] = contextoNumeracao.lastLevel2Number;
        if (contextoNumeracao.lastLevel3Number) contextoNumeracao.levelNumbers[3] = contextoNumeracao.lastLevel3Number;
        if (contextoNumeracao.lastLevel4Number) contextoNumeracao.levelNumbers[4] = contextoNumeracao.lastLevel4Number;
        if (contextoNumeracao.lastLevel5Number) contextoNumeracao.levelNumbers[5] = contextoNumeracao.lastLevel5Number;
        if (contextoNumeracao.lastLevel6Number) contextoNumeracao.levelNumbers[6] = contextoNumeracao.lastLevel6Number;
        if (contextoNumeracao.lastLevel7Number) contextoNumeracao.levelNumbers[7] = contextoNumeracao.lastLevel7Number;
        if (contextoNumeracao.lastLevel8Number) contextoNumeracao.levelNumbers[8] = contextoNumeracao.lastLevel8Number;
      }

      const lvl = Math.min(8, Math.max(2, effectiveNivel));

      // Determina o número pai baseado no nível anterior (lvl - 1)
      let parent = '';
      if (lvl === 2) {
        parent = contextoNumeracao.prefixo || '';
      } else {
        // Busca o número do nível pai imediato (lvl - 1) ou o mais próximo registrado
        for (let k = lvl - 1; k >= 2; k--) {
          if (contextoNumeracao.levelNumbers[k]) {
            if (k === lvl - 1) {
              parent = contextoNumeracao.levelNumbers[k];
            } else {
              // Se pulou níveis intermediários, sintetiza os níveis intermediários
              let synth = contextoNumeracao.levelNumbers[k];
              for (let fill = k + 1; fill < lvl; fill++) {
                synth += '.1';
                contextoNumeracao.levelNumbers[fill] = synth;
                contextoNumeracao.levelCounters[fill] = 2;
              }
              parent = synth;
            }
            break;
          }
        }
        if (!parent) {
          parent = contextoNumeracao.prefixo
            ? `${contextoNumeracao.prefixo}${'.1'.repeat(lvl - 2)}`
            : '1';
        }
      }

      const currentIdx = contextoNumeracao.levelCounters[lvl] || 1;
      const num = parent ? `${parent}.${currentIdx}` : String(currentIdx);

      contextoNumeracao.levelCounters[lvl] = currentIdx + 1;
      contextoNumeracao.levelNumbers[lvl] = num;
      contextoNumeracao.lastNumber = num;

      // Reseta contadores e números de níveis inferiores (> lvl)
      for (let d = lvl + 1; d <= 8; d++) {
        contextoNumeracao.levelCounters[d] = 1;
        delete contextoNumeracao.levelNumbers[d];
      }

      // Sincroniza campos legados
      contextoNumeracao.next = contextoNumeracao.levelCounters[2] || 1;
      contextoNumeracao.subNext = contextoNumeracao.levelCounters[3] || 1;
      contextoNumeracao.subSubNext = contextoNumeracao.levelCounters[4] || 1;
      contextoNumeracao.lastLevel2Number = contextoNumeracao.levelNumbers[2] || '';
      contextoNumeracao.lastLevel3Number = contextoNumeracao.levelNumbers[3] || '';
      contextoNumeracao.lastLevel4Number = contextoNumeracao.levelNumbers[4] || '';
      contextoNumeracao.lastLevel5Number = contextoNumeracao.levelNumbers[5] || '';
      contextoNumeracao.lastLevel6Number = contextoNumeracao.levelNumbers[6] || '';
      contextoNumeracao.lastLevel7Number = contextoNumeracao.levelNumbers[7] || '';
      contextoNumeracao.lastLevel8Number = contextoNumeracao.levelNumbers[8] || '';

      prefixoNum = `${num}.`;
      }
    }

    // Verifica se algum comentário pertence a esta linha
    const linhaText = linha.map(n => n.texto || '').join('').trim();
    const comentariosLinha = (comentarios || []).filter(c => linhaText.includes(c.trecho) || (c.trecho && c.trecho.includes(linhaText)));

    paragrafos.push(
      <div
        key={`${pPath}_p_${li}`}
        data-word-type="paragrafo"
        
        data-word-align={alinhamentoPadrao}
        data-word-numerado={prefixoNum ? 'true' : 'false'}
        className={`text-slate-800 dark:text-slate-200 my-2 leading-relaxed select-text ${alignClass} relative group`}
        style={{ fontSize: `${fontScale}rem` }}
      >
        {prefixoNum && (
          <span data-word-num="true" data-num-prefix="true" className="font-bold mr-2 text-slate-900 dark:text-slate-100">{prefixoNum}</span>
        )}
        {renderInlineNodes(linha, `${pPath}_inline_${li}`, contextoLocal)}
        
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
