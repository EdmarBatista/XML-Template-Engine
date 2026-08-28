/**
 * ============================================================================
 * Módulo de Nós do Visualizador de Documentos (DocumentViewer Nodes)
 * ============================================================================
 *
 * Este módulo reúne os componentes responsáveis pela renderização especializada
 * de cada tipo de bloco e nó semântico da árvore AST (Abstract Syntax Tree)
 * gerada a partir dos templates XML.
 *
 * Separação e Atribuições:
 * ----------------------------------------------------------------------------
 * 1. DocumentParagraphNode:
 *    - Responsabilidade: Renderização de parágrafos de texto, cálculo de quebras
 *      de linha (dividirEmLinhas), alinhamento (justify, center, right, left) e
 *      aplicação de numeração sequencial de blocos.
 *    - Paridade: Gera atributos semânticos data-word-* para garantir fidelidade
 *      na exportação para Microsoft Word (.docx) e PDF.
 *
 * 2. DocumentConditionalNode:
 *    - Responsabilidade: Avaliação de expressões condicionais <if expr="...">.
 *    - DocumentInlineConditionalNode: Condicionais dentro de frases/parágrafos.
 *    - DocumentBlockConditionalNode: Condicionais que envolvem múltiplos blocos.
 *    - Interatividade: Realce visual reativo e atalho de clique para focar no campo.
 *
 * 3. DocumentListNode:
 *    - Responsabilidade: Renderização de listas ordenadas (<ol>) e não-ordenadas (<ul>),
 *      itens (<item>, <li>), e suporte aninhado a <if> e <foreach> dentro de itens.
 * ============================================================================
 */

export * from './DocumentParagraphNode';
export * from './DocumentConditionalNode';
export * from './DocumentListNode';
