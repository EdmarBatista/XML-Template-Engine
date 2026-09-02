export type FieldType = 'input' | 'textarea' | 'number' | 'date' | 'checkbox' | 'radio' | 'select' | 'tabela';

export type InputSubtype = 'texto' | 'email' | 'lista_csv';

export type NumberSubtype = 'number' | 'moeda' | 'cpf' | 'cnpj' | 'cep' | 'telefone';

export type ListType =
  | 'bullet'
  | 'numerada'
  | 'romano'
  | 'romano_minusculo'
  | 'letra'
  | 'letra_maiuscula'
  | 'circulo'
  | 'quadrado'
  | 'decimal';

export type TipoLista = ListType;

export type ListStyleType =
  | 'disc'
  | 'decimal'
  | 'upper-roman'
  | 'lower-roman'
  | 'lower-alpha'
  | 'upper-alpha'
  | 'circle'
  | 'square';

export type DocumentFilterType =
  | ColumnType
  | FieldType
  | 'data'
  | 'dataPorExtenso'
  | 'numeroPorExtenso'
  | 'moedaPorExtenso'
  | 'romano'
  | 'caixa_alta'
  | 'caixa_baixa'
  | 'primeira_maiuscula';

export type TipoFiltro = DocumentFilterType;

export type ColumnType =
  | 'input'      // ou 'texto' (texto comum)
  | 'texto'
  | 'number'     // numérico puro
  | 'moeda'      // valor monetário formatado
  | 'date'       // seletor nativo de data
  | 'select'     // dropdown
  | 'radio'      // seleção exclusiva
  | 'textarea'   // texto multilinha
  | 'checkbox'   // booleano
  | 'cpf'        // máscara CPF
  | 'cnpj'       // máscara CNPJ
  | 'cep'        // máscara CEP
  | 'telefone'
  | 'email';

export interface TableColumnMetadata {
  id: string;
  label: string;
  tipo?: ColumnType;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  opcoes?: string[];
  opcoesDetalhadas?: FieldOption[];
}

export interface FieldOption {
  label: string;
  valor?: string;
  expr?: string;
}

export interface FormItemIf {
  tipo: 'if';
  expr: string;
  itens: FormItem[];
}

export interface FormItemField {
  tipo: 'campo';
  id: string;
}

export type FormItem = FormItemField | FormItemIf;

export interface FieldMetadata {
  id: string;
  label: string;
  tipo: FieldType;
  tipoInput?: string;
  descricao?: string;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  rows?: number | string;
  condicao?: string;
  opcoes?: string[];
  opcoesDetalhadas?: FieldOption[];
  colunas?: TableColumnMetadata[];
  controlesCondicionais?: {
    tipo: 'if';
    expr: string;
    itens: FormItem[];
  }[];
}

export interface FormGroup {
  titulo: string;
  campos: string[];
  itens: FormItem[];
}

export interface FormStructure {
  grupos: FormGroup[];
  campos: Record<string, FieldMetadata>;
}

export interface XmlPart {
  nome: string;
  xml: string;
  index: number;
}

export interface AstNode {
  tipo: string;
  texto?: string;
  atributos?: Record<string, string>;
  filhos?: AstNode[];
}

export interface WordComment {
  id: string;
  texto: string;
  trecho: string;
}

export interface IntermediateModel {
  tipo: 'documento';
  xmlName?: string;
  formulario: FormStructure;
  dados: Record<string, any>;
  conteudo: AstNode;
  xmlParts?: XmlPart[];
  comentarios?: WordComment[];
}

export interface NumberingContext {
  prefixo: string;
  next: number;
  subNext?: number;
  subSubNext?: number;
  lastLevel2Number?: string;
  lastLevel3Number?: string;
  lastLevel4Number?: string;
  lastLevel5Number?: string;
  lastLevel6Number?: string;
  lastLevel7Number?: string;
  lastLevel8Number?: string;
  levelCounters?: Record<number, number>;
  levelNumbers?: Record<number, string>;
  lastNumber: string;
  habilitado: boolean;
  numerarBlocos: boolean;
}

export interface WordExportOptions {
  fonte?: string;
  tamanhoFonte?: number;
  corTexto?: string;
  corVariavel?: string;
  variaveisVermelhas?: boolean;
  alinhamento?: string;
  recuoPrimeiraLinha?: number;
  recuoEsquerdo?: number;
  espacoAntes?: number;
  espacoDepois?: number;
  entreLinhas?: number;
  pagina?: string;
  margemSuperiorCm?: number;
  margemInferiorCm?: number;
  margemEsquerdaCm?: number;
  margemDireitaCm?: number;
  ativarNumeracaoDocumento?: boolean;
  nivelMaximoNumeracao?: number;
  tituloTamanhoFonte?: number;
  tituloNegrito?: boolean;
  tituloSublinhado?: boolean;
  secaoTamanhoFonte?: number;
  secaoNegrito?: boolean;
  secaoSublinhado?: boolean;
  cabecalhoDistancia?: number;
  rodapeDistancia?: number;
  recuoLista?: number;
}

export type { TemplateItem } from './data/defaultTemplates';
