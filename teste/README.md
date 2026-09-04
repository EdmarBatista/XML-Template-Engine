# Instruções de Teste e Validação

Este arquivo contém as observações e regras para os testes de conversão, conforme solicitado explicitamente:

1. **Geração do XML a partir do DOCX**:
   - Ocorre via script automatizado ou interface (chamando o conversor nativo OpenXML em Node.js/TypeScript).
   - O arquivo DOCX de referência é lido diretamente do arquivo OpenXML (`word/document.xml`, `word/styles.xml`, etc.).
   - O XML gerado é salvo na pasta `teste/output.xml` (e eventuais dados de formulário em `teste/output_json.json`).

2. **Fluxo de Execução com Puppeteer (`teste/gerar.js`)**:
   - Certifique-se de que o frontend da aplicação está em execução local (porta 3000, `http://localhost:3000`).
   - Execute o script de teste com:
     ```bash
     npx tsx teste/gerar.js
     ```
   - O script executa as seguintes etapas:
     1. Converte o arquivo DOCX modelo (`modelo-de-termo-de-referencia-...docx`) diretamente para `teste/output.xml`.
     2. Inicia o navegador headless via Puppeteer.
     3. Acessa a aplicação local (`http://localhost:3000`).
     4. Envia o arquivo XML gerado (`teste/output.xml`) para o campo de upload da aplicação (simulando a ação do usuário no frontend).
     5. Aguarda a renderização completa do documento e o cálculo de todas as numerações dinâmicas.
     6. Extrai o conteúdo em HTML renderizado para `teste/output_puppeteer.html`.
     7. Extrai o conteúdo em texto plano renderizado (com todos os prefixos e numerações calculados) para `teste/output_puppeteer.txt`.

3. **Comparação de Numeração e Validação**:
   - Comparar a numeração e a sequência textual de `teste/output_puppeteer.txt` com o arquivo de referência `teste/pdf_texto.txt`.
   - Verificar se os níveis hierárquicos principais (1, 2, 3, 4, 5, 6, 7, etc.) e subníveis (1.1, 1.2, 4.1, 7.1, 7.2, 7.3.1, etc.) estão devidamente sincronizados e sem saltos indevidos.

**IMPORTANTE:** Este arquivo (README.md) NÃO DEVE SER MODIFICADO futuramente, a não ser que haja uma solicitação explícita para isso.

---

# Especificações de Conversão Word -> XML

As regras definidas e consolidadas para a conversão de documentos DOCX para a estrutura XML do sistema são:

1. **Parágrafos Limpos**:
   - As tags `<p>` não devem receber atributos de `nivel` (ex: `nivel="3"`). Elas devem ser apenas `<p>Texto</p>`.
   - Fica **estritamente banido** o uso de atributos como `nivel="..."` e `numerado="false"` em todas as tags `<p>`.
   - Todos os parágrafos devem ser gerados puramente como `<p>Conteúdo...</p>`, preservando apenas formatações inline (`<b>`, `<i>`, `<u>`, `<s>`).

2. **Seções de Títulos (Headings)**:
   - A tag `<secao>` só deve conter o atributo `titulo` (ex: `<secao titulo="...">`) quando o texto de origem for um **título real do Word** (estilos de *Heading* 1, 2, 3, etc.).
   - Parágrafos comuns que sejam extensos ou agrupamentos de texto normais **nunca** devem gerar um `<secao titulo="parágrafo inteiro...">`.

3. **Agrupamento de Seções e Subníveis**:
   - **Não deve ser criada uma nova `<secao>` para cada parágrafo**. Parágrafos adjacentes que pertencem ao mesmo nível hierárquico devem ser agrupados como tags `<p>` irmãs dentro da mesma `<secao>`.
   - Uma nova `<secao>` aninhada só será criada quando for necessário descer um nível (criar um subnível de lista/tópico).
   - Uma `<secao>` do mesmo nível só será fechada e reaberta se houver uma alteração na propriedade de numeração (ex: de texto normal não numerado para uma lista numerada).

4. **Preservação de Dados de Numeração**:
   - O texto original (e suas numerações geradas pelo Word) extraído via HTML/Puppeteer será usado para testar e validar o conversor, garantindo que a renderização visual respeite a indentação e os prefixos numéricos.

5. **Conversão Nativa Direta (OpenXML -> XML)**:
   - Leitura direta dos arquivos XML internos do arquivo DOCX (`word/document.xml`, `word/styles.xml`, `word/numbering.xml`, `word/comments.xml`).
   - Eliminação completa de qualquer etapa intermediária de HTML e descontinuação definitiva da biblioteca Mammoth.

6. **Remoção de `numero="X"` nas `<secao>` (Hierarquia Pura)**:
   - Nenhuma tag `<secao>` deve conter o atributo forçado `numero="..."` (ex.: banido `numero="7"`).
   - A numeração de capítulos e subcapítulos confia puramente na ordem hierárquica automática sequencial calculada pelo renderizador do frontend (1, 2, 3... e 1.1, 1.2...).
   - Prefixos numéricos digitados manualmente no início de títulos do Word (ex.: `"7. CRITÉRIOS..."`) são limpos do atributo `titulo="..."` para evitar duplicação na tela.

7. **Uso de `<secao numerar="false">` para Elementos Especiais**:
   - Conectivos isolados (ex.: "OU", "E", "OU:"), fórmulas matemáticas (ex.: `LG = ...`, `SG = ...`), notas explicativas, observações e alíneas/incisos manuais (ex.: "a)", "b)", "i)", "ii)" digitados sem numeração decimal automática do Word) devem ser agrupados dentro de `<secao numerar="false">`.
   - Isso impede que conectivos, fórmulas ou alíneas recebam numeração sequencial decimal indevida de parágrafo/seção (ex.: transformando alíneas em 9.7, 9.8, etc.), garantindo que os subitens 9.6.1, 9.6.2, 9.6.3 e os itens subsequentes 9.7, 9.8 mantenham a hierarquia original do documento.

8. **Alinhamento e Tratamento de Subtítulos (Preservação de Nível de Tópicos)**:
   - Parágrafos estilizados como subtítulo, sem numeração (`SemNum`, `SemBlack`, `subtitle`, `numId="0"`) ou cabeçalhos de tópicos devem ser representados como `<subtitulo nivel="X" alinhamento="esquerda">...</subtitulo>` (ex.: `nivel="2"`).
   - O atributo `nivel="X"` preserva a hierarquia de tópicos do Word (`w:outlineLvl`), garantindo que tanto na renderização visual quanto na exportação para Word (.docx) o elemento receba o nível de cabeçalho correspondente (`heading` e `outlineLevel`), aparecendo no Painel de Navegação do Word em vez de se degradar para corpo de texto comum.

9. **Conversão Algorítmica Completa de Numerais Romanos e Letras (`formatNumber`)**:
   - A função `formatNumber` utiliza conversão algorítmica matemática completa (`toRoman` de 1 a 3999 e `toLetter` alfabético sequencial) para `lowerRoman`, `upperRoman`, `lowerLetter` e `upperLetter`.
   - Isso elimina qualquer dependência de arrays estáticos limitados a 10 itens, suportando listas e incisos de qualquer dimensão.

10. **Suporte Nativo a Células Mescladas em Tabelas (`colspan` e `rowspan`)**:
    - O conversor extrai nativamente `w:gridSpan` (mesclagem horizontal/colspan) e `w:vMerge` (mesclagem vertical/rowspan).
    - Células verticais continuadas (`isMergedContinuation: true`) são absorvidas pela célula de origem (`rowspan="N"`), preservando a geometria correta da tabela sem colunas duplicadas.
    - Fórmulas matemáticas estruturadas em tabela (como `LG =`, `SG =`, `LC =`) mantêm integralmente numerador e denominador, emitidas como tabelas de layout e protegidas em `<secao numerar="false">`.

11. **Não-Numeração de Blocos de Assinatura, Encerramento e Datação**:
    - Linhas contendo `[Local], [dia] de [mês] de [ano].`, linhas de assinatura sublinhadas (`______`), cargos/nomes de servidores e representantes legais são identificadas como blocos especiais de encerramento (`specialKind: 'assinatura'`).
    - Esses blocos são inseridos em `<secao numerar="false">`, impedindo a criação de números artificiais (ex.: `12.2.`, `12.3.`, `12.4.`) e preservando a formatação limpa para preenchimento e assinatura.

12. **Reinício de Numeração em Capítulos e Anexos (`reiniciar="true"`) e Exportação Word**:
    - Quando um novo capítulo/seção reinicia a contagem (ex.: início de "FORMALIZAÇÃO DA CONTRATAÇÃO" após um ANEXO, ou via sobrescrita `w:lvlOverride` com `w:startOverride`), o gerador de XML emite o atributo `<secao titulo="..." reiniciar="true">`.
    - No visualizador (`DocumentSectionNode`), o atributo `reiniciar="true"` reseta o contador interno de capítulos para 1 (gerando `1.`, `1.1.`, `1.2.`, etc.) e propaga `data-word-reiniciar="true"`.
    - Na exportação para Word (`wordExporter.ts`), o reinício é respeitado tanto na extração do texto renderizado quanto no motor de numeração nativo do Word, que instancia uma nova definição de lista sequencial (`edmsecoes_N`) com `start: 1`, garantindo perfeita paridade visual e estrutural entre o conversor, a tela e o arquivo `.docx` exportado.

