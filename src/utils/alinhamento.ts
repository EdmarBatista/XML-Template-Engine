export type AlinhamentoCanonico = 'esquerda' | 'centro' | 'direita' | 'justificado';

/**
 * Normaliza o alinhamento uma única vez para os três destinos (tela, Word e PDF).
 *
 * Aceita a grafia documentada em português (`centro`, `esquerda`, `direita`,
 * `justificar`) e a grafia CSS/inglesa que aparece no DOM (`center`, `left`,
 * `right`, `justify`). O fallback fica explícito no chamador.
 */
export function normalizarAlinhamento(
  valor?: string | null,
  padrao: AlinhamentoCanonico = 'justificado'
): AlinhamentoCanonico {
  const nome = String(valor ?? '').trim().toLowerCase();
  if (nome === 'centro' || nome === 'center') return 'centro';
  if (nome === 'direita' || nome === 'right' || nome === 'end') return 'direita';
  if (nome === 'esquerda' || nome === 'left' || nome === 'start') return 'esquerda';
  if (nome === 'justificar' || nome === 'justificado' || nome === 'justify' || nome === 'both') {
    return 'justificado';
  }
  return padrao;
}
