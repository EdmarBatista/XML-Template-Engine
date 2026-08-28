/**
 * ============================================================================
 * useDocumentExporters (Camada Unificada de Exportações e Downloads)
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Geração e download de documentos Microsoft Word (.docx) formatados.
 * 2. Geração e download de arquivos PDF vetoriais (.pdf).
 * 3. Impressão isolada do documento com quebras nativas de página A4.
 * 4. Exportação do preenchimento estruturado de dados em formato JSON.
 * 5. Empacotamento e download do pacote ZIP completo (XML + JSON).
 * 6. Cópia limpa do texto integral do documento para a área de transferência.
 * 7. Tratamento unificado de mensagens e feedbacks visuais via useToast.
 */

import React from 'react';
import { exportarParaPdf, imprimirDocumentoIsolado } from '../utils/pdfExporter';
import { exportarParaWord } from '../utils/wordExporter';
import { FilePackageService } from '../services/filePackageService';

interface UseDocumentExportersProps {
  xmlName: string;
  rawXml: string;
  dados: Record<string, any>;
  numeracaoAtiva: boolean;
  variaveisVermelhasWord: boolean;
  showToast: (msg: string) => void;
}

export function useDocumentExporters({
  xmlName,
  rawXml,
  dados,
  numeracaoAtiva,
  variaveisVermelhasWord,
  showToast,
}: UseDocumentExportersProps) {
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

  // Salvar JSON de preenchimento
  const handleSaveJson = React.useCallback(() => {
    FilePackageService.exportJsonData(xmlName, dados);
    showToast('Arquivo JSON baixado com sucesso!');
  }, [xmlName, dados, showToast]);

  // Salvar Pacote ZIP contendo XML + JSON juntos
  const handleSaveZip = React.useCallback(async () => {
    try {
      showToast('Empacotando modelo XML e preenchimento JSON...');
      await FilePackageService.exportZipPackage(xmlName, rawXml, dados);
      showToast('Pacote ZIP (XML + JSON) baixado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar pacote ZIP: ' + err.message);
    }
  }, [xmlName, rawXml, dados, showToast]);

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
    handleSaveJson,
    handleSaveZip,
    handleCopiarTexto,
  };
}
