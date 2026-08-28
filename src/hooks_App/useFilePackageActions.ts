/**
 * ============================================================================
 * useFilePackageActions
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Gerenciar interações de Drag & Drop de arquivos (XML, JSON, ZIP).
 * 2. Processar uploads de arquivos XML individuais, preenchimentos JSON e pacotes ZIP.
 * 3. Exportar preenchimento estruturado em formato JSON.
 * 4. Empacotar e baixar modelos e formulários completos em arquivo compactado .ZIP.
 */

import React from 'react';
import { FilePackageService } from '../services/filePackageService';

interface UseFilePackageActionsProps {
  xmlName: string;
  rawXml: string;
  dados: Record<string, any>;
  setDados: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  carregarXmlEJson: (novoXml: string, nomeArquivoXml: string, jsonPayload?: any) => void;
  adicionarTemplateSilencioso: (nome: string, xml: string) => void;
  showToast: (msg: string) => void;
}

export function useFilePackageActions({
  xmlName,
  rawXml,
  dados,
  setDados,
  carregarXmlEJson,
  adicionarTemplateSilencioso,
  showToast,
}: UseFilePackageActionsProps) {
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);

  // Processa arquivo ZIP contendo XML e JSON
  const processarArquivoZip = React.useCallback(
    async (file: File) => {
      try {
        showToast('Lendo pacote ZIP...');
        const { xmlText, xmlFileName, jsonData } = await FilePackageService.parseZipPackage(file);

        if (xmlText) {
          carregarXmlEJson(xmlText, xmlFileName, jsonData);
          showToast(`Pacote ZIP "${file.name}" carregado com sucesso!`);
        } else if (jsonData) {
          const payload = jsonData.dados ? jsonData.dados : jsonData;
          setDados(prev => ({ ...prev, ...payload }));
          showToast('Preenchimento JSON do arquivo ZIP importado com sucesso!');
        }
      } catch (err: any) {
        console.error(err);
        alert('Erro ao ler arquivo ZIP: ' + err.message);
      }
    },
    [carregarXmlEJson, setDados, showToast]
  );

  // Upload de arquivo XML (ou ZIP caso selecionado)
  const handleUploadXml = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')) {
        await processarArquivoZip(file);
        e.target.value = '';
        return;
      }

      try {
        const content = await FilePackageService.readFileAsText(file);
        if (content) {
          carregarXmlEJson(content, file.name);
        }
      } catch (err: any) {
        alert('Erro ao ler arquivo XML: ' + err.message);
      }
      e.target.value = '';
    },
    [carregarXmlEJson, processarArquivoZip]
  );

  // Upload de pacote ZIP
  const handleUploadZip = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      processarArquivoZip(file);
      e.target.value = '';
    },
    [processarArquivoZip]
  );

  // Upload de arquivo JSON com dados
  const handleUploadJson = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const content = await FilePackageService.readFileAsText(file);
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          const payload = parsed.dados ? parsed.dados : parsed;
          setDados(prev => ({ ...prev, ...payload }));
          showToast('Preenchimento JSON importado com sucesso!');
        }
      } catch (err: any) {
        alert('Arquivo JSON inválido: ' + err.message);
      }
      e.target.value = '';
    },
    [setDados, showToast]
  );

  // Salvar JSON de preenchimento
  const handleSaveJson = React.useCallback(() => {
    FilePackageService.exportJsonData(xmlName, dados);
    showToast('Arquivo JSON baixado!');
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

  // Drag and Drop de múltiplos arquivos (.xml, .json ou pacote .zip)
  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  }, []);

  const handleDrop = React.useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
      const files: File[] = Array.from(e.dataTransfer.files || []);
      if (files.length === 0) return;

      // 1. Caso haja um arquivo ZIP arrastado
      const zipFile = files.find(f => f.name.toLowerCase().endsWith('.zip') || f.type.includes('zip'));
      if (zipFile) {
        await processarArquivoZip(zipFile);
        return;
      }

      // 2. Procura se há XML e JSON entre os arquivos arrastados
      const xmlFile = files.find(f => f.name.toLowerCase().endsWith('.xml') || f.type.includes('xml'));
      const jsonFile = files.find(f => f.name.toLowerCase().endsWith('.json') || f.type.includes('json'));

      // 2a. Ambos XML e JSON foram arrastados juntos
      if (xmlFile && jsonFile) {
        try {
          const xmlText = await xmlFile.text();
          const jsonText = await jsonFile.text();
          let jsonData = null;
          try {
            jsonData = JSON.parse(jsonText);
          } catch (err: any) {
            console.warn('JSON inválido arrastado:', err);
          }
          carregarXmlEJson(xmlText, xmlFile.name, jsonData);
        } catch (err: any) {
          alert('Erro ao ler arquivos arrastados: ' + err.message);
        }
        return;
      }

      // 2b. Apenas arquivo(s) XML arrastado(s)
      if (xmlFile) {
        try {
          const xmlText = await xmlFile.text();
          carregarXmlEJson(xmlText, xmlFile.name);

          // Se houver múltiplos XMLs arrastados, adiciona os outros na lista de templates customizados
          const outrosXmls = files.filter(
            f => f !== xmlFile && (f.name.toLowerCase().endsWith('.xml') || f.type.includes('xml'))
          );
          for (const outro of outrosXmls) {
            const outroTexto = await outro.text();
            adicionarTemplateSilencioso(outro.name, outroTexto);
          }
        } catch (err: any) {
          alert('Erro ao ler arquivo XML: ' + err.message);
        }
        return;
      }

      // 2c. Apenas arquivo JSON arrastado
      if (jsonFile) {
        try {
          const jsonText = await jsonFile.text();
          const parsed = JSON.parse(jsonText);
          const payload = parsed.dados ? parsed.dados : parsed;
          setDados(prev => ({ ...prev, ...payload }));
          showToast('Preenchimento JSON carregado com sucesso!');
        } catch (err: any) {
          alert('Erro ao carregar JSON: ' + err.message);
        }
        return;
      }

      alert('Por favor, solte arquivos válidos (.xml, .json ou pacote .zip).');
    },
    [adicionarTemplateSilencioso, carregarXmlEJson, processarArquivoZip, setDados, showToast]
  );

  return {
    isDraggingFile,
    processarArquivoZip,
    handleUploadXml,
    handleUploadZip,
    handleUploadJson,
    handleSaveJson,
    handleSaveZip,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
