// Gerado a partir de documentUtils.ts (fatoracao)

export function formatarItemForeach(valor: any): any {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'object') return valor;

  let texto = String(valor).trim();

  if (texto.length >= 2) {
    const primeiro = texto[0];
    const ultimo = texto[texto.length - 1];

    if ((primeiro === '"' && ultimo === '"') || (primeiro === "'" && ultimo === "'")) {
      texto = texto.slice(1, -1).trim();
    }
  }

  return texto;
}

/**
 * Divide o valor de uma lista (CSV ou com quebras de linha) em itens individuais,
 * suportando itens com aspas que contenham vírgulas internamente (ex: "Pintura, de fogo").
 */

export function valoresDaLista(valor: any): any[] {
  if (Array.isArray(valor)) return valor.map(v => formatarItemForeach(v)).filter(v => v !== '' && v !== null && v !== undefined);

  const texto = String(valor ?? '');
  const itens: string[] = [];
  let atual = '';
  let aspas: string | null = null;
  let inicioItem = true;

  const adicionar = () => {
    const item = formatarItemForeach(atual.trim());
    if (item) itens.push(item);
    atual = '';
    inicioItem = true;
  };

  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];

    if (aspas === null && (ch === '\r' || ch === '\n')) {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      adicionar();
      continue;
    }

    // Ignora espaços no começo do item.
    if (aspas === null && inicioItem && /\s/.test(ch)) continue;

    // Aspas só delimitam um item quando aparecem no início.
    if (aspas === null && inicioItem && (ch === '"' || ch === "'")) {
      aspas = ch;
      inicioItem = false;
      continue;
    }

    // Fecha as aspas do item atual.
    if (aspas !== null && ch === aspas) {
      // Só fecha se, daqui até o próximo separador, houver
      // apenas espaços. Assim a aspa realmente é delimitadora.
      let j = i + 1;
      while (j < texto.length && (texto[j] === ' ' || texto[j] === '\t')) j++;
      if (j === texto.length || texto[j] === ',' || texto[j] === '\r' || texto[j] === '\n') {
        aspas = null;
        continue;
      }
    }

    if (aspas === null && ch === ',') {
      adicionar();
      continue;
    }

    atual += ch;
    if (!/\s/.test(ch)) inicioItem = false;
  }

  adicionar();
  return itens;
}

/**
 * Obtém valor por caminho estruturado com suporte a índices de tabelas e propriedades de objetos.
 * Formatos suportados:
 * - `tabela.coluna[0]` ou `tabela.coluna[1]` (acesso direto à célula pela coluna indexada)
 * - `tabela[0].coluna` (acesso direto pelo registro indexado)
 * - `tabela.coluna` (valores de todas as linhas da coluna concatenados por vírgula)
 * - `item.propriedade` (acesso a objeto em foreach)
 */
/**
 * Tipos de coluna que são "genéricos" (input/text) e que podem se tornar um tipo
 * específico quando a coluna declara `validar="..."` (ex.: validar="moeda").
 */
