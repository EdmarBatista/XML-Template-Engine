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

/**
 * Valor que um campo de formulario carrega: texto digitado, numero, booleano, data, uma
 * linha de tabela ({@link DadosDocumento}) ou a lista de linhas de um campo de tabela.
 * Usado onde o valor apenas transita e e coagido (String/Number), sem que o tipo seja
 * conhecido na origem — no lugar de `any`, que desligava a verificacao tambem para quem
 * recebe o valor.
 */
export type ValorCampo =
  | string
  | number
  | boolean
  | Date
  | DadosDocumento
  | ValorCampo[]
  | null
  | undefined;

/**
 * Dados preenchidos do documento, indexados pelo id do campo (ou pelo id da coluna, numa
 * linha de tabela). O conteudo continua `any` de proposito: a forma do valor so e conhecida
 * pela definicao do campo no XML. Nomear a fronteira deixa um unico ponto de fuga, em vez
 * de repetir `Record<string, any>` em dezenas de assinaturas — e permite aperta-la em um
 * lugar so.
 */
export type DadosDocumento = Record<string, any>;

/**
 * Escopo local resolvido durante a renderizacao (variavel corrente de um `foreach`, campos
 * declarados por um `if`). Mesma justificativa de {@link DadosDocumento}.
 */
export type ContextoLocal = Record<string, any>;

export interface AstNode {
  tipo: string;
  texto?: string;
  /** Valor resolvido de um no de tipo valor/campo, anexado pelo parser. */
  valor?: ValorCampo;
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
  dados: DadosDocumento;
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
  /**
   * Sementes de numeração vindas do Word (`next`/`subNext`/`subSubNext`), guardadas na
   * primeira chamada do renderizador para serem consumidas somente quando o nível
   * correspondente for realmente emitido. Uso interno — não é preciso preencher.
   */
  sementes?: Record<number, number>;
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
