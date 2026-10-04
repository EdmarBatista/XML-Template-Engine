/**
 * Derivação do id de uma coluna de tabela declarada no XML.
 *
 * Existe para que os dois leitores de declaração do app concordem. O formulário/render usa
 * `xmlParser.extrairCampos` (DOM) e o editor/validador usa
 * `xmlEditorCompletions.extrairCamposDeclarados` (regex). Cada um tinha a sua própria regra,
 * então o MESMO XML produzia ids diferentes: a coluna `<coluna tipo="select"><option>Baixo
 * </option><option>Alto</option></coluna>` virava `baixoalto` num leitor e `baixo_alto` no
 * outro, e a coluna vazia virava `col_4` num e `coluna_4` no outro.
 */

/** Rótulo usado quando a coluna não tem rótulo nem conteúdo. */
export function rotuloGenericoDeColuna(indice: number): string {
  return `Coluna ${indice}`;
}

/**
 * Id canônico de uma coluna: o rótulo normalizado (sem acento, só [a-z0-9_]) ou o genérico
 * `col_N` quando não há rótulo próprio para derivar.
 */
export function derivarIdDeColuna(rotulo: string | null | undefined, indice: number): string {
  const limpo = String(rotulo ?? '').trim();

  if (limpo && limpo !== rotuloGenericoDeColuna(indice)) {
    const derivado = limpo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (derivado) return derivado;
  }

  return `col_${indice}`;
}
