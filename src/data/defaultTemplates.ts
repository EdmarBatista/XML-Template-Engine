import { termoReferencia } from './templates/termoReferencia';
import { bateriaTestes } from './templates/bateriaTestes';
import { contratoServicos } from './templates/contratoServicos';
import { catalogoCompletoTags } from './templates/catalogoCompletoTags';
import { exemploParticionado } from './templates/exemploParticionado';
import { XmlPart } from '../types';

export interface TemplateItem {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  xml: string;
  json?: string;
  xmlParts?: XmlPart[];
}

/**
 * Catálogo de modelos padrão. Cada modelo está em data/templates/*.ts
 * (sugestão F de modularização).
 */
export const DEFAULT_TEMPLATES: TemplateItem[] = [
  termoReferencia,
  contratoServicos,
  catalogoCompletoTags,
  exemploParticionado,
  bateriaTestes,
];
