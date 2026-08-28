import React from 'react';
import { AstNode } from '../../types';

interface DocumentTableNodeProps {
  node: AstNode;
  blockKey: string;
  fontScale: number;
  renderInlineNodes: (nodes: AstNode[], path: string, contextoLocal?: Record<string, any>) => React.ReactNode[];
  contextoLocal?: Record<string, any>;
}

/**
 * Renderizador de tabelas estruturadas (<tabela>), cabeçalhos, bordas e células editáveis
 */
export const DocumentTableNode: React.FC<DocumentTableNodeProps> = ({
  node,
  blockKey,
  fontScale,
  renderInlineNodes,
  contextoLocal,
}) => {
  const rows: React.ReactNode[] = [];

  (node.filhos || []).forEach((linha, rIdx) => {
    if (!linha || (linha.tipo !== 'cabecalho' && linha.tipo !== 'linha')) return;
    const isHeader = linha.tipo === 'cabecalho';
    const cells: React.ReactNode[] = [];

    (linha.filhos || []).forEach((celula, cIdx) => {
      if (!celula || celula.tipo !== 'celula') return;
      const CellTag = isHeader ? 'th' : 'td';
      cells.push(
        <CellTag
          key={`${blockKey}_r${rIdx}_c${cIdx}`}
          className={`border border-slate-300 px-2.5 py-1.5 text-left select-text ${
            isHeader
              ? 'bg-slate-200 font-bold text-slate-900'
              : 'text-slate-800 even:bg-slate-50/50'
          }`}
          style={{ fontSize: `${12 * fontScale}px`, lineHeight: 1.2 }}
        >
          {renderInlineNodes(celula.filhos || [], `${blockKey}_r${rIdx}_c${cIdx}`, contextoLocal)}
        </CellTag>
      );
    });

    if (cells.length) {
      rows.push(<tr key={`${blockKey}_row_${rIdx}`}>{cells}</tr>);
    }
  });

  return (
    <div key={blockKey} data-word-type="tabela-container" className="my-4 overflow-x-auto select-text">
      <table
        data-word-type="tabela"
        className="w-full border-collapse border border-slate-300 shadow-2xs"
        style={{ fontSize: `${14 * fontScale}px` }}
      >
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
};
