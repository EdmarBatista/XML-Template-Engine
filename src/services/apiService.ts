/**
 * Serviço de consultas externas (CNPJ/CEP) com cache simples, timeout e debounce.
 .
 */

const cache = new Map<string, { expira: number; data: any }>();

const TTL_PADRAO_MS = 5 * 60 * 1000; // 5 minutos

function cacheLer(chave: string): any | undefined {
  const entry = cache.get(chave);
  if (!entry) return undefined;
  if (entry.expira <= Date.now()) {
    cache.delete(chave);
    return undefined;
  }
  return entry.data;
}

function cacheGravar(chave: string, data: any, ttlMs = TTL_PADRAO_MS): void {
  cache.set(chave, { expira: Date.now() + ttlMs, data });
}

async function fetchComTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface LookupResult {
  loading: boolean;
  data: any | null;
  error: string | null;
  chave: string;
}

export function criarLookupVazio(chave = ''): LookupResult {
  return { loading: false, data: null, error: null, chave };
}

/**
 * Consulta dados de uma empresa pelo CNPJ (OpenCNPJ).
 */
export async function consultarEmpresaCNPJ(cnpj: string): Promise<any> {
  const chave = `cnpj:${cnpj}`;
  const emCache = cacheLer(chave);
  if (emCache !== undefined) return emCache;

  const res = await fetchComTimeout(`https://api.opencnpj.org/${cnpj}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cacheGravar(chave, data);
  return data;
}

/**
 * Consulta endereço pelo CEP (ViaCEP). Lança erro se o CEP não for localizado.
 */
export async function consultarEnderecoCEP(cep: string): Promise<any> {
  const chave = `cep:${cep}`;
  const emCache = cacheLer(chave);
  if (emCache !== undefined) return emCache;

  const res = await fetchComTimeout(`https://viacep.com.br/ws/${cep}/json/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data && data.erro) throw new Error('CEP não localizado na base');
  cacheGravar(chave, data);
  return data;
}
