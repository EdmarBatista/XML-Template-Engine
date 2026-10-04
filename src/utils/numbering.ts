import { NumberingContext } from '../types';

export function calcularProximoNumero(
  contextoNumeracao: NumberingContext,
  effectiveNivel: number,
  nivel: number
): string {
  if (!contextoNumeracao.levelCounters) {
    contextoNumeracao.levelCounters = {
      2: contextoNumeracao.next || 1,
      3: contextoNumeracao.subNext || 1,
      4: contextoNumeracao.subSubNext || 1,
      5: 1, 6: 1, 7: 1, 8: 1,
    };
    // Guarda as sementes vindas do Word: elas valem para a PRIMEIRA emissão de cada nível e
    // não podem ser apagadas por um reinício causado por número de nível mais raso. Sem isso,
    // com next=5 e subNext=3 o contexto emitia 1.5 e depois 1.5.1 (a semente 3 se perdia).
    contextoNumeracao.sementes = {};
    if (contextoNumeracao.next) contextoNumeracao.sementes[2] = contextoNumeracao.next;
    if (contextoNumeracao.subNext) contextoNumeracao.sementes[3] = contextoNumeracao.subNext;
    if (contextoNumeracao.subSubNext) contextoNumeracao.sementes[4] = contextoNumeracao.subSubNext;
  }
  if (!contextoNumeracao.levelNumbers) {
    contextoNumeracao.levelNumbers = {};
    if (contextoNumeracao.lastLevel2Number) contextoNumeracao.levelNumbers[2] = contextoNumeracao.lastLevel2Number;
    if (contextoNumeracao.lastLevel3Number) contextoNumeracao.levelNumbers[3] = contextoNumeracao.lastLevel3Number;
    if (contextoNumeracao.lastLevel4Number) contextoNumeracao.levelNumbers[4] = contextoNumeracao.lastLevel4Number;
    if (contextoNumeracao.lastLevel5Number) contextoNumeracao.levelNumbers[5] = contextoNumeracao.lastLevel5Number;
    if (contextoNumeracao.lastLevel6Number) contextoNumeracao.levelNumbers[6] = contextoNumeracao.lastLevel6Number;
    if (contextoNumeracao.lastLevel7Number) contextoNumeracao.levelNumbers[7] = contextoNumeracao.lastLevel7Number;
    if (contextoNumeracao.lastLevel8Number) contextoNumeracao.levelNumbers[8] = contextoNumeracao.lastLevel8Number;
  }

  const relativeLvl = Math.min(8, Math.max(2, effectiveNivel - nivel + 2));
  let parent = '';
  if (relativeLvl === 2) {
    parent = contextoNumeracao.prefixo || '';
  } else {
    for (let k = relativeLvl - 1; k >= 2; k--) {
      if (contextoNumeracao.levelNumbers[k]) {
        if (k === relativeLvl - 1) {
          parent = contextoNumeracao.levelNumbers[k];
        } else {
          let synth = contextoNumeracao.levelNumbers[k];
          for (let fill = k + 1; fill < relativeLvl; fill++) {
            synth += '.1';
            contextoNumeracao.levelNumbers[fill] = synth;
            contextoNumeracao.levelCounters[fill] = 2;
          }
          parent = synth;
        }
        break;
      }
    }
    if (!parent) {
      parent = contextoNumeracao.prefixo
        ? `${contextoNumeracao.prefixo}${'.1'.repeat(relativeLvl - 2)}`
        : '1';
    }
  }

  const currentIdx = contextoNumeracao.levelCounters[relativeLvl] || 1;
  const num = parent ? `${parent}.${currentIdx}` : String(currentIdx);

  contextoNumeracao.levelCounters[relativeLvl] = currentIdx + 1;
  contextoNumeracao.levelNumbers[relativeLvl] = num;
  contextoNumeracao.lastNumber = num;
  // a semente do nível emitido foi consumida
  if (contextoNumeracao.sementes) delete contextoNumeracao.sementes[relativeLvl];

  for (let d = relativeLvl + 1; d <= 8; d++) {
    // O nível mais profundo reinicia — mas se a semente dele ainda não foi usada, ela volta
    // ao contador: é o que continua a numeração que veio do Word em vez de recomeçar em 1.
    contextoNumeracao.levelCounters[d] = contextoNumeracao.sementes?.[d] ?? 1;
    delete contextoNumeracao.levelNumbers[d];
  }

  contextoNumeracao.next = contextoNumeracao.levelCounters[2] || 1;
  contextoNumeracao.subNext = contextoNumeracao.levelCounters[3] || 1;
  contextoNumeracao.subSubNext = contextoNumeracao.levelCounters[4] || 1;
  contextoNumeracao.lastLevel2Number = contextoNumeracao.levelNumbers[2] || '';
  contextoNumeracao.lastLevel3Number = contextoNumeracao.levelNumbers[3] || '';
  contextoNumeracao.lastLevel4Number = contextoNumeracao.levelNumbers[4] || '';
  contextoNumeracao.lastLevel5Number = contextoNumeracao.levelNumbers[5] || '';
  contextoNumeracao.lastLevel6Number = contextoNumeracao.levelNumbers[6] || '';
  contextoNumeracao.lastLevel7Number = contextoNumeracao.levelNumbers[7] || '';
  contextoNumeracao.lastLevel8Number = contextoNumeracao.levelNumbers[8] || '';

  return num;
}
