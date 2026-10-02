/**
 * ============================================================================
 * useDocumentExporters (Camada Unificada de Exportações e Downloads)
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Geração e download de documentos Microsoft Word (.docx) formatados.
 * 2. Geração e download de arquivos PDF vetoriais (.pdf).
 * 3. Exportação do preenchimento estruturado de dados em formato JSON.
 * 4. Empacotamento e download do pacote ZIP completo (XML + JSON).
 * 5. Cópia limpa do texto integral do documento para a área de transferência.
 * 6. Tratamento unificado de mensagens e feedbacks visuais via useToast.
 */

import React from 'react';
import { exportarParaPdf } from '../utils/pdfExporter';
import { exportarParaWord } from '../utils/wordExporter';
import { FilePackageService } from '../services/filePackageService';
import { XmlPart, DadosDocumento } from '../types';
import { ToastTipo } from '../hooks/useToast';
import { motivoDoErro } from '../utils/erros';

interface UseDocumentExportersProps {
  xmlName: string;
  rawXml: string;
  xmlParts?: XmlPart[] | null;
  dados: DadosDocumento;
  numeracaoAtiva: boolean;
  variaveisVermelhasWord: boolean;
  showToast: (msg: string, tipo?: ToastTipo) => void;
}

export function useDocumentExporters({
  xmlName,
  rawXml,
  xmlParts,
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
      showToast('Elemento visual do documento não encontrado no DOM.', 'erro');
      return;
    }
    try {
      showToast('Gerando documento Word formatado...');
      await exportarParaWord(docElement, `${xmlName.replace(/\.xml$/i, '')}.docx`, {
        ativarNumeracaoDocumento: numeracaoAtiva,
        variaveisVermelhas: variaveisVermelhasWord,
      });
      showToast('Documento Word (.docx) gerado com sucesso!');
    } catch (err) {
      console.error('EXPORT WORD ERROR STACK:', err instanceof Error ? err.stack : err);
      showToast(`Erro ao gerar o Word: ${motivoDoErro(err)}`, 'erro');
    }
  }, [xmlName, numeracaoAtiva, variaveisVermelhasWord, showToast]);

  // Exportar PDF (.pdf)
  const handleExportPdf = React.useCallback(async () => {
    const docElement = (document.getElementById('documento-visualizado') ||
      document.querySelector('.document-content-a4, .print\\:p-0 > div')) as HTMLElement;
    if (!docElement) {
      showToast('Elemento visual do documento não encontrado no DOM.', 'erro');
      return;
    }
    try {
      showToast('Gerando arquivo PDF vetorial...');
      await exportarParaPdf(docElement, `${xmlName.replace(/\.xml$/i, '')}.pdf`, {
        ativarNumeracaoDocumento: numeracaoAtiva,
        variaveisVermelhas: variaveisVermelhasWord,
      });
      showToast('Arquivo PDF (.pdf) gerado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      showToast(`Erro ao gerar o PDF: ${motivoDoErro(err)}`, 'erro');
    }
  }, [xmlName, numeracaoAtiva, variaveisVermelhasWord, showToast]);

  // Salvar JSON de preenchimento
  const handleSaveJson = React.useCallback(() => {
    FilePackageService.exportJsonData(xmlName, dados);
    showToast('Arquivo JSON baixado com sucesso!');
  }, [xmlName, dados, showToast]);

  // Salvar Pacote ZIP contendo XML + JSON juntos
  const handleSaveZip = React.useCallback(async () => {
    try {
      showToast('Empacotando modelo XML e preenchimento JSON...');
      await FilePackageService.exportZipPackage(xmlName, rawXml, dados, xmlParts);
      showToast('Pacote ZIP (XML + JSON) baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar pacote ZIP:', err);
      showToast(`Erro ao gerar o pacote ZIP: ${motivoDoErro(err)}`, 'erro');
    }
  }, [xmlName, rawXml, dados, xmlParts, showToast]);

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
    handleSaveJson,
    handleSaveZip,
    handleCopiarTexto,
  };
}
