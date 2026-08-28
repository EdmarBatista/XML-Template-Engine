/**
 * Funções utilitárias de formatação, validação e manipulação de valores
 */

export function formatarMoeda(valor: any): string {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return '';
    return valor
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  const numeros = String(valor).replace(/\D/g, '');
  if (!numeros) return '';

  const numero = parseInt(numeros, 10) / 100;
  return numero
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function converterFormatoData(data: any, formatoDestino: 'BR' | 'ISO' | 'US' = 'BR'): string {
  if (data === null || data === undefined || data === '') {
    return data ?? '';
  }

  const str = String(data).trim();

  // ISO -> BR (2026-08-12 -> 12/08/2026)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [ano, mes, dia] = str.split('-');
    return formatoDestino === 'ISO' || formatoDestino === 'US' ? str : `${dia}/${mes}/${ano}`;
  }

  // BR -> ISO (12/08/2026 -> 2026-08-12)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dia, mes, ano] = str.split('/');
    return formatoDestino === 'BR' ? str : `${ano}-${mes}-${dia}`;
  }

  return str;
}

export function dataPorExtenso(dataInput: any): string {
  if (!dataInput) return '';

  let data: Date | null = null;

  if (dataInput instanceof Date) {
    data = dataInput;
  } else if (typeof dataInput === 'string') {
    const str = dataInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [ano, mes, dia] = str.split('-').map(Number);
      data = new Date(ano, mes - 1, dia);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [dia, mes, ano] = str.split('/').map(Number);
      data = new Date(ano, mes - 1, dia);
    } else {
      data = new Date(str);
    }
  }

  if (!data || isNaN(data.getTime())) {
    return '';
  }

  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];

  return `${data.getDate()} de ${meses[data.getMonth()]} de ${data.getFullYear()}`;
}

function extensoGrupoCentenas(n: number, numDois = true): string {
  if (n === 0) return '';
  const dois = numDois ? 'dois' : 'duas';
  const unidades = ['', 'um', dois, 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = [
    'dez',
    'onze',
    'doze',
    'treze',
    'catorze',
    'quinze',
    'dezesseis',
    'dezessete',
    'dezoito',
    'dezenove',
  ];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = [
    '',
    'cento',
    'duzentos',
    'trezentos',
    'quatrocentos',
    'quinhentos',
    'seiscentos',
    'setecentos',
    'oitocentos',
    'novecentos',
  ];

  if (n === 100) return 'cem';

  let res = '';
  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;

  if (c > 0) {
    res += centenas[c];
  }

  const resto = n % 100;
  if (resto > 0) {
    if (res.length > 0) res += ' e ';
    if (resto < 10) {
      res += unidades[resto];
    } else if (resto < 20) {
      res += especiais[resto - 10];
    } else {
      res += dezenas[d];
      if (u > 0) res += ' e ' + unidades[u];
    }
  }

  return res;
}

export function numeroPorExtenso(numeroInput: any, numDois = true): string {
  if (numeroInput === null || numeroInput === undefined || numeroInput === '') {
    return '';
  }

  let numero = Number(numeroInput);
  if (!Number.isFinite(numero)) return '';

  numero = Math.trunc(numero);

  if (numero === 0) return 'zero';
  if (numero < 0) return 'menos ' + numeroPorExtenso(Math.abs(numero), numDois);

  const classes = [
    { valor: Math.floor(numero / 1000000000000), singular: 'trilhão', plural: 'trilhões' },
    { valor: Math.floor((numero % 1000000000000) / 1000000000), singular: 'bilhão', plural: 'bilhões' },
    { valor: Math.floor((numero % 1000000000) / 1000000), singular: 'milhão', plural: 'milhões' },
    { valor: Math.floor((numero % 1000000) / 1000), singular: 'mil', plural: 'mil' },
    { valor: numero % 1000, singular: '', plural: '' },
  ];

  const ativas = classes.filter(c => c.valor > 0);

  const partes: { texto: string; valor: number; singular: string }[] = [];

  for (let i = 0; i < ativas.length; i++) {
    const item = ativas[i];
    let textoGrupo = '';

    if (item.singular === 'mil' && item.valor === 1) {
      textoGrupo = 'mil';
    } else {
      const ext = extensoGrupoCentenas(item.valor, numDois);
      if (item.singular) {
        const suf = item.valor === 1 ? item.singular : item.plural;
        textoGrupo = `${ext} ${suf}`;
      } else {
        textoGrupo = ext;
      }
    }
    partes.push({ texto: textoGrupo, valor: item.valor, singular: item.singular });
  }

  if (partes.length === 1) {
    return partes[0].texto;
  }

  // Conectar classes de acordo com a gramática brasileira:
  // Se o último grupo for < 100 ou centena exata (100, 200, etc.), liga-se com " e "
  // Caso contrário, separa-se com vírgula ", "
  let resultado = partes[0].texto;

  for (let i = 1; i < partes.length; i++) {
    const atual = partes[i];
    const isUltimo = i === partes.length - 1;
    const v = atual.valor;
    const ehCentenaExata = v % 100 === 0;
    const ehMenorQue100 = v < 100;

    if (isUltimo && (ehMenorQue100 || ehCentenaExata)) {
      resultado += ' e ' + atual.texto;
    } else {
      resultado += ', ' + atual.texto;
    }
  }

  return resultado;
}


export function parseNumeroMoeda(valor: any): number {
  if (valor === null || valor === undefined || valor === '') {
    return NaN;
  }
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : NaN;
  }
  let str = String(valor).trim();
  if (!str) return NaN;

  // Se contiver vírgula (ex: "1.234,56" ou "0,10" ou "11000,23")
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  const num = Number(str);
  return Number.isFinite(num) ? num : NaN;
}

export function moedaPorExtenso(numeroInput: any): string {
  if (numeroInput === null || numeroInput === undefined || numeroInput === '') {
    return '';
  }

  const numero = parseNumeroMoeda(numeroInput);
  if (!Number.isFinite(numero) || numero < 0) return '';

  // Arredonda para 2 casas decimais para evitar imprecisões de ponto flutuante
  const arredondado = Math.round(numero * 100) / 100;
  const inteiro = Math.floor(arredondado);
  const centavos = Math.round((arredondado - inteiro) * 100);

  if (inteiro === 0 && centavos === 0) return 'zero reais';

  let extenso = '';

  if (inteiro > 0) {
    if (inteiro === 1) {
      extenso += 'um real';
    } else {
      const inteiroExtenso = numeroPorExtenso(inteiro, true);
      // Se for milhão, bilhão ou trilhão redondo (sem milhares ou unidades), usa "de reais"
      if (inteiro >= 1000000 && inteiro % 1000000 === 0) {
        extenso += inteiroExtenso + ' de reais';
      } else {
        extenso += inteiroExtenso + ' reais';
      }
    }
  }

  if (centavos > 0) {
    if (extenso.length > 0) {
      extenso += ' e ';
    }
    if (centavos === 1) {
      extenso += 'um centavo';
    } else {
      extenso += numeroPorExtenso(centavos, true) + ' centavos';
    }
  }

  return extenso;
}

export function converterParaRomano(numeroInput: any): string {
  let numero = Number(numeroInput);
  if (!Number.isFinite(numero) || numero <= 0) return '';
  numero = Math.floor(numero);

  const romanos = [
    { value: 1000, symbol: 'M' },
    { value: 900, symbol: 'CM' },
    { value: 500, symbol: 'D' },
    { value: 400, symbol: 'CD' },
    { value: 100, symbol: 'C' },
    { value: 90, symbol: 'XC' },
    { value: 50, symbol: 'L' },
    { value: 40, symbol: 'XL' },
    { value: 10, symbol: 'X' },
    { value: 9, symbol: 'IX' },
    { value: 5, symbol: 'V' },
    { value: 4, symbol: 'IV' },
    { value: 1, symbol: 'I' },
  ];

  let resultado = '';
  for (const romano of romanos) {
    while (numero >= romano.value) {
      resultado += romano.symbol;
      numero -= romano.value;
    }
  }
  return resultado;
}

export function validarEmail(email: any): boolean {
  if (email === null || email === undefined) return false;
  const valor = String(email).trim();
  return !!valor && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(valor);
}

export function formatarCPF(valor: any): string {
  if (valor === null || valor === undefined) return '';
  const cpf = String(valor).replace(/\D/g, '').substring(0, 11);

  if (cpf.length > 9) {
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  }
  if (cpf.length > 6) {
    return cpf.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  }
  if (cpf.length > 3) {
    return cpf.replace(/^(\d{3})(\d{0,3})/, '$1.$2');
  }
  return cpf;
}

export function validarCPF(valor: any): boolean {
  const cpf = normalizarDigitos(valor);
  if (!cpf) return true;
  if (cpf.length !== 11) return false;
  if (/^([0-9])\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += Number(cpf[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== Number(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += Number(cpf[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== Number(cpf[10])) return false;

  return true;
}

export function formatarCNPJ(valor: any): string {
  if (valor === null || valor === undefined) return '';
  const cnpj = String(valor).replace(/\D/g, '').substring(0, 14);

  if (cnpj.length > 12) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  if (cnpj.length > 8) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
  }
  if (cnpj.length > 5) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
  }
  if (cnpj.length > 2) {
    return cnpj.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
  }
  return cnpj;
}

export function formatarCPFOuCNPJ(valor: any): string {
  const digitos = normalizarDigitos(valor);
  if (digitos.length <= 11) {
    return formatarCPF(digitos);
  }
  return formatarCNPJ(digitos);
}

export function normalizarDigitos(valor: any): string {
  return String(valor ?? '').replace(/\D/g, '');
}

export function validarCNPJ(valor: any): boolean {
  const cnpj = normalizarDigitos(valor);
  if (!cnpj) return true;
  if (cnpj.length !== 14) return false;
  if (/^([0-9])\1{13}$/.test(cnpj)) return false;

  let soma = 0;
  let peso = 5;
  for (let i = 0; i < 12; i++) {
    soma += Number(cnpj[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  let digito = soma % 11;
  digito = digito < 2 ? 0 : 11 - digito;
  if (digito !== Number(cnpj[12])) return false;

  soma = 0;
  peso = 6;
  for (let i = 0; i < 13; i++) {
    soma += Number(cnpj[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  digito = soma % 11;
  digito = digito < 2 ? 0 : 11 - digito;

  return digito === Number(cnpj[13]);
}

export function formatarCEP(valor: any): string {
  if (valor === null || valor === undefined) return '';
  let cep = String(valor).replace(/\D/g, '').substring(0, 8);
  if (cep.length > 5) {
    cep = cep.replace(/^(\d{5})(\d{1,3})/, '$1-$2');
  }
  return cep;
}

export function validarCEP(valor: any): boolean {
  const cep = normalizarDigitos(valor);
  return !cep || cep.length === 8;
}

export function aplicarMascaraCampo(valor: any, tipo: string): string {
  if (!tipo) return valor ?? '';
  const nome = String(tipo).toLowerCase().trim();
  switch (nome) {
    case 'moeda':
      return formatarMoeda(valor);
    case 'cpf':
      return formatarCPF(valor);
    case 'cnpj':
      return formatarCNPJ(valor);
    case 'cpfcnpj':
      return formatarCPFOuCNPJ(valor);
    case 'cep':
      return formatarCEP(valor);
    default:
      return valor ?? '';
  }
}

export function normalizarValorCampo(valor: any, tipo: string): any {
  const nome = String(tipo || '').toLowerCase().trim();
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  if (nome === 'cpf') {
    return String(valor).replace(/\D/g, '').substring(0, 11);
  }

  if (nome === 'cnpj') {
    return String(valor).replace(/\D/g, '').substring(0, 14);
  }

  if (nome === 'cpfcnpj') {
    return String(valor).replace(/\D/g, '').substring(0, 14);
  }

  if (nome === 'cep') {
    return String(valor).replace(/\D/g, '').substring(0, 8);
  }

  if (nome === 'moeda') {
    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : '';
    }
    const texto = String(valor).trim();
    if (!texto) return '';

    if (texto.includes(',')) {
      const numero = parseFloat(texto.replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(numero) ? numero : '';
    }
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : '';
  }

  return valor;
}

export function aplicarFiltroDocumento(valor: any, filtro: string): string {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  switch (filtro) {
    case 'moeda': {
      const bruto = normalizarValorCampo(valor, 'moeda');
      const formatado = formatarMoeda(bruto);
      return formatado === '' ? '' : `R$ ${formatado}`;
    }
    case 'data':
      return converterFormatoData(valor, 'BR');
    case 'dataPorExtenso':
      return dataPorExtenso(valor);
    case 'numeroPorExtenso':
      return numeroPorExtenso(valor);
    case 'moedaPorExtenso':
      return moedaPorExtenso(valor);
    case 'romano':
      return converterParaRomano(valor);
    case 'cpf':
      return formatarCPF(normalizarValorCampo(valor, 'cpf'));
    case 'cnpj':
      return formatarCNPJ(normalizarValorCampo(valor, 'cnpj'));
    case 'cpfcnpj':
      return formatarCPFOuCNPJ(normalizarValorCampo(valor, 'cpfcnpj'));
    case 'cep':
      return formatarCEP(normalizarValorCampo(valor, 'cep'));
    case 'email':
      return String(valor);
    default:
      return String(valor);
  }
}

/**
 * Formata um item individual de um loop foreach, removendo aspas externas caso existam.
 */
export function formatarItemForeach(valor: any): string {
  let texto = String(valor ?? '').trim();

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
export function valoresDaLista(valor: any): string[] {
  if (Array.isArray(valor)) return valor.map(v => formatarItemForeach(v)).filter(Boolean);

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
