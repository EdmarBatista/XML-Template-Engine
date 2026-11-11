# Instruções para a IA responsável pelo XML-Template-Engine

**Repositório:** https://github.com/EdmarBatista/XML-Template-Engine  
**Referência de trabalho:** pacote de análise do TR AGU recebido em 09/11/2026.  
**Escopo deste documento:** exclusivamente o código-fonte, os testes e a documentação do XML-Template-Engine.

> **Separação de responsabilidades:** esta IA não deve editar o XML do TR AGU, os JSONs do template, os ZIPs do template ou os grupos/campos do formulário. Essas tarefas pertencem à outra IA.

## 1. Decisão do usuário

O usuário decidiu não utilizar e quer remover do próprio XML-Template-Engine os quatro recursos abaixo:

1. atributo de campo `obrigatorio`;
2. atributo de campo `mensagem_pendencia`;
3. função de expressão `qtde_linhas()`;
4. função de expressão `tem_linhas()`.

Também devem ser removidos os mecanismos que existam exclusivamente para suportar essas funcionalidades: coleta e apresentação de pendências, marcações visuais específicas e bloqueio de exportação por essas pendências.

**Não substituir por outro mecanismo equivalente.** O comportamento anterior deve ser restaurado quanto à obrigatoriedade, às mensagens de pendência, à contagem de linhas e ao bloqueio de exportação por esses motivos.

## 2. Primeiro: verificar o estado real do GitHub

Antes de editar qualquer arquivo:

1. Consultar o branch `main` e registrar o SHA completo do HEAD.
2. Consultar os commits recentes e identificar se as alterações descritas no relatório do pacote 8 realmente estão publicadas nesse branch.
3. Comparar o código efetivo do `main` com o relatório `RELATORIO_ALTERACOES_PACOTE8_ENGINE_E_CONTROLES.md` e com `VERIFICACAO_INDEPENDENTE_PACOTE8.md`.
4. Não assumir que o clone local, um commit antigo ou o relatório de outra IA representa o estado remoto atual.
5. Registrar no resultado o SHA do commit efetivamente analisado e a origem do clone utilizado.

### Divergência que precisa ser resolvida

O relatório de alterações do pacote 8 declara que os quatro recursos foram removidos, que o módulo de pendências foi excluído e que foram executados lint, 333 testes e build.

Entretanto, a verificação independente disponível informa que o clone examinado estava no commit `bc42009`, sem referências aos quatro recursos e sem o módulo de pendências. Portanto, nesse clone não havia evidência de uma remoção efetiva por diff. A mesma verificação encontrou uma falha no tratamento de parênteses.

**Não repetir essas declarações sem nova verificação.** Determinar o que está realmente no `main`, o que foi efetivamente alterado e quais testes podem ser reproduzidos.

## 3. Remoção seletiva dos quatro recursos

Localizar todas as referências ativas, considerando os nomes em XML, TypeScript, interface, documentação e testes.

Verificar, conforme a estrutura atual do projeto:

- tipos, interfaces e schemas de campos que declarem `obrigatorio` ou `mensagem_pendencia`;
- parser/leitor de XML e metadados dos controles;
- avaliador de expressões e registro de funções disponíveis;
- serviço/módulo de coleta de pendências;
- componentes de interface que exibam alertas, contadores ou marcações específicas dessas pendências;
- fluxo de exportação Word, PDF, JSON e ZIP;
- testes, mocks, fixtures e exemplos XML;
- README e demais documentos de uso.

### Resultado esperado

- O motor não interpreta `obrigatorio` nem `mensagem_pendencia` como recursos especiais.
- `qtde_linhas()` e `tem_linhas()` não fazem parte das funções reconhecidas pelo avaliador.
- Não existe coleta ou apresentação de pendências baseada nesses recursos.
- A exportação não é bloqueada por pendências criadas por esse mecanismo.
- Não há resíduos de código, imports, estado, componentes ou testes exclusivos dessas funcionalidades.
- A documentação deixa de apresentar esses quatro recursos como funcionalidades suportadas.

Se as funcionalidades já estiverem ausentes no HEAD atual, não criar uma remoção artificial nem produzir alterações sem necessidade. Nesse caso, documentar que o estado já atende ao pedido e concentrar-se nas demais tarefas deste documento.

## 4. Preservar recursos independentes

A remoção deve ser restrita. Não reverter commits inteiros nem remover funcionalidades que não dependam dos quatro recursos descartados.

Preservar:

- avaliação normal das expressões `<if>`;
- funcionamento de `<foreach>`;
- operadores de comparação, `&&` e `||`;
- suporte a parênteses e agrupamento lógico;
- controles `input`, `textarea`, `number`, `date`, `select`, `radio`, `checkbox` e `tabela`;
- validações de formato já existentes, como e-mail, CPF, CNPJ, CEP, telefone, datas e números;
- atributos de campos independentes, como `placeholder`, `descricao`, `rows`, `min`, `max` e `step`;
- exportação Word, PDF, JSON e ZIP;
- demais ajustes visuais e funcionais que não dependam do mecanismo removido.

Não introduzir validação obrigatória com outro nome, mensagens de pendência equivalentes ou bloqueio de exportação com a mesma finalidade.

## 5. Corrigir e testar o tratamento de parênteses

A verificação independente do pacote 8 informou que a correção citada no relatório (`removerParentesesExternos` ou equivalente) não estava presente no clone examinado. Também registrou falha para uma expressão equivalente a:

```text
tipo_contratacao == 'obras' || (tipo_contratacao == 'serviços' && servico_engenharia == 'sim')
```

No caso `tipo_contratacao = 'serviços'` e `servico_engenharia = 'sim'`, a expressão com parênteses deve resultar em `true`. Para `servico_engenharia = 'nao'`, deve resultar em `false`. Para `tipo_contratacao = 'obras'`, deve resultar em `true`, mesmo sem valor para `servico_engenharia`.

Investigar a causa no avaliador real e corrigir o parser sem remover os parênteses necessários à precedência lógica. A correção pode usar a função citada no relatório ou outra implementação correta; o requisito é o comportamento, não o nome da função.

Criar testes unitários para:

- expressões simples sem parênteses;
- expressões agrupadas com parênteses;
- precedência entre `&&` e `||`;
- parênteses aninhados, se suportados pela gramática;
- comparações com strings, booleanos e valores vazios;
- expressões reais usadas no template TR AGU.

Não simplificar ou retirar os parênteses do XML do TR como substituto para corrigir o motor. A linguagem de expressões deve funcionar corretamente.

## 6. Documentação

- Atualizar o README para refletir o comportamento real do motor.
- Remover instruções de uso dos quatro recursos descartados.
- Revisar exemplos, documentação de expressões e tipos/interfaces.
- Não apagar documentação de `placeholder`, `descricao`, `rows`, `min`, `max`, `step`, listas, tabelas ou outros controles independentes.
- Se houver briefs antigos que solicitem obrigatoriedade, mensagens de pendência, contagem de linhas ou bloqueio de exportação, marcá-los como superados ou removê-los do conjunto de instruções vigente.

## 7. Testes e critérios de aceite

Inspecionar `package.json` e o pipeline atual antes de escolher comandos. Executar os comandos reais do projeto para lint/typecheck, testes e build. O relatório de conclusão deve conter as saídas ou resumos verificáveis, não apenas afirmações.

Verificar:

1. XMLs sem os quatro recursos continuam sendo lidos normalmente.
2. As expressões condicionais com parênteses e sem parênteses funcionam corretamente.
3. `<foreach>` continua percorrendo listas CSV e tabelas.
4. Todos os tipos de controles existentes continuam renderizando e salvando os dados.
5. As validações de formato independentes continuam ativas.
6. Word, PDF, JSON e ZIP são exportados sem o bloqueio descartado.
7. A busca no código e na documentação não encontra referências ativas aos quatro recursos, exceto registro histórico explicitamente marcado como obsoleto.
8. Os testes e o build passam no mesmo commit que será apresentado como resultado.

## 8. Entrega desta IA

Entregar somente os resultados referentes ao motor:

- arquivos alterados e resumo das mudanças;
- confirmação do branch e SHA do commit analisado;
- confirmação do que foi removido ou já estava ausente;
- descrição da correção do avaliador de expressões;
- comandos efetivamente executados e resultados de lint, testes e build;
- commit publicado, caso tenha sido autorizado e realizado;
- limitações ou testes não executados.

**Não editar o template TR AGU.** A outra IA será responsável por manter compatibilidade do XML do TR com os recursos efetivamente disponíveis no motor.

## 9. Atualização de dependências e das libs de CDN

### 9.1 Regra de sincronia (a que mais causa defeito)

Três bibliotecas **não entram no bundle**: `pdfmake`, `docx` e `jszip` são carregadas por `<script>` no `index.html` e consumidas em `window`. Atualizar o `package.json` sem atualizar as tags deixa o app rodando a versão antiga — e a suíte de testes passa, porque em teste elas vêm do `node_modules`.

Toda atualização dessas três tem de tocar, **no mesmo commit**:

1. `package.json` — o range da dependência;
2. `index.html` — linhas ~36–41 (`pdfmake.min.js`, `vfs_fonts.js`, `docx` UMD, `jszip` do cdnjs);
3. `README.md` — tabela "Stack Tecnológica" e tabela "Dependência de rede".

Endereços a conferir antes de fixar (`<versao>` trocado):

- `https://cdn.jsdelivr.net/npm/pdfmake@<versao>/build/pdfmake.min.js` e `.../vfs_fonts.js`
- `https://unpkg.com/docx@<versao>/dist/index.umd.cjs`
- `https://cdnjs.cloudflare.com/ajax/libs/jszip/<versao>/jszip.min.js`

Checagem rápida: `curl -sIL -o /dev/null -w "%{http_code}" <url>` precisa dar `200`, e um `GET` (sem `-I`) deve informar tamanho plausível (página de erro do CDN também responde 200 em alguns casos).

### 9.2 Sequência

```bash
npm outdated --long           # Current / Wanted / Latest de cada pacote
npm update                    # aplica tudo dentro do range declarado
npm install -D pkg@^X.Y.Z     # majors, um a um, testando depois de cada um
npx tsc --noEmit
npm test
npm run build                 # tsc -b + vite build + zip_standalone.js
```

`npm run build` gera `app_standalone.html` e `app_standalone.zip` — são artefatos e estão no `.gitignore`; precisam ser regerados sempre que `index.html` ou o bundle mudarem.

### 9.3 O que ler no changelog antes de decidir

- **pdfmake**: a linha 0.3 trocou a API de callbacks por **Promises** (`createPdf(...).download()`/`getBlob()`/`getDataUrl()` são `async`). Passar callback na 0.3 nunca chama nada e dá a impressão de travamento — foi a origem de um falso diagnóstico de "exportação quebrada". Erros de stream só passaram a rejeitar as promises na **0.3.13**, e a **0.3.14** corrige o CVE-2026-119743 (cache de recursos por URL compartilhado entre documentos). Por isso: não voltar para a 0.2.x. Changelog local em `node_modules/pdfmake/CHANGELOG.md`.
- **docx**: o pacote não traz changelog; consultar as releases de `github.com/dolanmiu/docx`. Exemplos recentes: 9.15.2 corrigiu types que injetavam `glob` em `import.meta` (quebrava projetos Next), 9.15.3 é performance do `patchDocument`.
- **CVE**: se a atualização corrige vulnerabilidade, ela deixa de ser opcional e o commit deve citar o CVE.
- **`@types/*`**: majors são independentes do runtime e podem ficar atrás (`jsdom` está em 31 e `@types/jsdom` segue em 30.0.0 — a 31 não existe). Não forçar alinhamento.
- **vite / vitest / react / tailwind**: patch e minor costumam ser seguros; major exige suíte e build reais antes de commitar.

### 9.4 Smoke test das exportações (o build não cobre)

A suíte valida a definição entregue ao Word/PDF, não a execução das libs de CDN. Depois de mexer em `docx` ou `pdfmake`:

1. `npm run dev` e abrir o app;
2. no console do app, gerar um PDF mínimo e conferir os bytes:
   ```js
   const gen = window.pdfMake.createPdf({ content: ['abc'] });
   (await gen.getBlob()).size;   // > 0 (API Promise da 0.3)
   ```
3. conferir o Word: `window.docx.Packer.toBlob(new window.docx.Document({ sections: [{ children: [] }] }))` devolve um Blob;
4. exportar um documento real pela interface, em Word e em PDF.

### 9.5 Fechamento obrigatório

`npx tsc --noEmit`, `npm test`, `npm run build`, revisão do diff e commit citando as versões (e o CVE, quando houver). Registrar no relatório quais pacotes ficaram fora do range e por quê.

