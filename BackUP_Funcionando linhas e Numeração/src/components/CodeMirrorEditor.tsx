import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { xml } from '@codemirror/lang-xml';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  EditorView,
  MatchDecorator,
  Decoration,
  ViewPlugin,
  DecorationSet,
  ViewUpdate,
} from '@codemirror/view';

export interface CodeMirrorEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: 'xml' | 'json';
  readOnly?: boolean;
  onSave?: () => void;
  height?: string;
  minHeight?: string;
  placeholder?: string;
}

// Decorator to highlight {{variavel}} with distinctive golden color
const variableDecorator = new MatchDecorator({
  regexp: /\{\{[^{}]*\}\}/g,
  decoration: () =>
    Decoration.mark({
      class: 'cm-template-variable',
    }),
});

const variableHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = variableDecorator.createDeco(view);
    }
    update(update: ViewUpdate) {
      this.decorations = variableDecorator.updateDeco(update, this.decorations);
    }
  },
  {
    decorations: v => v.decorations,
  }
);

// Custom theme that matches our slate-950 dark container
const customSlateTheme = EditorView.theme({
  '&': {
    backgroundColor: '#020617 !important', // slate-950
    color: '#e2e8f0',
    fontSize: '12.5px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: 'inherit',
    lineHeight: '1.65',
    padding: '12px 0',
  },
  '.cm-line': {
    padding: '0 12px',
  },
  '.cm-gutters': {
    backgroundColor: '#090d16',
    color: '#475569',
    border: 'none',
    borderRight: '1px solid #1e293b',
    paddingRight: '6px',
    userSelect: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(51, 65, 85, 0.25)',
  },
  '.cm-cursor': {
    borderLeftColor: '#38bdf8 !important',
    borderLeftWidth: '2px !important',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(56, 189, 248, 0.25) !important',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#94a3b8',
    borderRadius: '3px',
    padding: '0 4px',
  },
  // Template variable highlight styling {{variavel}}
  '.cm-template-variable': {
    color: '#facc15 !important',
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    padding: '0 2px',
    borderRadius: '3px',
    fontWeight: '600',
    border: '1px solid rgba(250, 204, 21, 0.3)',
  },
});

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  language,
  readOnly = false,
  onSave,
  height = '100%',
  minHeight = '360px',
  placeholder,
}) => {
  const extensions = React.useMemo(() => {
    const ext = [
      language === 'xml' ? xml() : json(),
      oneDark,
      customSlateTheme,
      EditorView.lineWrapping, // Soft wrap: breaks lines visually without adding newlines
    ];

    if (language === 'xml') {
      ext.push(variableHighlightPlugin);
    }

    if (onSave) {
      ext.push(
        EditorView.domEventHandlers({
          keydown: (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
              e.preventDefault();
              e.stopPropagation();
              onSave();
              return true;
            }
            return false;
          },
        })
      );
    }

    return ext;
  }, [language, onSave]);

  return (
    <div className="w-full h-full min-h-full flex flex-col flex-1 overflow-hidden bg-slate-950">
      <CodeMirror
        value={value}
        height={height}
        minHeight={minHeight}
        theme="dark"
        extensions={extensions}
        onChange={onChange ? val => onChange(val) : undefined}
        readOnly={readOnly}
        editable={!readOnly}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: !readOnly,
          highlightSpecialChars: true,
          history: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: !readOnly,
          autocompletion: false,
          rectangularSelection: true,
          crosshairCursor: false,
          highlightActiveLine: !readOnly,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: false,
          lintKeymap: false,
        }}
        className="text-xs h-full flex-1 overflow-auto"
      />
    </div>
  );
};
