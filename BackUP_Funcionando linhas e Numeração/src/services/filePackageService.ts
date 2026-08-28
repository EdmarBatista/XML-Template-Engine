/**
 * Serviço de Empacotamento, Leitura e Download de Arquivos (.zip, .xml, .json).
 * Centraliza as operações de leitura assíncrona, extração de pacotes ZIP via JSZip
 * e acionamento de downloads para desacoplar o App.tsx.
 */

import JSZip from 'jszip';

export interface ZipPackageContent {
  xmlText: string | null;
  xmlFileName: string;
  jsonData: any | null;
}

export const FilePackageService = {
  /**
   * Lê e extrai os conteúdos de um pacote .zip contendo .xml e/ou .json.
   */
  async parseZipPackage(file: File): Promise<ZipPackageContent> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    let xmlFileEntry: JSZip.JSZipObject | null = null;
    let jsonFileEntry: JSZip.JSZipObject | null = null;

    zipContent.forEach((relativePath, fileEntry) => {
      if (fileEntry.dir || relativePath.startsWith('__MACOSX') || relativePath.startsWith('.')) return;
      const lower = relativePath.toLowerCase();
      if (lower.endsWith('.xml') && !xmlFileEntry) {
        xmlFileEntry = fileEntry;
      } else if (lower.endsWith('.json') && !jsonFileEntry) {
        jsonFileEntry = fileEntry;
      }
    });

    if (!xmlFileEntry && !jsonFileEntry) {
      throw new Error('Nenhum arquivo .xml ou .json foi encontrado dentro do arquivo ZIP.');
    }

    let xmlText: string | null = null;
    let xmlFileName: string = file.name.replace(/\.zip$/i, '.xml');
    let jsonData: any = null;

    if (xmlFileEntry) {
      xmlText = await (xmlFileEntry as JSZip.JSZipObject).async('string');
      const parts = (xmlFileEntry as JSZip.JSZipObject).name.split('/');
      xmlFileName = parts[parts.length - 1];
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
    };
  },

  /**
   * Gera e dispara o download de um pacote ZIP contendo o modelo XML e o preenchimento JSON.
   */
  async exportZipPackage(xmlName: string, rawXml: string, dados: Record<string, any>): Promise<void> {
    const zip = new JSZip();
    const baseName = xmlName.replace(/\.xml$/i, '');

    // 1. Arquivo XML do modelo
    const xmlFilename = xmlName.endsWith('.xml') ? xmlName : `${baseName}.xml`;
    zip.file(xmlFilename, rawXml);

    // 2. Arquivo JSON com preenchimento
    const jsonPayload = {
      xml: xmlName,
      data_geracao: new Date().toISOString(),
      dados,
    };
    const jsonFilename = `${baseName}_dados.json`;
    zip.file(jsonFilename, JSON.stringify(jsonPayload, null, 2));

    // Gera o blob do ZIP e dispara download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
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
