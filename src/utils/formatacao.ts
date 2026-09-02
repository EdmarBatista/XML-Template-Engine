

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

