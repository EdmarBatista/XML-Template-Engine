import React from 'react';
import { AstNode, FormStructure, NumberingContext } from '../../types';
import {
  aplicarFiltroDocumento,
  formatarItemForeach,
  valoresDaLista,
} from '../../utils/documentUtils';
import { avaliarExpressao, extrairVariaveisDaExpressao } from '../../utils/expressionEvaluator';
import { DocumentInlineVariable } from './DocumentInlineVariable';
import { DocumentTableNode } from './DocumentTableNode';
import { DocumentSectionNode } from './DocumentSectionNode';

export const extrairTooltip = (id: string, estrutura: FormStructure): string => {
  const campo = estrutura.campos[id];
  if (!campo) return id;
  const grupo = estrutura.grupos.find(g => g.campos.includes(id));
  const caminho = grupo ? `${grupo.titulo} > ${campo.label}` : campo.label;
  return campo.descricao ? `${caminho} — ${campo.descricao}` : caminho;
};

interface DocumentNodeRendererProps {
  nodes: AstNode[];
  dados: Record<string, any>;
  estrutura: FormStructure;
  destaquesAtivos: Record<string, number>;
  onFocusField: (fieldId: string) => void;
  onUpdateField: (fieldId: string, value: any, origem?: string) => void;
  edicaoInline: boolean;
  variaveisVermelhasWord: boolean;
  fontScale: number;
  contextoNumeracao: NumberingContext;
  pathPrefix?: string;
  contextoLocal?: Record<string, any>;
  nivelSecao?: number;
}

/**
 * Dispatcher central e renderizador semântico dos nós AST do documento
 */
export const DocumentNodeRenderer: React.FC<DocumentNodeRendererProps> = ({
  nodes,
  dados,
  estrutura,
  destaquesAtivos,
  onFocusField,
  onUpdateField,
  edicaoInline,
  variaveisVermelhasWord,
  fontScale,
  contextoNumeracao,
  pathPrefix = 'blk',
  contextoLocal,
  nivelSecao = 0,
}) => {
  const processarTextoComVariaveis = (
    textoOriginal: string,
    prefixKey: string = 'text',
    ctxLocal?: Record<string, any>
  ): React.ReactNode[] => {
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
      const valorBruto = escopo[chave] !== undefined ? escopo[chave] : '';
      const valorFormatado = filtro ? aplicarFiltroDocumento(valorBruto, filtro) : valorBruto;

      const origemLista = ctxLocal?.__edmListaOrigem?.[chave];
      const isForeachVar = !!origemLista;
      const chaveReal = origemLista || chave;

      const valorBrutoReal = isForeachVar ? escopo[chaveReal] : valorBruto;

      if (isLocalVar && !origemLista) {
        partes.push(
          <span
            key={`${prefixKey}_localvar_${chave}_${matchCount++}_${match.index}`}
            className="text-slate-900"
          >
            {valorFormatado || `{{${chave}}}`}
          </span>
        );
      } else {
        partes.push(
          <DocumentInlineVariable
            key={`${prefixKey}_var_${chave}_${matchCount++}_${match.index}`}
            id={chaveReal}
            valorBruto={valorBrutoReal}
            valorExibido={valorFormatado}
            filtro={filtro}
            listaForeach={isForeachVar}
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
  };

  const renderInlineNodes = (
    inlineNodes: AstNode[],
    path: string = 'inline',
    ctxLocal?: Record<string, any>
  ): React.ReactNode[] => {
    const escopo = { ...dados, ...(ctxLocal || {}) };
    const items: React.ReactNode[] = [];
    inlineNodes.forEach((node, idx) => {
      const nodeKey = `${path}_${node.tipo}_${idx}`;
      if (node.tipo === 'texto') {
        items.push(...processarTextoComVariaveis(node.texto || '', nodeKey, ctxLocal));
      } else if (node.tipo === 'b' || node.tipo === 'strong') {
        items.push(<strong key={nodeKey}>{renderInlineNodes(node.filhos || [], nodeKey, ctxLocal)}</strong>);
      } else if (node.tipo === 'i' || node.tipo === 'em') {
        items.push(<em key={nodeKey}>{renderInlineNodes(node.filhos || [], nodeKey, ctxLocal)}</em>);
      } else if (node.tipo === 'u') {
        items.push(<u key={nodeKey}>{renderInlineNodes(node.filhos || [], nodeKey, ctxLocal)}</u>);
      } else if (node.tipo === 'br') {
        items.push(<br key={nodeKey} />);
      } else if (node.tipo === 'if') {
        if (avaliarExpressao(node.atributos?.expr || '', escopo)) {
          items.push(...renderInlineNodes(node.filhos || [], nodeKey, ctxLocal));
        }
      }
    });
    return items;
  };

  const renderizarParagrafosInline = (
    pNodes: AstNode[],
    path: string,
    ctxNum: NumberingContext,
    ctxLocal?: Record<string, any>,
    nSecao: number = 0
  ): React.ReactNode[] => {
    const escopo = { ...dados, ...(ctxLocal || {}) };
    const paragraphs: React.ReactNode[] = [];
    let currentParagraph: React.ReactNode[] = [];
    let pKeyCounter = 0;

    const flushParagraph = () => {
      const temConteudo = currentParagraph.some(item => {
        if (typeof item === 'string') return item.trim().length > 0;
        return item !== null && item !== undefined;
      });

      if (temConteudo) {
        let prefixoNum = '';
        if (ctxNum.habilitado) {
          const num = ctxNum.prefixo
            ? `${ctxNum.prefixo}.${ctxNum.next}`
            : String(ctxNum.next);
          ctxNum.next++;
          ctxNum.lastNumber = num;
          prefixoNum = `${num}.`;
        }

        paragraphs.push(
          <p
            key={`${path}_p_${pKeyCounter++}`}
            data-word-type="paragrafo"
            data-word-level={nSecao}
            data-word-numerado={prefixoNum ? 'true' : 'false'}
            data-word-numbered={prefixoNum ? 'true' : 'false'}
            className="text-slate-800 leading-relaxed text-justify my-2 select-text"
            style={{ fontSize: `${14 * fontScale}px`, lineHeight: 1.6 }}
          >
            {prefixoNum && (
              <span data-word-num="true" className="font-semibold text-slate-900 mr-0.5 select-text">
                {prefixoNum}{' '}
              </span>
            )}
            {currentParagraph}
          </p>
        );
      }
      currentParagraph = [];
    };

    const processInlineNode = (
      node: AstNode,
      nodeKey: string,
      wrapper?: (child: React.ReactNode, key: string) => React.ReactNode
    ) => {
      if (!node) return;

      let wrapCounter = 0;
      const wrap = (child: React.ReactNode) => {
        if (!wrapper) return child;
        const k = `${nodeKey}_w_${wrapCounter++}`;
        return wrapper(child, k);
      };

      if (node.tipo === 'texto') {
        const rawText = node.texto || '';
        const partes = processarTextoComVariaveis(rawText, nodeKey, ctxLocal);

        partes.forEach(parte => {
          if (typeof parte === 'string') {
            if (parte.includes('\n')) {
              const lines = parte.split('\n');
              lines.forEach((line, lIdx) => {
                if (lIdx > 0) {
                  flushParagraph();
                }
                const cleanLine = lIdx > 0 ? line.replace(/^\s+/, '') : line;
                if (cleanLine) {
                  currentParagraph.push(wrap(cleanLine));
                }
              });
            } else {
              if (parte) {
                currentParagraph.push(wrap(parte));
              }
            }
          } else {
            currentParagraph.push(wrap(parte));
          }
        });
      } else if (node.tipo === 'b' || node.tipo === 'strong') {
        (node.filhos || []).forEach((f, fIdx) => {
          const childKey = `${nodeKey}_b_${fIdx}`;
          processInlineNode(f, childKey, (child, k) => {
            const el = (
              <strong key={k} className="font-bold text-slate-900">
                {child}
              </strong>
            );
            return wrapper ? wrapper(el, `${k}_w`) : el;
          });
        });
      } else if (node.tipo === 'i' || node.tipo === 'em') {
        (node.filhos || []).forEach((f, fIdx) => {
          const childKey = `${nodeKey}_i_${fIdx}`;
          processInlineNode(f, childKey, (child, k) => {
            const el = (
              <em key={k} className="italic">
                {child}
              </em>
            );
            return wrapper ? wrapper(el, `${k}_w`) : el;
          });
        });
      } else if (node.tipo === 'u') {
        (node.filhos || []).forEach((f, fIdx) => {
          const childKey = `${nodeKey}_u_${fIdx}`;
          processInlineNode(f, childKey, (child, k) => {
            const el = (
              <u key={k} className="underline">
                {child}
              </u>
            );
            return wrapper ? wrapper(el, `${k}_w`) : el;
          });
        });
      } else if (node.tipo === 'br') {
        flushParagraph();
      } else if (node.tipo === 'if') {
        const expr = node.atributos?.expr || '';
        if (avaliarExpressao(expr, escopo)) {
          const vars = extrairVariaveisDaExpressao(expr);
          const primeiraVar = vars[0];
          const tooltip = primeiraVar ? extrairTooltip(primeiraVar, estrutura) : expr;
          const isHighlighted = vars.some(v => Boolean(destaquesAtivos[v]));

          (node.filhos || []).forEach((f, fIdx) => {
            const childKey = `${nodeKey}_if_${fIdx}`;
            processInlineNode(f, childKey, (child, k) => {
              const el = (
                <span
                  key={k}
                  data-vars={vars.join(',')}
                  title={
                    primeiraVar
                      ? `Clique para localizar o campo que controla esta condição: ${tooltip}`
                      : undefined
                  }
                  onClick={e => {
                    if (primeiraVar) {
                      e.stopPropagation();
                      onFocusField(primeiraVar);
                    }
                  }}
                  className={`rounded px-0.5 transition-colors duration-500 ease-in-out ${
                    primeiraVar ? 'cursor-pointer hover:ring-1 hover:ring-blue-300' : ''
                  } ${
                    isHighlighted
                      ? 'bg-emerald-100/80 ring-1 ring-emerald-400 px-0.5 rounded shadow-xs'
                      : ''
                  }`}
                >
                  {child}
                </span>
              );
              return wrapper ? wrapper(el, `${k}_w`) : el;
            });
          });
        }
      }
    };

    pNodes.forEach((node, idx) => {
      processInlineNode(node, `${path}_node_${idx}`);
    });

    flushParagraph();
    return paragraphs;
  };

  const renderAstBlocos = (
    blocos: AstNode[],
    ctxNum: NumberingContext,
    prefix: string,
    ctxLocal?: Record<string, any>,
    nSecao: number = 0
  ): React.ReactNode[] => {
    const escopo = { ...dados, ...(ctxLocal || {}) };
    const elementos: React.ReactNode[] = [];
    let inlineBuffer: AstNode[] = [];

    const flushInlineBuffer = (idxRef: number) => {
      if (!inlineBuffer.length) return;
      const paragrafos = renderizarParagrafosInline(
        inlineBuffer,
        `${prefix}_inline_group_${idxRef}`,
        ctxNum,
        ctxLocal,
        nSecao
      );
      elementos.push(...paragrafos);
      inlineBuffer = [];
    };

    blocos.forEach((node, idx) => {
      if (!node) return;
      const blockKey = `${prefix}_${node.tipo}_${idx}`;

      if (
        node.tipo === 'texto' ||
        node.tipo === 'b' ||
        node.tipo === 'strong' ||
        node.tipo === 'i' ||
        node.tipo === 'em' ||
        node.tipo === 'u' ||
        node.tipo === 'br'
      ) {
        inlineBuffer.push(node);
        return;
      }

      flushInlineBuffer(idx);

      if (node.tipo === 'p' || node.tipo === 'paragrafo') {
        const paragrafos = renderizarParagrafosInline(
          node.filhos || [],
          `${blockKey}_p`,
          ctxNum,
          ctxLocal,
          nSecao
        );
        elementos.push(...paragrafos);
      } else if (node.tipo === 'titulo') {
        const texto = (node.filhos || []).map(f => f.texto || '').join('');
        elementos.push(
          <h1
            key={blockKey}
            data-word-type="titulo"
            className="font-bold text-center text-slate-900 mt-6 mb-2 tracking-tight uppercase select-text"
            style={{ fontSize: `${20 * fontScale}px`, lineHeight: 1.25 }}
          >
            {processarTextoComVariaveis(texto, `${blockKey}_h1`, ctxLocal)}
          </h1>
        );
      } else if (node.tipo === 'subtitulo') {
        const texto = (node.filhos || []).map(f => f.texto || '').join('');
        elementos.push(
          <h2
            key={blockKey}
            data-word-type="subtitulo"
            className="font-semibold text-center text-slate-600 mb-6 italic select-text"
            style={{ fontSize: `${14 * fontScale}px`, lineHeight: 1.35 }}
          >
            {processarTextoComVariaveis(texto, `${blockKey}_h2`, ctxLocal)}
          </h2>
        );
      } else if (node.tipo === 'secao') {
        elementos.push(
          <DocumentSectionNode
            key={blockKey}
            node={node}
            blockKey={blockKey}
            contextoNumeracao={ctxNum}
            nivelSecao={nSecao}
            fontScale={fontScale}
            processarTextoComVariaveis={processarTextoComVariaveis}
            renderAstBlocos={renderAstBlocos}
            contextoLocal={ctxLocal}
          />
        );
      } else if (node.tipo === 'if') {
        const expr = node.atributos?.expr || '';
        if (avaliarExpressao(expr, escopo)) {
          const vars = extrairVariaveisDaExpressao(expr);
          const primeiraVar = vars[0];
          const tooltip = primeiraVar ? extrairTooltip(primeiraVar, estrutura) : expr;
          const isHighlighted = vars.some(v => Boolean(destaquesAtivos[v]));

          elementos.push(
            <div
              key={blockKey}
              data-vars={vars.join(',')}
              data-word-type="if-bloco"
              title={
                primeiraVar
                  ? `Clique para localizar o campo que controla esta condição: ${tooltip}`
                  : undefined
              }
              onClick={e => {
                if (primeiraVar) {
                  e.stopPropagation();
                  onFocusField(primeiraVar);
                }
              }}
              className={`rounded p-1.5 border-l-2 space-y-2 select-text transition-colors duration-500 ease-in-out ${
                primeiraVar ? 'cursor-pointer hover:ring-1 hover:ring-blue-300' : ''
              } ${
                isHighlighted
                  ? 'bg-emerald-100/70 border-emerald-500 ring-1 ring-emerald-300 shadow-xs'
                  : 'bg-blue-50/30 border-blue-400'
              }`}
            >
              {renderAstBlocos(node.filhos || [], ctxNum, `${blockKey}_if`, ctxLocal, nSecao)}
            </div>
          );
        }
      } else if (node.tipo === 'foreach') {
        const varName = node.atributos?.var;
        const listaNome = node.atributos?.lista;
        if (varName && listaNome) {
          const valorListaBruto = escopo[listaNome];
          const itens = valoresDaLista(valorListaBruto);
          itens.forEach((it, idxLoop) => {
            const itemFormatado = formatarItemForeach(it);
            elementos.push(
              ...renderAstBlocos(
                node.filhos || [],
                ctxNum,
                `${blockKey}_each_${idxLoop}`,
                {
                  ...(ctxLocal || {}),
                  [varName]: itemFormatado,
                  __edmListaOrigem: {
                    ...(ctxLocal?.__edmListaOrigem || {}),
                    [varName]: listaNome,
                  },
                },
                nSecao
              )
            );
          });
        }
      } else if (node.tipo === 'lista') {
        const numerada = node.atributos?.numerada === 'true';
        const ListTag = numerada ? 'ol' : 'ul';
        const listItems: React.ReactNode[] = [];

        const processarFilhosLista = (filhos: AstNode[], lPath: string, ctx?: Record<string, any>) => {
          const escopoLista = { ...dados, ...(ctx || {}) };
          filhos.forEach((f, fIdx) => {
            if (f.tipo === 'texto' && !f.texto?.trim()) return;

            const itemKey = `${lPath}_item_${fIdx}`;
            if (f.tipo === 'item') {
              listItems.push(
                <li key={itemKey} data-word-type="item" className="select-text">
                  {renderInlineNodes(f.filhos || [], itemKey, ctx)}
                </li>
              );
            } else if (f.tipo === 'foreach') {
              const varName = f.atributos?.var;
              const listaNome = f.atributos?.lista;
              if (varName && listaNome) {
                const valorListaBruto = escopoLista[listaNome];
                const itens = valoresDaLista(valorListaBruto);
                itens.forEach((it, eachIdx) => {
                  const itemFormatado = formatarItemForeach(it);
                  const loopCtx = {
                    ...(ctx || {}),
                    [varName]: itemFormatado,
                    __edmListaOrigem: {
                      ...(ctx?.__edmListaOrigem || {}),
                      [varName]: listaNome,
                    },
                  };
                  const subItensValidos = (f.filhos || []).filter(
                    sub => !(sub.tipo === 'texto' && !sub.texto?.trim())
                  );
                  if (subItensValidos.length === 0) {
                    listItems.push(
                      <li key={`${itemKey}_each_${eachIdx}`} data-word-type="item" className="select-text">
                        <span className="text-slate-900">{itemFormatado}</span>
                      </li>
                    );
                  } else {
                    subItensValidos.forEach((subItem, sIdx) => {
                      const subKey = `${itemKey}_each_${eachIdx}_${sIdx}`;
                      if (subItem.tipo === 'item') {
                        listItems.push(
                          <li key={subKey} data-word-type="item" className="select-text">
                            {renderInlineNodes(subItem.filhos || [], subKey, loopCtx)}
                          </li>
                        );
                      } else {
                        listItems.push(
                          <li key={subKey} data-word-type="item" className="select-text">
                            {renderInlineNodes([subItem], subKey, loopCtx)}
                          </li>
                        );
                      }
                    });
                  }
                });
              }
            } else if (f.tipo === 'if') {
              if (avaliarExpressao(f.atributos?.expr || '', escopoLista)) {
                processarFilhosLista(f.filhos || [], `${itemKey}_if`, ctx);
              }
            }
          });
        };

        processarFilhosLista(node.filhos || [], `${blockKey}_list`, ctxLocal);

        elementos.push(
          <ListTag
            key={blockKey}
            data-word-type="lista"
            data-word-numerada={numerada ? 'true' : 'false'}
            className={`text-slate-800 space-y-1.5 my-3 pl-6 select-text ${
              numerada ? 'list-decimal' : 'list-disc'
            }`}
            style={{ fontSize: `${14 * fontScale}px`, lineHeight: 1.5 }}
          >
            {listItems}
          </ListTag>
        );
      } else if (node.tipo === 'tabela') {
        elementos.push(
          <DocumentTableNode
            key={blockKey}
            node={node}
            blockKey={blockKey}
            fontScale={fontScale}
            renderInlineNodes={renderInlineNodes}
            contextoLocal={ctxLocal}
          />
        );
      }
    });

    flushInlineBuffer(blocos.length);
    return elementos;
  };

  const elementos = renderAstBlocos(nodes, contextoNumeracao, pathPrefix, contextoLocal, nivelSecao);
  return <>{elementos}</>;
};
