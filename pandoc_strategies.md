# Análise das Estratégias do Pandoc para Leitura de Arquivos DOCX

Abaixo estão documentadas as principais abordagens, funções e estruturas utilizadas pelo **Pandoc** (famoso conversor de documentos escrito em Haskell) para processar arquivos `.docx`. O objetivo é extrair ideias arquiteturais valiosas que podem ser implementadas no nosso projeto em TypeScript, substituindo o Mammoth e simplificando a base de código.

## 1. Arquitetura em Fases Desacopladas

O Pandoc não converte diretamente o XML do DOCX para o formato de saída (como HTML ou Markdown). Ele utiliza uma arquitetura de duas fases:
1. **Parser (Leitura)**: Lê o XML bruto (`document.xml`) e o transforma em uma Árvore de Sintaxe Abstrata (AST) intermediária específica para DOCX.
2. **Combinação/Transformação**: Pega essa AST intermediária, limpa as redundâncias e a transforma na AST universal do Pandoc, resolvendo heranças, numeração e formatação limpa.

### Benefício para o nosso projeto:
No cenário atual (usando Mammoth + XML), temos heurísticas textuais complexas tentando "adivinhar" o que pertence a quê. Adotar uma AST intermediária tipada para o nosso conversor vai eliminar mais de 600 linhas de heurísticas (`cleanNorm`, `findDocxP`).

---

## 2. Estrutura de Dados Intermediária (A AST Tipada)

No arquivo `Parse.hs`, o Pandoc modela os blocos do Word de forma rigorosa:

```haskell
-- Estruturas baseadas no modelo do Pandoc
data BodyPart 
  = Paragraph ParagraphStyle [ParPart]
  | Heading Int ParaStyleName ParagraphStyle (Maybe Level) [ParPart]
  | ListItem ParagraphStyle Text Text Bool (Maybe Level) [ParPart]
  | Tbl (Maybe Text) Text TblGrid TblLook [Row]
  | HRule
```

### Por que isso é útil?
A tipagem rígida diferencia **Títulos**, **Listas** e **Parágrafos** logo no momento da leitura, resolvendo a maior ambiguidade do Word (onde Títulos numerados e Listas usam a mesma tag `<w:numPr>`).

---

## 3. Estratégias e Nomes de Funções Chave do Pandoc

### A. `elemToBodyPart` (Resolução do Tipo de Bloco)
Essa função lê o parágrafo `<w:p>` e define seu tipo:
- **Títulos (`Heading`)**: Checa se o estilo do parágrafo no `styles.xml` tem a tag `<w:outlineLvl>` ou se o nome base indica um título. Se for, ele é forçado como `Heading`, *mesmo que possua numeração* (evitando misturar títulos do documento com itens de lista).
- **Itens de Lista (`ListItem`)**: Se não é Título e tem a tag `<w:numPr>` (com `numId` válido), vira item de lista.
- **Parágrafos (`Paragraph`)**: Qualquer outro bloco cai no fallback de parágrafo.

**Nosso Contexto**: No documento de vocês (ex: `modelo-de-termo-de-referencia...docx`), os estilos usados como `<w:pStyle w:val="Nivel01"/>`, `<w:pStyle w:val="Nvel2-Opcional"/>` precisam de um mapeamento claro. Usar uma função equivalente ao `elemToBodyPart` em TypeScript vai direcionar esses estilos automaticamente para a estrutura correta (Seção vs. Texto Comum).

### B. `smushInlines` / `Combine.hs` (Fusão de Formatações em Linha)
No Word, o negrito ou itálico de uma frase não engloba toda a frase em uma única tag. Eles vêm divididos em múltiplos blocos `<w:r>` (runs):
- Run 1: `{ bold: true, italic: true }` -> "Texto"
- Run 2: `{ bold: false, italic: true }` -> " continuado"

Se apenas fizermos mapeamento 1-para-1, geraremos um HTML feio (ex: `<b><i>Texto</i></b><i> continuado</i>`). A função `smushInlines` do Pandoc percorre a matriz de "Runs", calcula quais formatações (negrito/itálico) são compartilhadas por Runs adjacentes e "envelopa" todos de uma vez (gerando `<i><b>Texto</b> continuado</i>`).

### C. `blocksToBullets` / `Lists.hs` (Construção Hierárquica de Listas)
O XML do Word não tem tags de lista aninhadas como o HTML (`<ul> <li> <ul>`). Em vez disso, ele tem uma lista "plana" de parágrafos, cada um dizendo apenas seu nível (ex: `<w:ilvl w:val="1"/>`).
- A estratégia do Pandoc é: emitir listas de forma plana durante a leitura, criando uma lista de `ListItem`.
- Depois, a função **`blocksToBullets`** empilha esses itens, agrupando-os hierarquicamente com base em seus atributos `numId` e `ilvl`, criando sub-listas reais sem que a rotina principal de parser tenha que lidar com o estado aninhado.

---

## 4. Análise Específica do Documento do Projeto (O ".docx" enviado)

Analisando os nós cruciais extraídos do arquivo `modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx`, notamos:
1. **Nomenclatura Proprietária de Estilos:**
   A maioria da hierarquia semântica está amarrada aos nomes de estilos, não aos estilos nativos (Heading 1). Foram observados:
   - `<w:pStyle w:val="Nivel01"/>`
   - `<w:pStyle w:val="Nvel2-Opcional"/>`
   - `<w:pStyle w:val="Nvel3-Opcional"/>`
   - `<w:pStyle w:val="ou"/>`
   
2. **Regras Explícitas de Numeração Desativada:**
   O DOCX contém marcações que cancelam explicitamente numerações via:
   - `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>`
   No padrão OOXML, `numId=0` significa **remover a numeração de lista ou tópico** para aquele parágrafo específico, independentemente do que o Estilo diga. Isso é vital para as assinaturas ou datas.

### 5. Plano de Implementação Sugerido em TypeScript

Para aplicar o aprendizado do Pandoc e remover o Mammoth do projeto:

1. **Definir Tipos AST:**
   ```typescript
   type DocxRun = { text: string; b?: boolean; i?: boolean; u?: boolean; strike?: boolean };
   type DocxParagraph = { type: 'p' | 'h' | 'li', level: number, numId?: string, ilvl?: string, style: string, runs: DocxRun[] };
   ```

2. **Criar a `elemToBodyPart` em JS:**
   Percorrer linearmente o `document.xml`. Em vez de tentar cruzar com o Mammoth, criamos os `DocxParagraph` direto do XML. Olhando o `<w:pStyle>` ou a `<w:numPr>`, definimos o tipo do nó.
   Se tiver `numId=0`, limpamos qualquer tag de lista herdada.

3. **Criar a `smushInlines` em JS:**
   Função de 30 linhas que agrupa a formatação dos textos para gerar as tags `<b>`, `<i>` e `<u>` perfeitamente, usando o próprio nó `<w:rPr>`.

4. **Hierarquia:**
   Uma vez gerado o Array linear de AST, processamos ele para agrupar os itens em Seções e Parágrafos (assim como o Pandoc faz no `blocksToBullets`).

**Conclusão**: Adotar essa arquitetura garante um conversor 100% determinístico e leve, livrando o projeto da complexidade e dos eventuais bugs originados pelo "casamento" forçado do Mammoth com a leitura de XML nativo.
