// @vitest-environment jsdom
// O serviço monta ZIP com JSZip, mexe em Blob/URL/âncora de download e lê File com FileReader.

import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { FilePackageService } from './filePackageService';

const zipDe = async (arquivos: Record<string, string>, nome = 'pacote.zip'): Promise<File> => {
  const zip = new JSZip();
  Object.entries(arquivos).forEach(([caminho, conteudo]) => zip.file(caminho, conteudo));
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], nome, { type: 'application/zip' });
};

const XML_A = '<documento><conteudo><p>primeira parte</p></conteudo></documento>';
const XML_B = '<documento><conteudo><p>segunda parte</p></conteudo></documento>';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseZipPackage', () => {
  it('lê um XML único e devolve o nome do arquivo de dentro do pacote', async () => {
    const file = await zipDe({ 'Exemplo.xml': XML_A });
    const r = await FilePackageService.parseZipPackage(file);

    expect(r.xmlText).toBe(XML_A);
    expect(r.xmlFileName).toBe('Exemplo.xml');
    expect(r.xmlParts).toBeUndefined();
    expect(r.jsonData).toBeNull();
  });

  it('lê o JSON de preenchimento junto com o XML', async () => {
    const dados = { nome: 'Fulano', valor: '10' };
    const file = await zipDe({ 'Exemplo.xml': XML_A, 'Exemplo_dados.json': JSON.stringify({ dados }) });
    const r = await FilePackageService.parseZipPackage(file);

    expect(r.xmlText).toBe(XML_A);
    expect(r.jsonData).toEqual({ dados });
  });

  it('concatena as partes [XX] em ordem e mantém as partes separadas', async () => {
    const file = await zipDe({ 'Contrato [02].xml': XML_B, 'Contrato [01].xml': XML_A });
    const r = await FilePackageService.parseZipPackage(file);

    expect(r.xmlParts?.map(p => p.nome)).toEqual(['Contrato [01].xml', 'Contrato [02].xml']);
    expect(r.xmlParts?.map(p => p.index)).toEqual([1, 2]);
    expect(r.xmlText).toContain('primeira parte');
    expect(r.xmlText).toContain('segunda parte');
    expect(r.xmlFileName).toBe('Contrato.xml');
  });

  it('ignora lixo do sistema operacional dentro do ZIP', async () => {
    const file = await zipDe({
      '__MACOSX/Exemplo.xml': 'lixo',
      '._Exemplo.xml': 'lixo tambem',
      'Exemplo.xml': XML_A,
    });
    const r = await FilePackageService.parseZipPackage(file);

    expect(r.xmlText).toBe(XML_A);
    expect(r.xmlFileName).toBe('Exemplo.xml');
  });

  it('usa o nome do ZIP quando só há JSON', async () => {
    const file = await zipDe({ 'dados.json': JSON.stringify({ nome: 'Sem XML' }) }, 'modelo.zip');
    const r = await FilePackageService.parseZipPackage(file);

    expect(r.xmlText).toBeNull();
    expect(r.xmlFileName).toBe('modelo.xml');
    expect(r.jsonData).toEqual({ nome: 'Sem XML' });
  });

  it('não explode com JSON inválido: devolve jsonData nulo', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const file = await zipDe({ 'Exemplo.xml': XML_A, 'quebrado.json': '{nada' });
    const r = await FilePackageService.parseZipPackage(file);

    expect(r.xmlText).toBe(XML_A);
    expect(r.jsonData).toBeNull();
    expect(aviso).toHaveBeenCalled();
  });

  it('recusa pacote sem XML e sem JSON', async () => {
    const file = await zipDe({ 'leiame.txt': 'nada útil aqui' });

    await expect(FilePackageService.parseZipPackage(file)).rejects.toThrow(
      'Nenhum arquivo .xml ou .json foi encontrado dentro do arquivo ZIP.'
    );
  });
});

describe('exportZipPackage — ida e volta do pacote', () => {
  it('gera o ZIP com o XML único e o JSON de preenchimento', async () => {
    const download = vi.spyOn(FilePackageService, 'downloadBlob').mockImplementation(() => {});

    await FilePackageService.exportZipPackage('modelo.xml', XML_A, { nome: 'Fulano' });

    expect(download).toHaveBeenCalledTimes(1);
    const [blob, nomeArquivo] = download.mock.calls[0];
    expect(nomeArquivo).toBe('modelo_pacote.zip');

    const pacote = await JSZip.loadAsync(blob);
    expect(Object.keys(pacote.files).sort()).toEqual(['modelo.xml', 'modelo_dados.json']);

    const jsonSalvo = JSON.parse(await pacote.file('modelo_dados.json')!.async('string'));
    expect(jsonSalvo.xml).toBe('modelo.xml');
    expect(jsonSalvo.dados).toEqual({ nome: 'Fulano' });
    expect(typeof jsonSalvo.data_geracao).toBe('string');
    expect(await pacote.file('modelo.xml')!.async('string')).toBe(XML_A);
  });

  it('salva cada parte separadamente quando o documento é particionado', async () => {
    const download = vi.spyOn(FilePackageService, 'downloadBlob').mockImplementation(() => {});

    await FilePackageService.exportZipPackage('Contrato.xml', XML_A, {}, [
      { nome: 'Contrato [01].xml', xml: XML_A, index: 1 },
      { nome: 'Contrato [02].xml', xml: XML_B, index: 2 },
    ]);

    const pacote = await JSZip.loadAsync(download.mock.calls[0][0]);
    expect(Object.keys(pacote.files).sort()).toEqual([
      'Contrato [01].xml',
      'Contrato [02].xml',
      'Contrato_dados.json',
    ]);
    expect(await pacote.file('Contrato [02].xml')!.async('string')).toBe(XML_B);
  });
});

describe('exportJsonData e readFileAsText', () => {
  it('baixa o JSON com xml, data de geração e dados', async () => {
    const download = vi.spyOn(FilePackageService, 'downloadBlob').mockImplementation(() => {});

    FilePackageService.exportJsonData('modelo.xml', { nome: 'Fulano' });

    const [blob, nomeArquivo] = download.mock.calls[0];
    expect(nomeArquivo).toBe('modelo_dados.json');
    expect(JSON.parse(await blob.text())).toMatchObject({ xml: 'modelo.xml', dados: { nome: 'Fulano' } });
  });

  it('lê o conteúdo de texto de um File', async () => {
    const file = new File(['conteúdo do arquivo'], 'x.txt', { type: 'text/plain' });

    await expect(FilePackageService.readFileAsText(file)).resolves.toBe('conteúdo do arquivo');
  });
});

describe('downloadBlob', () => {
  it('cria o link, clica, remove do DOM e revoga a URL', async () => {
    const criarUrl = vi.fn(() => 'blob:falsa');
    const revogarUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: criarUrl, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revogarUrl, configurable: true });
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    FilePackageService.downloadBlob(new Blob(['conteudo']), 'arquivo.txt');

    expect(criarUrl).toHaveBeenCalledTimes(1);
    expect(clique).toHaveBeenCalledTimes(1);
    // o link temporário não fica pendurado no documento
    expect(document.querySelectorAll('a[download="arquivo.txt"]').length).toBe(0);
  });
});
