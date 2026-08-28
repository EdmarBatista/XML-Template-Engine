/**
 * ============================================================================
 * useDocumentExports
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Exportação formatada para Microsoft Word (.docx) a partir do DOM.
 * 2. Exportação vetorial para PDF (.pdf) com fallback para impressão de janela.
 * 3. Impressão isolada do documento com cabeçalhos e quebras de página nativas.
 * 4. Cópia integral do texto limpo para a área de transferência do usuário.
 */

import React from 'react';
import { exportarParaPdf, imprimirDocumentoIsolado } from '../utils/pdfExporter';
import { exportarParaWord } from '../utils/wordExporter';

interface UseDocumentExportsProps {
  xmlName: string;
  numeracaoAtiva: boolean;
  variaveisVermelhasWord: boolean;
  showToast: (msg: string) => void;
}

export function useDocumentExports({
  xmlName,
  numeracaoAtiva,
  variaveisVermelhasWord,
  showToast,
}: UseDocumentExportsProps) {
  const [copiado, setCopiado] = React.useState<boolean>(false);

  // Exportar Word (.docx)
  const handleExportWord = React.useCallback(async () => {
    const docElement = (document.getElementById('documento-visualizado') ||
      document.querySelector('.document-content-a4, .print\\:p-0 > div')) as HTMLElement;
    if (!docElement) {
      alert('Elemento visual do documento não encontrado no DOM.');
      return;
    }
    try {
      showToast('Gerando documento Word formatado...');
      await exportarParaWord(docElement, `${xmlName.replace(/\.xml$/i, '')}.docx`, {
        ativarNumeracaoDocumento: numeracaoAtiva,
        variaveisVermelhas: variaveisVermelhasWord,
      });
      showToast('Documento Word (.docx) gerado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar documento Word: ' + err.message);
    }
  }, [xmlName, numeracaoAtiva, variaveisVermelhasWord, showToast]);

  // Exportar PDF (.pdf)
  const handleExportPdf = React.useCallback(async () => {
    const docElement = (document.getElementById('documento-visualizado') ||
      document.querySelector('.document-content-a4, .print\\:p-0 > div')) as HTMLElement;
    if (!docElement) {
      alert('Elemento visual do documento não encontrado no DOM.');
      return;
    }
    try {
      showToast('Gerando arquivo PDF vetorial...');
      await exportarParaPdf(docElement, `${xmlName.replace(/\.xml$/i, '')}.pdf`, {
        ativarNumeracaoDocumento: numeracaoAtiva,
        variaveisVermelhas: variaveisVermelhasWord,
      });
      showToast('Arquivo PDF (.pdf) gerado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      if (docElement) {
        imprimirDocumentoIsolado(docElement, xmlName);
      } else {
        window.print();
      }
    }
  }, [xmlName, numeracaoAtiva, variaveisVermelhasWord, showToast]);

  // Imprimir documento
  const handlePrint = React.useCallback(() => {
    const docElement = (document.getElementById('documento-visualizado') ||
      document.querySelector('.document-content-a4, .print\\:p-0 > div')) as HTMLElement;
    if (docElement) {
      imprimirDocumentoIsolado(docElement, xmlName);
    } else {
      window.print();
    }
  }, [xmlName]);

  // Copiar todo o texto gerado
  const handleCopiarTexto = React.useCallback(async () => {
    const docElement = document.getElementById('documento-visualizado');
    if (!docElement) return;
    const text = docElement.innerText;
    try {
      await navigator.clipboard.writeText(text);
      setCopiado(true);
      showToast('Texto do documento copiado para a área de transferência!');
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback para seleção manual
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiado(true);
      showToast('Texto copiado com sucesso!');
      setTimeout(() => setCopiado(false), 2500);
    }
  }, [showToast]);

  return {
    copiado,
    handleExportWord,
    handleExportPdf,
    handlePrint,
    handleCopiarTexto,
  };
}
