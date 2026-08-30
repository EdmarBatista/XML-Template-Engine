import { termoReferencia } from './templates/termoReferencia';
import { bateriaTestes } from './templates/bateriaTestes';
import { contratoServicos } from './templates/contratoServicos';
import { catalogoCompletoTags } from './templates/catalogoCompletoTags';

export interface TemplateItem {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  xml: string;
  json?: string;
}

/**
 * Catálogo de modelos padrão. Cada modelo está em data/templates/*.ts
 * (sugestão F de modularização).
 */
export const DEFAULT_TEMPLATES: TemplateItem[] = [
  termoReferencia,
  contratoServicos,
  catalogoCompletoTags,
  bateriaTestes,
];
