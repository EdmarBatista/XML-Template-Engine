# Instruções de Teste e Validação

Este arquivo contém as observações e regras para os testes de conversão, conforme solicitado explicitamente:

1. A geração do XML a partir do DOCX ocorre normalmente via script (ex: chamando a função de conversão no Node.js).
2. Para transformar o documento em TXT e comparar a numeração, o fluxo correto é:
   - Abrir o Puppeteer.
   - Acessar a aplicação local (frontend).
   - Arrastar/Enviar o arquivo DOCX para a aplicação (simulando a ação do usuário).
   - Extrair o HTML gerado pela aplicação, o qual já conterá as numerações renderizadas.
   - Converter este HTML extraído em TXT.
3. Por fim, comparar a numeração deste novo TXT com o TXT antigo (ex: \`pdf_texto.txt\`).

**IMPORTANTE:** Este arquivo (README.md) NÃO DEVE SER MODIFICADO futuramente, a não ser que haja uma solicitação explícita para isso.
# Especificações de Conversão Word -> XML

As regras definidas para a conversão de documentos DOCX para a estrutura XML do sistema são:

1. **Parágrafos Limpos**:
   - As tags `<p>` não devem receber atributos de `nivel` (ex: `nivel="3"`). Elas devem ser apenas `<p>Texto</p>`.

2. **Seções de Títulos (Headings)**:
   - A tag `<secao>` só deve conter o atributo `titulo` (ex: `<secao titulo="...">`) quando o texto de origem for um **título real do Word** (estilos de *Heading* 1, 2, 3, etc.).
   - Parágrafos comuns que sejam extensos ou agrupamentos de texto normais **nunca** devem gerar um `<secao titulo="parágrafo inteiro...">`.

3. **Agrupamento de Seções e Subníveis**:
   - **Não deve ser criada uma nova `<secao>` para cada parágrafo**. Parágrafos adjacentes que pertencem ao mesmo nível hierárquico devem ser agrupados como tags `<p>` irmãs dentro da mesma `<secao>`.
   - Uma nova `<secao>` aninhada só será criada quando for necessário descer um nível (criar um subnível de lista/tópico).
   - Uma `<secao>` do mesmo nível só será fechada e reaberta se houver uma alteração na propriedade de numeração (ex: de texto normal não numerado para uma lista numerada).

4. **Preservação de Dados de Numeração**:
   - O texto original (e suas numerações geradas pelo Word) extraído via HTML/Puppeteer será usado para testar e validar o conversor, garantindo que a renderização visual respeite a indentação e os prefixos numéricos.
