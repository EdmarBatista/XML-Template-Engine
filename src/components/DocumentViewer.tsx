/**
 * =========================================================================================
 * PROPOSTA DE DECOMPOSIÇÃO APLICADA (DocumentViewer):
 * 
 * 1. DocumentViewer.tsx: Orquestrador limpo de estado, timers de destaque e scroll suave (~150 linhas).
 * 2. DocumentA4Canvas.tsx: Container de apresentação física da folha A4 e modo fluido com zoom e réguas.
 * 3. DocumentNodeRenderer.tsx: Dispatcher central que processa os nós AST e controla o fluxo de parágrafos.
 * 4. DocumentSectionNode.tsx: Renderizador modular de seções (<secao>), títulos (<titulo>, <subtitulo>) e numeração hierárquica.
 * 5. DocumentTableNode.tsx: Renderizador isolado de tabelas estruturadas (<tabela>), cabeçalhos, bordas e células.
 * 6. DocumentInlineVariable.tsx: Elemento interativo de variável com clique (foco) e duplo-clique (edição inline).
 * =========================================================================================
 */

import React from 'react';
import { FileText } from 'lucide-react';
import { AstNode, FormStructure, NumberingContext } from '../types';
import { DocumentA4Canvas } from './DocumentViewer/DocumentA4Canvas';
import { DocumentNodeRenderer, extrairTooltip } from './DocumentViewer/DocumentNodeRenderer';

export { extrairTooltip };
import { WordComment } from '../types';

interface DocumentViewerProps {
  conteudo: AstNode;
  dados: Record<string, any>;
  estrutura: FormStructure;
  ultimoCampoAlterado: string | null;
  versaoCampoAlterado: number;
  origemCampoAlterado: string | null;
  campoFocadoDoc?: { id: string; timestamp: number; origem?: string } | null;
  onFocusField: (fieldId: string) => void;
  onUpdateField: (fieldId: string, value: any, origem?: string) => void;
  numeracaoAtiva: boolean;
  edicaoInline: boolean;
  irParaCampoAtivo: boolean;
  deslocarDocumento: boolean;
  variaveisVermelhasWord: boolean;
  nomeDocumento?: string;
  zoom: number;
  modoA4: boolean;
  comentarios?: WordComment[];
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  conteudo,
  dados,
  estrutura,
  ultimoCampoAlterado,
  versaoCampoAlterado,
  origemCampoAlterado,
  campoFocadoDoc,
  onFocusField,
  onUpdateField,
  numeracaoAtiva,
  edicaoInline,
  irParaCampoAtivo,
  deslocarDocumento,
  variaveisVermelhasWord,
  nomeDocumento = 'Documento',
  zoom,
  modoA4,
  comentarios,
}) => {
  const [destaquesAtivos, setDestaquesAtivos] = React.useState<Record<string, number>>({});
  const docRef = React.useRef<HTMLDivElement>(null);

  const fontScale = modoA4 ? 1 : (zoom || 100) / 100;

  // Efeito de scroll suave e pulso de destaque quando um campo é focado explicitamente pelo formulário
  React.useEffect(() => {
    if (!campoFocadoDoc?.id) return;
    const targetField = campoFocadoDoc.id;

    const now = Date.now();
    setDestaquesAtivos(prev => ({ ...prev, [targetField]: now + 7000 }));

    if (deslocarDocumento && campoFocadoDoc?.origem === 'painel' && docRef.current) {
      setTimeout(() => {
        const el = docRef.current?.querySelector(
          `[data-vars~="${CSS.escape(targetField)}"], [data-vars*="${CSS.escape(targetField)}"], [data-field-id="${CSS.escape(targetField)}"]`
        );
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  }, [campoFocadoDoc, deslocarDocumento]);

  // Efeito de destaque suave e scroll quando um campo é alterado
  React.useEffect(() => {
    if (!ultimoCampoAlterado) return;
    const now = Date.now();
    setDestaquesAtivos(prev => ({ ...prev, [ultimoCampoAlterado]: now + 7000 }));

    if (deslocarDocumento && origemCampoAlterado === 'painel' && docRef.current) {
      setTimeout(() => {
        const el = docRef.current?.querySelector(
          `[data-vars~="${CSS.escape(ultimoCampoAlterado)}"], [data-vars*="${CSS.escape(ultimoCampoAlterado)}"], [data-field-id="${CSS.escape(ultimoCampoAlterado)}"]`
        );
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  }, [ultimoCampoAlterado, versaoCampoAlterado, origemCampoAlterado, deslocarDocumento]);

  // Limpa timers de destaque antigos
  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setDestaquesAtivos(prev => {
        let changed = false;
        const novo: Record<string, number> = {};
        Object.entries(prev).forEach(([k, exp]) => {
          const expNum = Number(exp);
          if (expNum > now) novo[k] = expNum;
          else changed = true;
        });
        return changed ? novo : prev;
      });
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const ctxNumeracaoInicial: NumberingContext = {
    prefixo: '',
    next: 1,
    lastNumber: '',
    habilitado: numeracaoAtiva,
    numerarBlocos: numeracaoAtiva,
    levelCounters: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 },
    levelNumbers: {},
  };

  const temConteudo = Boolean(
    conteudo?.filhos &&
    conteudo.filhos.length > 0 &&
    conteudo.filhos.some(f => f.tipo !== 'texto' || (f.texto || '').trim().length > 0)
  );

  return (
    <DocumentA4Canvas
      modoA4={modoA4}
      zoom={zoom}
      fontScale={fontScale}
      docRef={docRef}
    >
        {temConteudo ? (
          <DocumentNodeRenderer
            comentarios={comentarios}
            nodes={conteudo.filhos || []}
            dados={dados}
            estrutura={estrutura}
            destaquesAtivos={destaquesAtivos}
            onFocusField={onFocusField}
            onUpdateField={onUpdateField}
            edicaoInline={edicaoInline}
            variaveisVermelhasWord={variaveisVermelhasWord}
            fontScale={fontScale}
            contextoNumeracao={ctxNumeracaoInicial}
            pathPrefix="root"
          />
        ) : (
          <div className="py-20 px-6 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-3 select-none">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 opacity-60" />
            <h3 className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
              Nenhum conteúdo no documento
            </h3>
            <p className="text-xs max-w-sm text-slate-400 dark:text-slate-500 leading-relaxed">
              Este modelo XML não possui a tag <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-mono">&lt;conteudo&gt;</code> ou está vazio.
            </p>
          </div>
        )}
    </DocumentA4Canvas>
  );
};
