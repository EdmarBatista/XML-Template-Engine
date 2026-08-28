import { AstNode, FieldMetadata, FieldOption, FormGroup, FormItem, FormStructure, IntermediateModel } from '../types';

export function sanitizarXmlParaParser(xmlString: string): string {
  // Converte temporariamente caracteres como < e > dentro de expr="..." para &lt; e &gt;
  return String(xmlString).replace(/(\bexpr\s*=\s*)(["'])([\s\S]*?)\2/g, (match, prefix, quote, expr) => {
    const exprSeguro = expr
      .replace(/&(?!lt;|gt;|amp;|quot;|apos;)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `${prefix}${quote}${exprSeguro}${quote}`;
  });
}

export function parseXmlDocument(xmlString: string): Document {
  const xmlSeguro = sanitizarXmlParaParser(xmlString);
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlSeguro, 'text/xml');

  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`Erro ao interpretar XML: ${parserError.textContent || 'Sintaxe XML inválida'}`);
  }

  return xmlDoc;
}

export function extrairCampos(formularioNode: Element): FormStructure {
  const grupos: FormGroup[] = [];
  const campos: Record<string, FieldMetadata> = {};

  const tiposCampo = ['input', 'select', 'textarea', 'number', 'date', 'checkbox', 'radio'];

  const registrarCampo = (campoEl: Element): FormItem | null => {
    const tag = campoEl.tagName.toLowerCase();
    if (!tiposCampo.includes(tag)) return null;

    const id = campoEl.getAttribute('id');
    if (!id) return null;

    const label = campoEl.getAttribute('label') || id;
    const descricao = campoEl.getAttribute('descricao') || '';
    const tipoInput = campoEl.getAttribute('tipo') || 'text';
    const validar = campoEl.getAttribute('validar') || campoEl.getAttribute('validacao') || '';
    const placeholder = campoEl.getAttribute('placeholder') || '';
    const exemplo = campoEl.getAttribute('exemplo') || '';

    const campo: FieldMetadata = {
      id,
      label,
      tipo: (tag === 'number' ? 'number' : tag === 'date' ? 'date' : tag === 'textarea' ? 'textarea' : tag === 'checkbox' ? 'checkbox' : tag === 'radio' ? 'radio' : tag === 'select' ? 'select' : 'input') as any,
      tipoInput,
      descricao,
      placeholder,
      exemplo,
    };

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

  formularioNode.querySelectorAll(':scope > grupo').forEach(grupoEl => {
    const titulo = grupoEl.getAttribute('titulo') || 'Grupo';
    const ids: string[] = [];
    const itens: FormItem[] = [];

    Array.from(grupoEl.children).forEach(el => {
      const item = processarItemFormulario(el);
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
  });

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
    } else {
      estado[campo.id] = '';
    }
  });
  return estado;
}

export function criarModeloIntermediario(xmlDoc: Document, xmlName = 'documento.xml'): IntermediateModel {
  const formularioNode = xmlDoc.querySelector('formulario');
  const conteudoNode = xmlDoc.querySelector('conteudo');

  if (!formularioNode || !conteudoNode) {
    throw new Error('XML inválido: As tags <formulario> e <conteudo> são obrigatórias.');
  }

  const formulario = extrairCampos(formularioNode);
  const dados = construirEstadoInicial(formulario.campos);
  const conteudo = converterConteudoParaAst(conteudoNode);

  return {
    tipo: 'documento',
    xmlName,
    formulario,
    dados,
    conteudo,
  };
}
