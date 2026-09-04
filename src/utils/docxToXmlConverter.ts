/**
 * Fachada de compatibilidade.
 *
 * Em versões anteriores a conversão .docx → modelo XML ficava neste arquivo monolítico.
 * Foi movida para a pasta src/docx/ (em módulos com responsabilidade separada) para facilitar
 * manutenção e testes. Este arquivo apenas re-exporta a fachada pública e mantém o caminho de
 * import estável para os demais consumidores (ex.: App.tsx usa `./utils/docxToXmlConverter`).
 */
export { converterDocxParaModeloXml } from '../docx/converter';
