// Entry for esbuild: exports nothing; this file is only to trigger bundling of the converter module.
// O conversor vive em src/docx/converter.ts. O caminho antigo (src/utils/docxToXmlConverter.ts)
// era a fachada de compatibilidade e foi removido.
import { converterDocxParaModeloXml } from '../src/docx/converter';
export { converterDocxParaModeloXml };
