/**
 * Extracao de mensagem de erro para exibicao ao usuario.
 *
 * `catch` recebe `unknown` porque nem tudo que e lancado e um `Error`: um `throw` de
 * string, um rejeitado de Promise ou um erro de biblioteca sem `message` chegam aqui.
 * Ler `.message` direto nesses casos exibia "undefined" na tela.
 */

/** Limite de caracteres do detalhe exibido (um erro do pdfmake chega a despejar a linha da tabela). */
const MAX_DETALHE_ERRO = 240;

/**
 * Extrai o motivo real de uma falha, em uma linha e limitado.
 *
 * @param padrao texto devolvido quando o erro nao traz mensagem alguma.
 */
export function motivoDoErro(err: unknown, padrao = 'erro desconhecido'): string {
  const bruto = (err as { message?: unknown })?.message;
  const alternativa = typeof err === 'string' ? err : '';
  const texto = String(bruto ?? alternativa ?? padrao).replace(/\s+/g, ' ').trim();
  if (!texto) return padrao;
  return texto.length > MAX_DETALHE_ERRO ? `${texto.slice(0, MAX_DETALHE_ERRO)}...` : texto;
}
