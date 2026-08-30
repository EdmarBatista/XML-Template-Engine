import { JSDOM } from 'jsdom';
import { exportarParaWord } from './src/utils/wordExporter';
import { parseXmlDocument, criarModeloIntermediario } from './src/utils/xmlParser';
import { DEFAULT_TEMPLATES } from './src/data/defaultTemplates';

// We need to render the XML to HTML first, but our render logic is React based!
// So it's easier to just start the vite dev server, and puppeteer... wait, no puppeteer.
