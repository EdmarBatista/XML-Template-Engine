import { criarModeloIntermediario, parseXmlDocument } from './src/utils/xmlParser';
import { DEFAULT_TEMPLATES } from './src/data/defaultTemplates';

let hasError = false;
for (const template of DEFAULT_TEMPLATES) {
    try {
        const doc = parseXmlDocument(template.xml);
        criarModeloIntermediario(doc);
        console.log(`[OK] ${template.id}`);
    } catch (err) {
        console.error(`[ERROR] ${template.id}:`, err.message);
        hasError = true;
    }
}
if (hasError) process.exit(1);
