import { AstNode, ColumnType, FieldMetadata, FieldOption, FormGroup, FormItem, FormStructure, IntermediateModel, TableColumnMetadata, XmlPart } from '../types';

export function sanitizarXmlParaParser(xmlString: string): string {
  let res = String(xmlString || '');

  // 1. Remove declarações <?xml ... ?> para controle uniforme de raiz
  res = res.replace(/<\?xml[^>]*\?>/gi, '');

  // 2. Converte entidades HTML comuns para entidades XML válidas ou caracteres literais
  const htmlEntities: Record<string, string> = {
    '&nbsp;': '&#160;',
    '&copy;': '&#169;',
    '&reg;': '&#174;',
    '&trade;': '&#8482;',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&bull;': '•',
    '&deg;': '°',
    '&plusmn;': '±',
    '&times;': '×',
    '&divide;': '÷',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&sect;': '§',
  };
  for (const [entity, replacement] of Object.entries(htmlEntities)) {
    res = res.replaceAll(entity, replacement);
  }

  // 3. Converte caracteres & soltos (que não formam entidades válidas) para &amp;
  res = res.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

  // 4. Converte temporariamente caracteres como < e > dentro de expr="..." para &lt; e &gt;
  res = res.replace(/(\bexpr\s*=\s*)(["'])([\s\S]*?)\2/g, (match, prefix, quote, expr) => {
    const exprSeguro = expr
      .replace(/&(?!lt;|gt;|amp;|quot;|apos;)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `${prefix}${quote}${exprSeguro}${quote}`;
  });

  return res.trim();
}

function reconstructXmlFromHtmlNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tagName = el.tagName.toLowerCase();

  // Ignora o próprio body se for a raiz
  if (tagName === 'body') {
    const childrenStr = Array.from(el.childNodes).map(reconstructXmlFromHtmlNode).join('\n');
    return `<documento>\n${childrenStr}\n</documento>`;
  }

  let attrs = '';
  Array.from(el.attributes).forEach(attr => {
    const val = attr.value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    attrs += ` ${attr.name}="${val}"`;
  });

  const children = Array.from(el.childNodes).map(reconstructXmlFromHtmlNode).join('');
  if (!children && ['input', 'number', 'date', 'textarea', 'br', 'hr', 'coluna'].includes(tagName)) {
    return `<${tagName}${attrs} />`;
  }
  return `<${tagName}${attrs}>${children}</${tagName}>`;
}

export function parseXmlDocument(xmlString: string): Document {
  let xmlTratado = sanitizarXmlParaParser(xmlString || '');

  // Se o XML estiver totalmente vazio, inicializa como documento vazio
  if (!xmlTratado) {
    xmlTratado = '<documento></documento>';
  } else {
    // Verifica se existem múltiplos blocos <documento> ou conteúdo fora da tag raiz <documento>
    const firstDocStart = xmlTratado.search(/<documento(?:\s|>)/i);
    const lastDocEnd = xmlTratado.lastIndexOf('</documento>');

    if (firstDocStart === -1) {
      // Não tem tag <documento> em lugar nenhum
      if (xmlTratado.includes('<formulario>') || xmlTratado.includes('<conteudo>')) {
        xmlTratado = `<documento>\n${xmlTratado}\n</documento>`;
      } else {
        xmlTratado = `<documento>\n  <conteudo>\n${xmlTratado}\n  </conteudo>\n</documento>`;
      }
    } else {
      // Possui <documento>. Verifica se há múltiplos blocos ou texto antes/depois
      const countStarts = (xmlTratado.match(/<documento(?:\s|>)/gi) || []).length;
      const countEnds = (xmlTratado.match(/<\/documento>/gi) || []).length;

      if (countStarts > 1 || countEnds > 1) {
        // Múltiplos blocos de <documento> concatenados (ex: multi-part colado ou anexado)
        const formsMatch = xmlTratado.match(/<formulario>([\s\S]*?)<\/formulario>/gi) || [];
        const contsMatch = xmlTratado.match(/<conteudo>([\s\S]*?)<\/conteudo>/gi) || [];

        const mergedForms = formsMatch
          .map(f => f.replace(/<\/?formulario>/gi, '').trim())
          .filter(Boolean)
          .join('\n\n');

        const mergedConts = contsMatch
          .map(c => c.replace(/<\/?conteudo>/gi, '').trim())
          .filter(Boolean)
          .join('\n\n');

        if (mergedForms || mergedConts) {
          xmlTratado = `<documento>\n  <formulario>\n${mergedForms}\n  </formulario>\n  <conteudo>\n${mergedConts}\n  </conteudo>\n</documento>`;
        } else {
          const inner = xmlTratado.replace(/<\/?documento[^>]*>/gi, '').trim();
          xmlTratado = `<documento>\n${inner}\n</documento>`;
        }
      } else {
        // Apenas um <documento>...</documento>, mas pode haver texto antes do primeiro <documento> ou depois do </documento>
        const before = xmlTratado.substring(0, firstDocStart).trim();
        const after = lastDocEnd !== -1 ? xmlTratado.substring(lastDocEnd + '</documento>'.length).trim() : '';

        if (before || after) {
          const mainBlock = lastDocEnd !== -1 
            ? xmlTratado.substring(firstDocStart, lastDocEnd + '</documento>'.length)
            : `<documento>\n${xmlTratado.substring(firstDocStart)}\n</documento>`;
          
          if (after && !after.startsWith('<!--')) {
            const docSemFechamento = mainBlock.substring(0, mainBlock.lastIndexOf('</documento>'));
            xmlTratado = `${docSemFechamento}\n${after}\n</documento>`;
          } else {
            xmlTratado = mainBlock;
          }
        }
      }
    }
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlTratado, 'text/xml');

  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    // Auto-cura via parser HTML tolerante a falhas
    try {
      const htmlDoc = parser.parseFromString(xmlTratado, 'text/html');
      const body = htmlDoc.body;
      if (body && body.childNodes.length > 0) {
        const reconstructed = reconstructXmlFromHtmlNode(body);
        const healedDoc = parser.parseFromString(reconstructed, 'text/xml');
        if (!healedDoc.querySelector('parsererror')) {
          return healedDoc;
        }
      }
    } catch {
      // Prossegue para erro se auto-cura falhar
    }

    throw new Error(`Erro ao interpretar XML: ${parserError.textContent || 'Sintaxe XML inválida'}`);
  }

  return xmlDoc;
}

export function extrairCampos(formularioNode: Element): FormStructure {
  const grupos: FormGroup[] = [];
  const campos: Record<string, FieldMetadata> = {};

  const tiposCampo = ['input', 'select', 'textarea', 'number', 'date', 'checkbox', 'radio', 'tabela'];

  const registrarCampo = (campoEl: Element): FormItem | null => {
    const tag = campoEl.tagName.toLowerCase();
    if (!tiposCampo.includes(tag)) return null;

    const id = campoEl.getAttribute('id');
    if (!id) return null;

    const label = campoEl.getAttribute('label') || id;
    const descricao = campoEl.getAttribute('descricao') || '';
    const tipoInput = (campoEl.getAttribute('tipo') || (tag === 'number' ? 'number' : 'texto')).toLowerCase().trim();
    const placeholder = campoEl.getAttribute('placeholder') || '';

    const campo: FieldMetadata = {
      id,
      label,
      tipo: (tag === 'number' ? 'number' : tag === 'date' ? 'date' : tag === 'textarea' ? 'textarea' : tag === 'checkbox' ? 'checkbox' : tag === 'radio' ? 'radio' : tag === 'select' ? 'select' : tag === 'tabela' ? 'tabela' : 'input') as import('../types').FieldType,
      tipoInput,
      descricao,
      placeholder,
    };

    if (tag === 'tabela') {
      const colunas: TableColumnMetadata[] = [];
      Array.from(campoEl.children)
        .filter(c => c.tagName.toLowerCase() === 'coluna')
        .forEach(colEl => {
          const colId = colEl.getAttribute('id');
          if (!colId) return;
          const colLabel = colEl.getAttribute('label') || colId;
          const rawTipo = (colEl.getAttribute('tipo') || 'input').toLowerCase().trim();
          
          // Mapeamento unificado (um nome canônico por conceito)
          let colTipo: string = 'input';
          if (rawTipo === 'number') {
            colTipo = 'number';
          } else if (rawTipo === 'moeda') {
            colTipo = 'moeda';
          } else if (rawTipo === 'date') {
            colTipo = 'date';
          } else if (rawTipo === 'select') {
            colTipo = 'select';
          } else if (rawTipo === 'radio') {
            colTipo = 'radio';
          } else if (rawTipo === 'textarea') {
            colTipo = 'textarea';
          } else if (rawTipo === 'checkbox') {
            colTipo = 'checkbox';
          } else if (['cpf', 'cnpj', 'cep', 'email', 'telefone'].includes(rawTipo)) {
            colTipo = rawTipo;
          } else if (rawTipo === 'texto') {
            colTipo = 'input';
          } else {
            colTipo = rawTipo;
          }

          const colPlaceholder = colEl.getAttribute('placeholder') || '';
          const colMin = colEl.getAttribute('min') || undefined;
          const colMax = colEl.getAttribute('max') || undefined;
          const colStep = colEl.getAttribute('step') || undefined;

          const opcoes: string[] = [];
          const opcoesAttr = colEl.getAttribute('opcoes');
          if (opcoesAttr) {
            opcoesAttr.split(',').forEach(op => {
              const trimmed = op.trim();
              if (trimmed && !opcoes.includes(trimmed)) opcoes.push(trimmed);
            });
          }

          Array.from(colEl.children)
            .filter(opt => opt.tagName.toLowerCase() === 'option')
            .forEach(opt => {
              const val = opt.textContent?.trim() || '';
              if (val && !opcoes.includes(val)) {
                opcoes.push(val);
              }
            });

          colunas.push({
            id: colId,
            label: colLabel,
            tipo: ['input', 'texto', 'number', 'moeda', 'date', 'select', 'radio', 'textarea', 'checkbox', 'cpf', 'cnpj', 'cep', 'telefone', 'email'].includes(colTipo) ? (colTipo as ColumnType) : 'input',
            placeholder: colPlaceholder,
            min: colMin,
            max: colMax,
            step: colStep,
            opcoes: opcoes.length ? opcoes : undefined,
          });
        });

      campo.colunas = colunas;
    }

    if (tag === 'number') {
      const min = campoEl.getAttribute('min');
      const max = campoEl.getAttribute('max');
      const step = campoEl.getAttribute('step');
      if (min !== null) campo.min = min;
      if (max !== null) campo.max = max;
      if (step !== null) campo.step = step;
    }

    if (tag === 'textarea') {
      campo.rows = campoEl.getAttribute('rows') || 4;
    }

    if (tag === 'select' || tag === 'radio') {
      campo.opcoes = [];
      campo.opcoesDetalhadas = [];
      campo.controlesCondicionais = [];

      Array.from(campoEl.children).forEach(el => {
        const tipoFilho = el.tagName.toLowerCase();

        if (tipoFilho === 'option') {
          const texto = el.textContent?.trim() || '';
          const valor = el.getAttribute('valor') ?? texto;
          const expr = el.parentElement?.tagName.toLowerCase() === 'if'
            ? el.parentElement.getAttribute('expr') || ''
            : '';

          campo.opcoes?.push(texto);
          campo.opcoesDetalhadas?.push({ label: texto, valor, expr });
        } else if (tipoFilho === 'if') {
          const expr = el.getAttribute('expr') || '';

          // Opções condicionais filhas
          Array.from(el.children)
            .filter(f => f.tagName.toLowerCase() === 'option')
            .forEach(opt => {
              const texto = opt.textContent?.trim() || '';
              const valor = opt.getAttribute('valor') ?? texto;
              campo.opcoes?.push(texto);
              campo.opcoesDetalhadas?.push({ label: texto, valor, expr });
            });

          // Controles/inputs condicionais filhos
          const itens: FormItem[] = [];
          Array.from(el.children).forEach(child => {
            const item = processarItemFormulario(child, expr);
            if (item) itens.push(item);
          });

          if (itens.length) {
            campo.controlesCondicionais?.push({
              tipo: 'if',
              expr,
              itens,
            });
          }
        }
      });
    }

    campos[id] = campo;
    return { tipo: 'campo', id };
  };

  const processarItemFormulario = (el: Element, herdaExpr = ''): FormItem | null => {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;
    const tag = el.tagName.toLowerCase();

    if (tag === 'if') {
      const expr = el.getAttribute('expr') || herdaExpr || '';
      const itens: FormItem[] = [];

      Array.from(el.children).forEach(child => {
        const item = processarItemFormulario(child, expr);
        if (item) itens.push(item);
      });

      return itens.length ? { tipo: 'if', expr, itens } : null;
    }

    if (tiposCampo.includes(tag)) {
      const item = registrarCampo(el);
      if (!item) return null;

      if (herdaExpr && item.tipo === 'campo') {
        campos[item.id].condicao = herdaExpr;
      }
      return item;
    }

    return null;
  };

  const orfaosIds: string[] = [];
  const orfaosItens: FormItem[] = [];

  Array.from(formularioNode.children).forEach(el => {
    const tag = el.tagName.toLowerCase();
    
    if (tag === 'grupo') {
      const titulo = el.getAttribute('titulo') || 'Grupo';
      const ids: string[] = [];
      const itens: FormItem[] = [];

      Array.from(el.children).forEach(childEl => {
        const item = processarItemFormulario(childEl);
        if (!item) return;

        const registrarIds = (it: FormItem | null) => {
          if (!it) return;
          if (it.tipo === 'campo') {
            if (!ids.includes(it.id)) ids.push(it.id);
          } else if (it.tipo === 'if') {
            it.itens.forEach(registrarIds);
          }
        };

        registrarIds(item);
        itens.push(item);
      });

      grupos.push({
        titulo,
        campos: ids,
        itens,
      });
    } else {
      // Processa itens fora de grupos
      const item = processarItemFormulario(el);
      if (item) {
        const registrarIds = (it: FormItem | null) => {
          if (!it) return;
          if (it.tipo === 'campo') {
            if (!orfaosIds.includes(it.id)) orfaosIds.push(it.id);
          } else if (it.tipo === 'if') {
            it.itens.forEach(registrarIds);
          }
        };
        registrarIds(item);
        orfaosItens.push(item);
      }
    }
  });

  if (orfaosItens.length > 0) {
    grupos.unshift({
      titulo: 'Geral',
      campos: orfaosIds,
      itens: orfaosItens,
    });
  }

  return { grupos, campos };
}

export function converterNoParaAst(node: Node): AstNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return { tipo: 'texto', texto: node.textContent || '' };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as Element;
  const atributos: Record<string, string> = {};
  Array.from(el.attributes).forEach(attr => {
    atributos[attr.name] = attr.value;
  });

  const filhos: AstNode[] = Array.from(el.childNodes)
    .map(converterNoParaAst)
    .filter((n): n is AstNode => n !== null);

  return {
    tipo: el.tagName.toLowerCase(),
    atributos,
    filhos,
  };
}

export function converterConteudoParaAst(conteudoNode: Element): AstNode {
  return {
    tipo: 'conteudo',
    atributos: {},
    filhos: Array.from(conteudoNode.childNodes)
      .map(converterNoParaAst)
      .filter((n): n is AstNode => n !== null),
  };
}

export function construirEstadoInicial(campos: Record<string, FieldMetadata>): Record<string, any> {
  const estado: Record<string, any> = {};
  Object.values(campos).forEach(campo => {
    if (campo.tipo === 'checkbox') {
      estado[campo.id] = false;
    } else if (campo.tipo === 'number') {
      estado[campo.id] = '';
    } else if (campo.tipo === 'tabela') {
      const linhaPadrao: Record<string, any> = {};
      (campo.colunas || []).forEach(col => {
        linhaPadrao[col.id] = '';
      });
      estado[campo.id] = [linhaPadrao];
    } else {
      estado[campo.id] = '';
    }
  });
  return estado;
}

export function criarModeloIntermediario(
  xmlDoc: Document,
  xmlName = 'documento.xml',
  xmlParts?: XmlPart[]
): IntermediateModel {
  const formularioNode = xmlDoc.querySelector('formulario');
  let conteudoNode = xmlDoc.querySelector('conteudo');

  // Se não tem tag <conteudo>, mas o documento tem nós que não são o formulário
  if (!conteudoNode) {
    const docElement = xmlDoc.documentElement;
    if (docElement && docElement.tagName.toLowerCase() !== 'conteudo') {
      // Se a própria raiz for outra tag (ou <documento> contendo seções diretamente)
      conteudoNode = docElement;
    }
  }

  const formulario: FormStructure = formularioNode
    ? extrairCampos(formularioNode)
    : { grupos: [], campos: {} };

  const dados = construirEstadoInicial(formulario.campos);

  let conteudo: AstNode;
  if (conteudoNode && conteudoNode.tagName.toLowerCase() === 'conteudo') {
    const rawAst = converterConteudoParaAst(conteudoNode);
    // Remove nós de texto puramente em branco na raiz do conteúdo
    const filhosFiltrados = (rawAst.filhos || []).filter(
      n => n.tipo !== 'texto' || (n.texto || '').trim().length > 0
    );
    conteudo = {
      tipo: 'conteudo',
      atributos: rawAst.atributos || {},
      filhos: filhosFiltrados,
    };
  } else if (conteudoNode) {
    const filhosFiltrados = Array.from(conteudoNode.childNodes)
      .filter(n => {
        if (n.nodeType === Node.ELEMENT_NODE) {
          return (n as Element).tagName.toLowerCase() !== 'formulario';
        }
        if (n.nodeType === Node.TEXT_NODE) {
          return (n.textContent || '').trim().length > 0;
        }
        return false;
      })
      .map(converterNoParaAst)
      .filter((n): n is AstNode => n !== null);

    conteudo = {
      tipo: 'conteudo',
      atributos: {},
      filhos: filhosFiltrados,
    };
  } else {
    conteudo = { tipo: 'conteudo', atributos: {}, filhos: [] };
  }

  return {
    tipo: 'documento',
    xmlName,
    formulario,
    dados,
    conteudo,
    xmlParts: xmlParts && xmlParts.length > 0 ? xmlParts : undefined,
  };
}

/**
 * Analisa o nome do arquivo para extrair o nome base e o índice de partição [XX].
 * Exemplos:
 *   "Contrato [01].xml" -> { baseNome: "Contrato", indice: 1, isPart: true }
 *   "Documento [2].xml"  -> { baseNome: "Documento", indice: 2, isPart: true }
 *   "Modelo.xml"         -> { baseNome: "Modelo", indice: null, isPart: false }
 */
export function extrairIndiceParteXml(nomeArquivo: string): {
  baseNome: string;
  indice: number | null;
  isPart: boolean;
} {
  const limpo = nomeArquivo.trim();
  // Busca estritamente o padrão [1] ou [01] no final do nome antes da extensão .xml
  // Exemplo válido: "Contrato [1].xml", "Exemplo [01].xml", "Minuta [2]"
  // Não aceita: "[01] Contrato.xml", "[Parte 1].xml", etc.
  const matchFim = limpo.match(/^(.*?)(?:\s*\[(\d+)\])(?:\.xml)?$/i);
  if (matchFim) {
    const baseNome = matchFim[1].trim() || 'Documento';
    const indice = parseInt(matchFim[2], 10);
    return { baseNome, indice, isPart: true };
  }
  const baseSemExt = limpo.replace(/\.xml$/i, '');
  return { baseNome: baseSemExt, indice: null, isPart: false };
}

/**
 * Concatena múltiplos arquivos XML particionados em um único documento XML válido.
 * 
 * Regra de Mesclagem:
 * 1. Ordena as partes pelo índice numérico crescente.
 * 2. Unifica todos os <grupo> dentro de uma única tag <formulario>.
 * 3. Unifica todos os nós/seções/títulos dentro de uma única tag <conteudo>.
 * 4. Retorna a string XML concatenada e formatada.
 */
export function concatenarXmlsParticionados(
  partes: { nome: string; xml: string; index?: number }[]
): string {
  if (!partes || partes.length === 0) return '';
  if (partes.length === 1) return partes[0].xml;

  // Ordena pelo índice ou nome
  const partesOrdenadas = [...partes].sort((a, b) => {
    const idxA = a.index !== undefined ? a.index : extrairIndiceParteXml(a.nome).indice ?? 999;
    const idxB = b.index !== undefined ? b.index : extrairIndiceParteXml(b.nome).indice ?? 999;
    if (idxA !== idxB) return idxA - idxB;
    return a.nome.localeCompare(b.nome);
  });

  const gruposXml: string[] = [];
  const conteudosXml: string[] = [];

  partesOrdenadas.forEach((parte, idx) => {
    try {
      const doc = parseXmlDocument(parte.xml);
      const formNode = doc.querySelector('formulario');
      const contNode = doc.querySelector('conteudo');

      if (formNode) {
        // Pega todos os grupos ou nós internos do formulário
        Array.from(formNode.children).forEach(filho => {
          gruposXml.push(filho.outerHTML);
        });
      }

      if (contNode) {
        // Pega todo o conteúdo interno
        let innerHtml = contNode.innerHTML;
        if (!innerHtml) {
          // Fallback caso innerHTML não esteja disponível no parser XML
          innerHtml = Array.from(contNode.childNodes)
            .map(n => (n.nodeType === Node.ELEMENT_NODE ? (n as Element).outerHTML : n.textContent || ''))
            .join('\n');
        }
        conteudosXml.push(innerHtml.trim());
      } else {
        // Se a parte não tem <conteudo>, verifica se é um fragmento de seções ou documento
        const docElement = doc.documentElement;
        if (docElement && docElement.tagName.toLowerCase() !== 'documento') {
          conteudosXml.push(docElement.outerHTML);
        }
      }
    } catch {
      // Fallback regex se houver erro estrito de parser
      const matchForm = parte.xml.match(/<formulario>([\s\S]*?)<\/formulario>/i);
      if (matchForm) {
        gruposXml.push(matchForm[1].trim());
      }
      const matchCont = parte.xml.match(/<conteudo>([\s\S]*?)<\/conteudo>/i);
      if (matchCont) {
        conteudosXml.push(matchCont[1].trim());
      }
    }
  });

  const formularioUnificado = gruposXml.length > 0 
    ? `    <formulario>\n${gruposXml.map(g => `        ${g.trim()}`).join('\n\n')}\n    </formulario>`
    : '    <formulario>\n    </formulario>';

  const conteudoUnificado = conteudosXml.length > 0
    ? `    <conteudo>\n${conteudosXml.map(c => `        ${c.trim()}`).join('\n\n')}\n    </conteudo>`
    : '    <conteudo>\n    </conteudo>';

  return `<documento>\n${formularioUnificado}\n\n${conteudoUnificado}\n</documento>`;
}

