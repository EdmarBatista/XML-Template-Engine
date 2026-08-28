export type FieldType = 'input' | 'textarea' | 'number' | 'date' | 'checkbox' | 'radio' | 'select';

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
  exemplo?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  rows?: number | string;
  condicao?: string;
  validar?: string;
  opcoes?: string[];
  opcoesDetalhadas?: FieldOption[];
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

export interface AstNode {
  tipo: string;
  texto?: string;
  atributos?: Record<string, string>;
  filhos?: AstNode[];
}

export interface IntermediateModel {
  tipo: 'documento';
  xmlName?: string;
  formulario: FormStructure;
  dados: Record<string, any>;
  conteudo: AstNode;
}

export interface NumberingContext {
  prefixo: string;
  next: number;
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
