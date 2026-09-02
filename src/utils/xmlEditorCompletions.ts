import { Completion, CompletionContext, CompletionResult, snippet } from '@codemirror/autocomplete';
import { extrairVariaveisDaExpressao } from './expressionEvaluator';

export const TEMPLATE_NOVO_DOCUMENTO = `<documento>
    <formulario>
        <grupo titulo="">
        </grupo>
    </formulario>
    <conteudo>
    </conteudo>
</documento>`;

export interface CampoExtraido {
  id: string;
  tag: string;
  label: string;
  tipo?: string;
  colunas?: string[];
}

export interface ResultadoValidacaoVariaveis {
  usadasNaoDeclaradas: string[];
  declaradasNaoUsadas: string[];
}

/**
 * Extrai todos os campos e colunas declarados no <formulario> de um XML.
 */
export function extrairCamposDeclarados(xmlString: string): CampoExtraido[] {
  const campos: CampoExtraido[] = [];
  if (!xmlString) return campos;

  // Busca tags de campo no formulário: <input, <number, <textarea, <select, <radio, <checkbox, <date, <tabela
  const regexCampos = /<(input|number|textarea|select|radio|checkbox|date|tabela)\b([^>]*?)(?:\/?>|>([\s\S]*?)<\/\1>)/gi;
  let match: RegExpExecArray | null;

  while ((match = regexCampos.exec(xmlString)) !== null) {
    const tag = match[1].toLowerCase();
    const attrsStr = match[2];
    const corpoTag = match[3] || '';

    const idMatch = attrsStr.match(/\bid\s*=\s*["']([^"']+)["']/i);
    if (!idMatch) continue;
    const id = idMatch[1].trim();

    const labelMatch = attrsStr.match(/\blabel\s*=\s*["']([^"']+)["']/i);
    const label = labelMatch ? labelMatch[1].trim() : id;

    const tipoMatch = attrsStr.match(/\btipo\s*=\s*["']([^"']+)["']/i);
    const tipo = tipoMatch ? tipoMatch[1].trim() : undefined;

    const colunas: string[] = [];
    if (tag === 'tabela' && corpoTag) {
      const regexColunas = /<coluna\b[^>]*?\bid\s*=\s*["']([^"']+)["']/gi;
      let colMatch: RegExpExecArray | null;
      while ((colMatch = regexColunas.exec(corpoTag)) !== null) {
        colunas.push(colMatch[1].trim());
      }
    }

    campos.push({ id, tag, label, tipo, colunas });
  }

  return campos;
}

/**
 * Valida o uso de variáveis no XML:
 * - Identifica variáveis usadas em {{...}} que não foram declaradas no formulário.
 * - Identifica campos declarados no formulário que não foram referenciados no documento.
 */
export function verificarVariaveisXml(xmlString: string): ResultadoValidacaoVariaveis {
  if (!xmlString || typeof xmlString !== 'string') {
    return { usadasNaoDeclaradas: [], declaradasNaoUsadas: [] };
  }

  const campos = extrairCamposDeclarados(xmlString);
  const idsDeclarados = new Set<string>();
  const colunasPorTabela: Record<string, Set<string>> = {};

  campos.forEach(c => {
    idsDeclarados.add(c.id);
    if (c.colunas && c.colunas.length > 0) {
      colunasPorTabela[c.id] = new Set(c.colunas);
    }
  });

  // Variáveis reservadas / utilitárias de loops e expressões que não devem ser sinalizadas
  const variaveisReservadas = new Set([
    '_indice',
    '_index',
    'index',
    '_idx',
    'numero',
    'true',
    'false',
    'null',
    'undefined',
    'amp',
    'lt',
    'gt',
    'quot',
    'apos',
  ]);

  // Identifica variáveis de iteração de loops (<foreach var="it">, <linhas var="linha">)
  const loopVars = new Set<string>();
  const regexForeachVar = /<(?:foreach|linhas)\b[^>]*?\bvar\s*=\s*["']([^"']+)["']/gi;
  let loopMatch: RegExpExecArray | null;
  while ((loopMatch = regexForeachVar.exec(xmlString)) !== null) {
    loopVars.add(loopMatch[1].trim());
  }

  // 1. Extrai todas as variáveis interpoladas em {{ ... }}
  const regexInterpolacao = /\{\{([\s\S]*?)\}\}/g;
  const variaveisUsadas = new Set<string>();
  let interMatch: RegExpExecArray | null;

  while ((interMatch = regexInterpolacao.exec(xmlString)) !== null) {
    const expressao = interMatch[1];
    // Pega a parte antes do primeiro pipe de filtro (|)
    const parteVariavel = expressao.split('|')[0].trim();
    if (!parteVariavel) continue;

    // Normaliza acessos com índice como tabela.coluna[0] ou tabela[0].coluna
    const limpo = parteVariavel
      .replace(/\[\d+\]/g, '')
      .replace(/\s+/g, '');

    variaveisUsadas.add(limpo);
  }

  // 2. Extrai referências em tags de condição (<if expr="...">, <condicao expr="...">)
  const regexCondicao = /<(?:if|condicao)\b[^>]*?\bexpr\s*=\s*["']([^"']+)["']/gi;
  let condMatch: RegExpExecArray | null;
  while ((condMatch = regexCondicao.exec(xmlString)) !== null) {
    const expr = condMatch[1];
    const tokens = extrairVariaveisDaExpressao(expr);
    tokens.forEach(t => {
      const limpo = t.replace(/\[\d+\]/g, '');
      variaveisUsadas.add(limpo);
    });
  }

  // 3. Extrai referências em tags de loop (<foreach lista="...">)
  const regexLoopLista = /<(?:foreach|tabela)\b[^>]*?\b(?:lista|de)\s*=\s*["']([^"']+)["']/gi;
  let listaMatch: RegExpExecArray | null;
  while ((listaMatch = regexLoopLista.exec(xmlString)) !== null) {
    variaveisUsadas.add(listaMatch[1].trim());
  }

  // Identifica Usadas mas NÃO declaradas
  const usadasNaoDeclaradasSet = new Set<string>();
  variaveisUsadas.forEach(varName => {
    if (variaveisReservadas.has(varName)) return;

    if (varName.includes('.')) {
      const [raiz, sub] = varName.split('.');
      if (loopVars.has(raiz)) return; // Ex.: item.nome onde item é var do foreach
      if (idsDeclarados.has(raiz)) {
        // É uma tabela declarada
        const cols = colunasPorTabela[raiz];
        if (cols && !cols.has(sub) && sub !== '_indice' && sub !== 'index') {
          usadasNaoDeclaradasSet.add(varName);
        }
        return;
      }
      usadasNaoDeclaradasSet.add(varName);
    } else {
      if (loopVars.has(varName)) return;
      if (!idsDeclarados.has(varName)) {
        usadasNaoDeclaradasSet.add(varName);
      }
    }
  });

  // Identifica Declaradas mas NÃO usadas
  const declaradasNaoUsadasSet = new Set<string>();
  idsDeclarados.forEach(idDecl => {
    let encontrada = false;
    for (const usada of variaveisUsadas) {
      if (usada === idDecl || usada.startsWith(`${idDecl}.`)) {
        encontrada = true;
        break;
      }
    }
    if (!encontrada) {
      declaradasNaoUsadasSet.add(idDecl);
    }
  });

  return {
    usadasNaoDeclaradas: Array.from(usadasNaoDeclaradasSet),
    declaradasNaoUsadas: Array.from(declaradasNaoUsadasSet),
  };
}

/**
 * Filtros canônicos disponíveis no sistema
 */
const FILTROS_COMPLETION: Completion[] = [
  { label: 'moeda', type: 'function', detail: 'Filtro', info: 'Formata valor numérico para Real brasileiro (ex: R$ 1.500,00)' },
  { label: 'moedaPorExtenso', type: 'function', detail: 'Filtro', info: 'Converte valor monetário por extenso (ex: um mil e quinhentos reais)' },
  { label: 'numeroPorExtenso', type: 'function', detail: 'Filtro', info: 'Converte número cardinal por extenso (ex: cento e vinte e três)' },
  { label: 'data', type: 'function', detail: 'Filtro', info: 'Formata data para o padrão brasileiro DD/MM/AAAA' },
  { label: 'dataPorExtenso', type: 'function', detail: 'Filtro', info: 'Data completa por extenso (ex: 15 de agosto de 2026)' },
  { label: 'telefone', type: 'function', detail: 'Filtro', info: 'Máscara de telefone fixo ou celular (ex: (11) 98765-4321)' },
  { label: 'cpf', type: 'function', detail: 'Filtro', info: 'Aplica máscara de CPF (000.000.000-00)' },
  { label: 'cnpj', type: 'function', detail: 'Filtro', info: 'Aplica máscara de CNPJ (00.000.000/0000-00)' },
  { label: 'cep', type: 'function', detail: 'Filtro', info: 'Aplica máscara de CEP (00000-000)' },
  { label: 'romano', type: 'function', detail: 'Filtro', info: 'Converte número inteiro para algarismos romanos (ex: XIV)' },
  { label: 'maiusculo', type: 'function', detail: 'Filtro', info: 'Converte todo o texto para letras MAIÚSCULAS' },
  { label: 'minusculo', type: 'function', detail: 'Filtro', info: 'Converte todo o texto para letras minúsculas' },
  { label: 'capitalizado', type: 'function', detail: 'Filtro', info: 'Converte a primeira letra para maiúscula' },
];

/**
 * Snippets de tags XML canônicas
 */
const TAGS_XML_COMPLETION: Completion[] = [
  {
    label: 'documento',
    type: 'class',
    detail: 'Estrutura Base',
    info: 'Cria o documento completo com formulário e conteúdo vazios',
    apply: snippet('<documento>\n\t<formulario>\n\t</formulario>\n\t<conteudo>\n\t\t${1}\n\t</conteudo>\n</documento>'),
  },
  {
    label: 'formulario',
    type: 'class',
    detail: 'Formulário',
    info: 'Bloco de definição de campos do formulário',
    apply: snippet('<formulario>\n\t${1}\n</formulario>'),
  },
  {
    label: 'conteudo',
    type: 'class',
    detail: 'Conteúdo',
    info: 'Corpo principal do documento gerado',
    apply: snippet('<conteudo>\n\t${1}\n</conteudo>'),
  },
  {
    label: 'grupo',
    type: 'class',
    detail: 'Grupo de Campos',
    info: 'Agrupa campos na barra lateral',
    apply: snippet('<grupo titulo="${1:Título do Grupo}">\n\t${2}\n</grupo>'),
  },
  {
    label: 'input',
    type: 'variable',
    detail: 'Campo Texto',
    info: 'Campo de entrada de texto comum',
    apply: snippet('<input id="${1:campo_id}" label="${2:Rótulo}" placeholder="${3:Digite aqui}" />'),
  },
  {
    label: 'input (email)',
    type: 'variable',
    detail: 'Campo E-mail',
    info: 'Campo de texto com validação de e-mail',
    apply: snippet('<input id="${1:email}" label="${2:E-mail}" tipo="email" placeholder="${3:contato@empresa.com}" />'),
  },
  {
    label: 'input (lista_csv)',
    type: 'variable',
    detail: 'Campo Lista CSV',
    info: 'Campo de texto que permite múltiplos itens separados por vírgula',
    apply: snippet('<input id="${1:itens}" label="${2:Lista de Itens}" tipo="lista_csv" placeholder="${3:Item 1, Item 2}" />'),
  },
  {
    label: 'number',
    type: 'variable',
    detail: 'Campo Numérico',
    info: 'Campo numérico inteiro ou decimal',
    apply: snippet('<number id="${1:quantidade}" label="${2:Quantidade}" min="${3:0}" step="${4:1}" placeholder="${5:0}" />'),
  },
  {
    label: 'number (moeda)',
    type: 'variable',
    detail: 'Campo Moeda R$',
    info: 'Campo numérico com máscara monetária em Real',
    apply: snippet('<number id="${1:valor}" label="${2:Valor (R$)}" tipo="moeda" min="0" step="0.01" placeholder="0,00" />'),
  },
  {
    label: 'number (telefone)',
    type: 'variable',
    detail: 'Campo Telefone',
    info: 'Campo numérico com máscara e validação de telefone',
    apply: snippet('<number id="${1:telefone}" label="${2:Telefone / WhatsApp}" tipo="telefone" placeholder="(00) 00000-0000" />'),
  },
  {
    label: 'number (cpf)',
    type: 'variable',
    detail: 'Campo CPF',
    info: 'Campo numérico com máscara e validação de CPF',
    apply: snippet('<number id="${1:cpf}" label="${2:CPF}" tipo="cpf" placeholder="000.000.000-00" />'),
  },
  {
    label: 'number (cnpj)',
    type: 'variable',
    detail: 'Campo CNPJ',
    info: 'Campo numérico com máscara e validação de CNPJ',
    apply: snippet('<number id="${1:cnpj}" label="${2:CNPJ}" tipo="cnpj" placeholder="00.000.000/0000-00" />'),
  },
  {
    label: 'number (cep)',
    type: 'variable',
    detail: 'Campo CEP',
    info: 'Campo numérico com máscara de CEP',
    apply: snippet('<number id="${1:cep}" label="${2:CEP}" tipo="cep" placeholder="00000-000" />'),
  },
  {
    label: 'date',
    type: 'variable',
    detail: 'Campo Data',
    info: 'Seletor nativo de data',
    apply: snippet('<date id="${1:data_emissao}" label="${2:Data de Emissão}" />'),
  },
  {
    label: 'textarea',
    type: 'variable',
    detail: 'Área de Texto',
    info: 'Campo para textos longos de múltiplas linhas',
    apply: snippet('<textarea id="${1:descricao}" label="${2:Descrição Detalhada}" rows="${3:4}" placeholder="${4:Digite o texto completo...}" />'),
  },
  {
    label: 'select',
    type: 'variable',
    detail: 'Menu Seleção',
    info: 'Caixa de seleção com opções',
    apply: snippet('<select id="${1:status}" label="${2:Status}">\n\t<option>${3:Opção 1}</option>\n\t<option>${4:Opção 2}</option>\n</select>'),
  },
  {
    label: 'radio',
    type: 'variable',
    detail: 'Seleção Única',
    info: 'Botões de opção exclusiva',
    apply: snippet('<radio id="${1:tipo_pessoa}" label="${2:Tipo de Pessoa}">\n\t<option>${3:Pessoa Física}</option>\n\t<option>${4:Pessoa Jurídica}</option>\n</radio>'),
  },
  {
    label: 'checkbox',
    type: 'variable',
    detail: 'Caixa Booleana',
    info: 'Caixa de marcar Sim/Não',
    apply: snippet('<checkbox id="${1:incluir_anexo}" label="${2:Incluir Anexo Complementar}" />'),
  },
  {
    label: 'tabela (formulario)',
    type: 'variable',
    detail: 'Tabela Formulário',
    info: 'Tabela dinâmica com linhas adicionáveis no formulário',
    apply: snippet('<tabela id="${1:tabela_itens}" label="${2:Itens e Serviços}">\n\t<coluna id="${3:descricao}" label="Descrição" tipo="input" placeholder="Item" />\n\t<coluna id="${4:quantidade}" label="Qtd" tipo="number" min="1" />\n\t<coluna id="${5:valor_unitario}" label="Valor Unit." tipo="moeda" placeholder="0,00" />\n</tabela>'),
  },
  {
    label: 'coluna',
    type: 'property',
    detail: 'Coluna de Tabela',
    info: 'Coluna de formulário de tabela',
    apply: snippet('<coluna id="${1:col_id}" label="${2:Rótulo}" tipo="${3:input}" />'),
  },
  {
    label: 'secao',
    type: 'class',
    detail: 'Seção Documental',
    info: 'Seção com título no documento',
    apply: snippet('<secao titulo="${1:1. DO OBJETO}">\n\t<p>${2:Texto da seção...}</p>\n</secao>'),
  },
  {
    label: 'p',
    type: 'class',
    detail: 'Parágrafo',
    info: 'Parágrafo de texto no documento',
    apply: snippet('<p>${1:Texto do parágrafo}</p>'),
  },
  {
    label: 'if',
    type: 'keyword',
    detail: 'Condição Lógica',
    info: 'Exibe conteúdo condicionalmente conforme expressão',
    apply: snippet('<if expr="${1:condicao}">\n\t${2}\n</if>'),
  },
  {
    label: 'condicao',
    type: 'keyword',
    detail: 'Condição Lógica (Alias)',
    info: 'Tag alternativa para condição lógica',
    apply: snippet('<condicao expr="${1:condicao}">\n\t${2}\n</condicao>'),
  },
  {
    label: 'foreach',
    type: 'keyword',
    detail: 'Repetição / Loop',
    info: 'Itera sobre uma tabela ou lista de itens',
    apply: snippet('<foreach lista="${1:tabela_itens}" var="${2:item}">\n\t<p>• {{${2}.${3:descricao}}}: R$ {{${2}.${4:valor_unitario} | moeda}}</p>\n</foreach>'),
  },
  {
    label: 'tabela (documento)',
    type: 'class',
    detail: 'Tabela no Documento',
    info: 'Tabela formatada no corpo do documento gerado',
    apply: snippet('<tabela>\n\t<cabecalho>\n\t\t<celula>Descrição</celula>\n\t\t<celula>Qtd</celula>\n\t\t<celula>Valor Unit.</celula>\n\t</cabecalho>\n\t<foreach lista="${1:tabela_itens}" var="${2:item}">\n\t\t<linha>\n\t\t\t<celula>{{${2}.${3:descricao}}}</celula>\n\t\t\t<celula>{{${2}.${4:quantidade}}}</celula>\n\t\t\t<celula>R$ {{${2}.${5:valor_unitario} | moeda}}</celula>\n\t\t</linha>\n\t</foreach>\n</tabela>'),
  },
  {
    label: 'lista (romano)',
    type: 'class',
    detail: 'Lista Romana (I, II, III...)',
    info: 'Lista ordenada em algarismos romanos maiúsculos',
    apply: snippet('<lista tipo="romano">\n\t<item>${1:Primeiro item}</item>\n\t<item>${2:Segundo item}</item>\n</lista>'),
  },
  {
    label: 'lista (letra)',
    type: 'class',
    detail: 'Lista Alfabética (a, b, c...)',
    info: 'Lista ordenada alfabeticamente / alíneas',
    apply: snippet('<lista tipo="letra">\n\t<item>${1:Primeiro item}</item>\n\t<item>${2:Segundo item}</item>\n</lista>'),
  },
  {
    label: 'lista_numerada',
    type: 'class',
    detail: 'Lista Numerada (<lista_numerada>)',
    info: 'Lista ordenada numericamente (1., 2., 3...) com a tag <lista_numerada>',
    apply: snippet('<lista_numerada>\n\t<item>${1:Texto do item 1}</item>\n\t<item>${2:Texto do item 2}</item>\n</lista_numerada>'),
  },
  {
    label: 'lista (numerada)',
    type: 'class',
    detail: 'Lista Numerada (tipo="numerada")',
    info: 'Lista ordenada numericamente (1., 2., 3...) usando atributo tipo',
    apply: snippet('<lista tipo="numerada">\n\t<item>${1:Texto do item 1}</item>\n\t<item>${2:Texto do item 2}</item>\n</lista>'),
  },
  {
    label: 'lista (bolinhas)',
    type: 'class',
    detail: 'Lista com Marcadores / Bolinhas (•)',
    info: 'Lista com marcadores de ponto (bullet points)',
    apply: snippet('<lista tipo="bullet">\n\t<item>${1:Primeiro item}</item>\n\t<item>${2:Segundo item}</item>\n</lista>'),
  },
  {
    label: 'lista',
    type: 'class',
    detail: 'Lista de Itens',
    info: 'Lista com marcadores ou numeração (tipo="romano|letra|numerada|bullet")',
    apply: snippet('<lista tipo="${1:romano}">\n\t<item>${2:Primeiro item}</item>\n\t<item>${3:Segundo item}</item>\n</lista>'),
  },
  {
    label: 'item',
    type: 'class',
    detail: 'Item de Lista',
    info: 'Item individual dentro de uma <lista>',
    apply: snippet('<item>${1:Texto do item}</item>'),
  },
];

/**
 * Provedor central de autocompletar para o CodeMirror 6.
 * Fornece completamento inteligente de:
 * 1. Tags e Snippets XML quando digita '<' ou nome de tag
 * 2. Variáveis declaradas no formulário quando digita '{{'
 * 3. Filtros quando digita '|' dentro de '{{ ... }}'
 */
export function xmlTemplateCompletions(context: CompletionContext): CompletionResult | null {
  const fullText = context.state.doc.toString();
  const pos = context.pos;
  const line = context.state.doc.lineAt(pos);
  const textBeforePos = line.text.slice(0, pos - line.from);

  // 1. COMPLETION DE FILTROS: dentro de {{ ... |
  const matchFilter = textBeforePos.match(/\{\{[^{}]*\|\s*([a-zA-Z0-9_]*)$/);
  if (matchFilter) {
    const query = matchFilter[1];
    const from = pos - query.length;
    return {
      from,
      options: FILTROS_COMPLETION,
      validFor: /^[a-zA-Z0-9_]*$/,
    };
  }

  // 2. COMPLETION DE VARIÁVEIS: dentro de {{ ...
  const matchVar = textBeforePos.match(/\{\{\s*([a-zA-Z0-9_\.]*)$/);
  if (matchVar) {
    const query = matchVar[1];
    const from = pos - query.length;
    const campos = extrairCamposDeclarados(fullText);

    const opcoesVariaveis: Completion[] = [];

    campos.forEach(c => {
      // Variável principal
      opcoesVariaveis.push({
        label: c.id,
        type: c.tag === 'tabela' ? 'class' : 'variable',
        detail: `[${c.tag}${c.tipo ? ` (${c.tipo})` : ''}]`,
        info: `${c.label}${c.colunas?.length ? ` • Colunas: ${c.colunas.join(', ')}` : ''}`,
        boost: 2,
      });

      // Se for tabela, sugere acessos comuns de colunas
      if (c.tag === 'tabela' && c.colunas) {
        c.colunas.forEach(col => {
          opcoesVariaveis.push({
            label: `${c.id}.${col}`,
            type: 'property',
            detail: `Coluna (${c.id})`,
            info: `Acesso a todos os valores da coluna '${col}' da tabela '${c.label}'`,
            boost: 1,
          });
          opcoesVariaveis.push({
            label: `${c.id}.${col}[0]`,
            type: 'property',
            detail: `1ª Linha (${c.id})`,
            info: `Valor da coluna '${col}' no 1º registro da tabela '${c.label}'`,
          });
        });
      }
    });

    return {
      from,
      options: opcoesVariaveis,
      validFor: /^[a-zA-Z0-9_\.]*$/,
    };
  }

  // 3. COMPLETION DE TAGS XML: após '<' ou início de tag
  const matchTag = textBeforePos.match(/<([a-zA-Z0-9_\-\(\)\s]*)$/);
  if (matchTag) {
    const query = matchTag[1].trimStart();
    const from = pos - query.length;

    return {
      from,
      options: TAGS_XML_COMPLETION,
      validFor: /^[a-zA-Z0-9_\-\(\)\s]*$/,
    };
  }

  // 4. Se estiver em linha vazia ou digitando "doc", sugere criar novo documento base
  const word = context.matchBefore(/[a-zA-Z0-9_]+/);
  if (word) {
    if (['doc', 'novo', 'documento', 'modelo', 'base'].includes(word.text.toLowerCase())) {
      return {
        from: word.from,
        options: [
          {
            label: 'documento (base novo)',
            type: 'class',
            detail: 'Template Inicial',
            info: 'Gera a estrutura base de um novo documento (<documento>, <formulario>, <conteudo>)',
            apply: TEMPLATE_NOVO_DOCUMENTO,
          },
          ...TAGS_XML_COMPLETION,
        ],
      };
    }
  }

  return null;
}
