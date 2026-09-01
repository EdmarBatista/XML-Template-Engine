import { verificarVariaveisXml } from './src/utils/xmlEditorCompletions';
import { catalogoCompletoTags } from './src/data/templates/catalogoCompletoTags';

const result = verificarVariaveisXml(catalogoCompletoTags.xml);
console.log("Usadas e nao declaradas:", result.usadasNaoDeclaradas);
