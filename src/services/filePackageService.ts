/**
 * Serviço de Empacotamento, Leitura e Download de Arquivos (.zip, .xml, .json).
 * Centraliza as operações de leitura assíncrona, extração de pacotes ZIP via JSZip
 * e acionamento de downloads para desacoplar o App.tsx.
 */

import JSZip from 'jszip';
import { XmlPart } from '../types';
import { concatenarXmlsParticionados, extrairIndiceParteXml } from '../utils/xmlParser';

export interface ZipPackageContent {
  xmlText: string | null;
  xmlFileName: string;
  jsonData: any | null;
  xmlParts?: XmlPart[];
}

export const FilePackageService = {
  /**
   * Lê e extrai os conteúdos de um pacote .zip contendo .xml (único ou particionado) e/ou .json.
   */
  async parseZipPackage(file: File): Promise<ZipPackageContent> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    const xmlEntries: { name: string; entry: JSZip.JSZipObject }[] = [];
    let jsonFileEntry: JSZip.JSZipObject | null = null;

    zipContent.forEach((relativePath, fileEntry) => {
      if (fileEntry.dir || relativePath.startsWith('__MACOSX') || relativePath.startsWith('.')) return;
      const lower = relativePath.toLowerCase();
      if (lower.endsWith('.xml')) {
        const parts = relativePath.split('/');
        const simpleName = parts[parts.length - 1];
        xmlEntries.push({ name: simpleName, entry: fileEntry });
      } else if (lower.endsWith('.json') && !jsonFileEntry) {
        jsonFileEntry = fileEntry;
      }
    });

    if (xmlEntries.length === 0 && !jsonFileEntry) {
      throw new Error('Nenhum arquivo .xml ou .json foi encontrado dentro do arquivo ZIP.');
    }

    let xmlText: string | null = null;
    let xmlFileName: string = file.name.replace(/\.zip$/i, '.xml');
    let xmlParts: XmlPart[] | undefined = undefined;
    let jsonData: any = null;

    if (xmlEntries.length > 0) {
      // Lê todos os arquivos XML
      const xmlContents = await Promise.all(
        xmlEntries.map(async item => {
          const content = await item.entry.async('string');
          const info = extrairIndiceParteXml(item.name);
          return {
            nome: item.name,
            xml: content,
            index: info.indice ?? 999,
            baseNome: info.baseNome,
            isPart: info.isPart,
          };
        })
      );

      // Somente considera particionado se houver partes explícitas com [XX]
      const partEntries = xmlContents.filter(item => item.isPart);

      if (partEntries.length >= 2 || (xmlContents.length === 1 && xmlContents[0].isPart)) {
        const targetList = partEntries.length >= 2 ? partEntries : xmlContents;
        targetList.sort((a, b) => {
          if (a.index !== b.index) return a.index - b.index;
          return a.nome.localeCompare(b.nome);
        });

        xmlParts = targetList.map((item, idx) => ({
          nome: item.nome,
          xml: item.xml,
          index: item.index !== 999 ? item.index : idx + 1,
        }));

        xmlText = concatenarXmlsParticionados(xmlParts);
        const baseName = targetList[0].baseNome || file.name.replace(/\.zip$/i, '');
        xmlFileName = `${baseName}.xml`;
      } else {
        xmlText = xmlContents[0].xml;
        xmlFileName = xmlContents[0].nome;
      }
    }

    if (jsonFileEntry) {
      const jsonText = await (jsonFileEntry as JSZip.JSZipObject).async('string');
      try {
        jsonData = JSON.parse(jsonText);
      } catch (err) {
        console.warn('Aviso: Erro ao interpretar arquivo JSON dentro do pacote ZIP:', err);
      }
    }

    return {
      xmlText,
      xmlFileName,
      jsonData,
      xmlParts,
    };
  },

  /**
   * Gera e dispara o download de um pacote ZIP.
   * Se houver partes separadas (xmlParts), elas vêm salvas separadamente no ZIP (ex: Nome [01].xml, Nome [02].xml).
   */
  async exportZipPackage(
    xmlName: string,
    rawXml: string,
    dados: Record<string, any>,
    xmlParts?: XmlPart[] | null
  ): Promise<void> {
    const zip = new JSZip();
    const baseName = xmlName.replace(/\.xml$/i, '');

    if (xmlParts && xmlParts.length > 0) {
      // 1. Exporta cada arquivo XML particionado individualmente
      xmlParts.forEach(part => {
        const pName = part.nome.endsWith('.xml') ? part.nome : `${part.nome}.xml`;
        zip.file(pName, part.xml);
      });
    } else {
      // 1. Arquivo XML único do modelo
      const xmlFilename = xmlName.endsWith('.xml') ? xmlName : `${baseName}.xml`;
      zip.file(xmlFilename, rawXml);
    }

    // 2. Arquivo JSON com preenchimento unificado
    const jsonPayload = {
      xml: xmlName,
      data_geracao: new Date().toISOString(),
      dados,
    };
    const jsonFilename = `${baseName}_dados.json`;
    zip.file(jsonFilename, JSON.stringify(jsonPayload, null, 2));

    // Gera o blob do ZIP com compactação máxima (DEFLATE nível 9) e dispara download
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9,
      },
    });
    this.downloadBlob(zipBlob, `${baseName}_pacote.zip`);
  },

  /**
   * Dispara o download de um arquivo JSON estruturado contendo os dados do formulário.
   */
  exportJsonData(xmlName: string, dados: Record<string, any>): void {
    const payload = {
      xml: xmlName,
      data_geracao: new Date().toISOString(),
      dados,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    this.downloadBlob(blob, `${xmlName.replace(/\.xml$/i, '')}_dados.json`);
  },

  /**
   * Lê o conteúdo de texto de um arquivo File assincronamente.
   */
  async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = evt => {
        const content = evt.target?.result as string;
        resolve(content || '');
      };
      reader.onerror = err => reject(err);
      reader.readAsText(file);
    });
  },

  /**
   * Utilitário compartilhado para acionamento de download no navegador.
   */
  downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
