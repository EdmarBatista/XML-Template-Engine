import { linter, Diagnostic } from '@codemirror/lint';
import { syntaxTree } from '@codemirror/language';
import { EditorView } from '@codemirror/view';

const ALLOWED_TAGS = new Set([
  // Estrutura Base
  'documento', 'formulario', 'conteudo',
  
  // Formulário
  'grupo',
  'input', 'number', 'date', 'textarea', 'select', 'option', 'checkbox', 'radio', 'tabela', 'coluna',
  
  // Blocos de Conteúdo
  'secao', 'titulo', 'subtitulo', 'p', 'lista', 'lista_numerada', 'item', 'hr',
  
  // Controle de Fluxo
  'if', 'condicao', 'foreach', 'for-each',
  
  // Estrutura de Tabela no Conteúdo
  'cabecalho', 'celula', 'linhas', 'linha',
  
  // Estilos Inline
  'b', 'i', 'u', 's', 'mark', 'cor', 'a', 'br'
]);

export const xmlLinter = linter((view: EditorView): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const tree = syntaxTree(view.state);
  
  tree.cursor().iterate(node => {
    // In Lezer XML, the tag name is usually represented by a node named "TagName"
    if (node.name === 'TagName') {
      const tagName = view.state.sliceDoc(node.from, node.to).toLowerCase();
      if (!ALLOWED_TAGS.has(tagName)) {
        diagnostics.push({
          from: node.from,
          to: node.to,
          severity: 'error',
          message: `Tag <${tagName}> não é permitida ou não é reconhecida pelo sistema.`,
        });
      }
    }
  });

  return diagnostics;
});
