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
import { XmlPart } from '../types';
import { concatenarXmlsParticionados, extrairIndiceParteXml } from '../utils/xmlParser';

interface UseFilePackageActionsProps {
  xmlName: string;
  rawXml: string;
  xmlParts?: XmlPart[] | null;
  dados: Record<string, any>;
  setDados: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  carregarXmlEJson: (
    novoXml: string,
    nomeArquivoXml: string,
    jsonPayload?: any,
    partesCarregadas?: XmlPart[]
  ) => void;
  adicionarTemplateSilencioso: (nome: string, xml: string) => void;
  onWordFileDropped?: (file: File) => void;
  showToast: (msg: string) => void;
}

export function useFilePackageActions({
  xmlName,
  rawXml,
  xmlParts,
  dados,
  setDados,
  carregarXmlEJson,
  adicionarTemplateSilencioso,
  onWordFileDropped,
  showToast,
}: UseFilePackageActionsProps) {
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);

  // Processa arquivo ZIP contendo XML (único ou partes) e JSON
  const processarArquivoZip = React.useCallback(
    async (file: File) => {
      try {
        showToast('Lendo pacote ZIP...');
        const { xmlText, xmlFileName, jsonData, xmlParts: zipParts } =
          await FilePackageService.parseZipPackage(file);

        if (xmlText) {
          carregarXmlEJson(xmlText, xmlFileName, jsonData, zipParts);
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

  // Processa lista de múltiplos arquivos XML e/ou JSON (Drop ou File Input)
  const processarMultiplosArquivos = React.useCallback(
    async (files: File[]) => {
      // 0. Caso haja arquivo Word (.docx)
      const docxFile = files.find(
        f => f.name.toLowerCase().endsWith('.docx') || f.type.includes('wordprocessingml')
      );
      if (docxFile) {
        if (onWordFileDropped) {
          onWordFileDropped(docxFile);
        }
        return;
      }

      // 1. Caso haja um arquivo ZIP
      const zipFile = files.find(
        f => f.name.toLowerCase().endsWith('.zip') || f.type.includes('zip')
      );
      if (zipFile) {
        await processarArquivoZip(zipFile);
        return;
      }

      const xmlFiles = files.filter(
        f => f.name.toLowerCase().endsWith('.xml') || f.type.includes('xml')
      );
      const jsonFile = files.find(
        f => f.name.toLowerCase().endsWith('.json') || f.type.includes('json')
      );

      let jsonData: any = null;
      if (jsonFile) {
        try {
          const jsonText = await jsonFile.text();
          jsonData = JSON.parse(jsonText);
        } catch (err: any) {
          console.warn('JSON inválido:', err);
        }
      }

      // Se há arquivos XML
      if (xmlFiles.length > 0) {
        const infos = xmlFiles.map(f => ({
          file: f,
          info: extrairIndiceParteXml(f.name),
        }));

        const partFiles = infos.filter(i => i.info.isPart);

        // SOMENTE considera e unifica partes se houver pelo menos 2 arquivos com o padrão explícito [XX]
        if (partFiles.length >= 2) {
          // Agrupa apenas os arquivos que são partes
          const xmlContents = await Promise.all(
            partFiles.map(async item => {
              const text = await item.file.text();
              return {
                nome: item.file.name,
                xml: text,
                index: item.info.indice ?? 999,
                baseNome: item.info.baseNome,
              };
            })
          );

          xmlContents.sort((a, b) => {
            if (a.index !== b.index) return a.index - b.index;
            return a.nome.localeCompare(b.nome);
          });

          const partesFormatadas: XmlPart[] = xmlContents.map((c, idx) => ({
            nome: c.nome,
            xml: c.xml,
            index: c.index !== 999 ? c.index : idx + 1,
          }));

          const xmlConcatenado = concatenarXmlsParticionados(partesFormatadas);
          const baseName = xmlContents[0].baseNome || 'Documento';
          const nomeFinal = `${baseName}.xml`;

          carregarXmlEJson(xmlConcatenado, nomeFinal, jsonData, partesFormatadas);
          return;
        }

        // Se NÃO for conjunto de partes particionadas (ex: arrastou Exemplo.xml e Exemplo4_IFs.xml),
        // NÃO unifica! Abre o primeiro arquivo individualmente.
        const targetXml = xmlFiles[0];
        try {
          const xmlText = await targetXml.text();
          const info = extrairIndiceParteXml(targetXml.name);
          const partes: XmlPart[] | undefined = info.isPart
            ? [{ nome: targetXml.name, xml: xmlText, index: info.indice ?? 1 }]
            : undefined;

          carregarXmlEJson(xmlText, targetXml.name, jsonData, partes);
        } catch (err: any) {
          alert('Erro ao ler arquivo XML: ' + err.message);
        }
        return;
      }

      // Se for apenas arquivo JSON
      if (jsonData) {
        const payload = jsonData.dados ? jsonData.dados : jsonData;
        setDados(prev => ({ ...prev, ...payload }));
        showToast('Preenchimento JSON carregado com sucesso!');
        return;
      }

      alert('Por favor, solte arquivos válidos (.xml, .json ou pacote .zip).');
    },
    [carregarXmlEJson, processarArquivoZip, setDados, showToast]
  );

  // Upload de arquivo XML (ou seleção múltipla)
  const handleUploadXml = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      if (files.length === 1 && (files[0].name.toLowerCase().endsWith('.zip') || files[0].type.includes('zip'))) {
        await processarArquivoZip(files[0]);
        e.target.value = '';
        return;
      }

      await processarMultiplosArquivos(files);
      e.target.value = '';
    },
    [processarArquivoZip, processarMultiplosArquivos]
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

  // Salvar Pacote ZIP contendo XML (separado se houver partes) + JSON juntos
  const handleSaveZip = React.useCallback(async () => {
    try {
      showToast('Empacotando modelo XML e preenchimento JSON...');
      await FilePackageService.exportZipPackage(xmlName, rawXml, dados, xmlParts);
      showToast('Pacote ZIP baixado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar pacote ZIP: ' + err.message);
    }
  }, [xmlName, rawXml, dados, xmlParts, showToast]);

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
      await processarMultiplosArquivos(files);
    },
    [processarMultiplosArquivos]
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

