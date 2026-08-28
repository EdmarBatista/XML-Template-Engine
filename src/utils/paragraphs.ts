import { AstNode } from '../types';

/**
 * Divide os nós inline em grupos de parágrafos, quebrando a cada `\n` literal
 * presente no texto do XML ou a cada <br>. Restaura o comportamento da versão
 * que funcionava, em que cada linha virava um parágrafo separado no documento.
 *
 * Extraído de DocumentNodeRenderer.tsx (sugestão D de modularização).
 */
export function dividirEmLinhas(nos: AstNode[]): AstNode[][] {
  const linhas: AstNode[][] = [];
  let atual: AstNode[] = [];

  (nos || []).forEach(node => {
    if (!node) return;
    if (node.tipo === 'texto') {
      const partes = String(node.texto ?? (node as any).valor ?? '').split('\n');
      partes.forEach((parte, pi) => {
        if (pi > 0) {
          if (atual.length) {
            linhas.push(atual);
            atual = [];
          }
        }
        const trecho = pi === 0 ? parte : parte.replace(/^\s+/, '');
        if (trecho) {
          atual.push({ ...node, texto: trecho });
        }
      });
    } else if (node.tipo === 'br') {
      if (atual.length) {
        linhas.push(atual);
        atual = [];
      }
    } else {
      atual.push(node);
    }
  });

  if (atual.length) linhas.push(atual);
  return linhas;
}
