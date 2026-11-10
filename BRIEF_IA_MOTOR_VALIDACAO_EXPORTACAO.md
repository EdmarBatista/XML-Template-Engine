> ## ⚠️ DOCUMENTO SUPERADO — NÃO IMPLEMENTAR
>
> Este brief foi escrito quando a implementação dos quatro recursos ainda era desejada:
> atributo `obrigatorio`, atributo `mensagem_pendencia`, função `qtde_linhas()`, função `tem_linhas()`,
> além do bloqueio de exportação por pendências.
>
> **A decisão posterior do usuário foi a oposta:** esses quatro recursos **não serão adotados** e foram
> **removidos** do repositório `XML-Template-Engine`. O requisito vigente é o documento
> `INSTRUCOES_PROXIMA_REVISAO_TR_AGU_PACOTE8_ENGINE_E_CONTROLES.md` (Parte A).
>
> Este arquivo é mantido apenas como **registro histórico**. Nada do que está descrito abaixo deve ser
> implementado; onde houver conflito, prevalece a decisão atual (remoção dos recursos).
>
> **Ressalva:** a correção do bug de parênteses em `<if expr>` (item 4 deste brief) é **independente** e foi
> preservada por decisão do usuário — ela continua válida e deve permanecer no motor.

# Brief 1 — Motor (XML Template Engine): validação antes da exportação

**Repositório:** `github.com/EdmarBatista/XML-Template-Engine` · branch `main` · commit de referência `bc42009`
**Não mexa no template da AGU.** Este brief cobre apenas o aplicativo (motor). O XML/JSON do template é tratado por outra frente.

## Por que

O template declara campos, condições e texto. Ele consegue **esconder** blocos condicionais, mas não consegue exigir um campo só em certas condições, não sabe quantas linhas uma tabela tem e não pode impedir uma exportação com pendência. Resultado real, com o template de TR da AGU: o documento afirma "serviço comum" quando o campo de engenharia está **vazio** (ninguém decidiu nada) e imprime tabelas com cabeçalho e zero linhas.

São quatro mudanças, todas aditivas. Nenhuma pode alterar a saída dos templates atuais.

---

## 1. Obrigatoriedade condicional de campo

### Estado atual

| Arquivo | Situação |
|---|---|
| `src/types.ts` (l. 91-105) | `FieldMetadata` tem `condicao?: string` (l. 102). Não existe noção de obrigatoriedade. |
| `src/utils/xmlParser.ts` (l. 203) | `tiposCampo = ['input','select','textarea','number','date','checkbox','radio','tabela']`. |
| `src/utils/xmlParser.ts` (`processarItemFormulario`, l. ~362-390) | `<if>` em volta de campo vira `herdaExpr` e é gravado em `campos[id].condicao`. |
| `src/utils/validacao.ts` (`validarCampo`, l. ~68) | Primeiro teste: `if (!v) return { valido: true }`. **Campo vazio nunca é inválido**; só há validação de formato (e-mail, CPF, CNPJ, CEP, telefone). |
| `src/components/Sidebar.tsx` (`campoVisivel`, l. ~190) | Usa `condicao` apenas para esconder. Não há indicador de obrigatório. |

### Fazer

1. Aceitar o atributo opcional `obrigatorio="<expr>"` em `input`, `number`, `date`, `textarea`, `select`, `radio`, `checkbox` e `tabela` do `<formulario>`:
   - `obrigatorio="true"` → sempre obrigatório;
   - outra expressão → avaliada com `avaliarExpressao(expr, dados)`;
   - ausente ou `false` → comportamento idêntico ao atual.
2. Aceitar `mensagem_pendencia="<texto>"` para substituir a mensagem padrão.
3. `xmlParser`: gravar os dois em `campo.obrigatorio` e `campo.mensagemPendencia` (novos campos opcionais em `FieldMetadata`).
4. `Sidebar`: marcação visual (asterisco no rótulo e realce de borda) quando o campo é obrigatório e está vazio.
5. Campo escondido pela própria `condicao` **não** gera pendência: só se exige o que está visível.
6. **Nunca preencher automaticamente** e **nunca** tratar vazio como valor válido em campo obrigatório.

### Exemplo de template que passará a funcionar

```xml
<if expr="tipo_contratacao == 'serviços'">
  <select id="servico_engenharia" label="Serviço de engenharia?"
          obrigatorio="tipo_contratacao == 'serviços'"
          mensagem_pendencia="Selecione sim ou não: ausência de escolha não equivale a serviço não-engenharia.">
    <option valor="sim">Sim, serviço de engenharia</option>
    <option valor="nao">Não, serviço comum não-engenharia</option>
  </select>
</if>
```

---

## 2. Contagem de linhas na linguagem de expressão

### Estado atual

`src/utils/expressionEvaluator.ts`:

- `avaliarExpressao` (l. ~113) divide em `||`, `&&`, `!` e delega a `avaliarComparacao`;
- `avaliarComparacao` (l. ~27) só reconhece `^([a-zA-Z_]\w*)\s*(==|!=|>=|<=|>|<)\s*(.+)$`;
- não há funções nem acesso a arrays. **Medido** no commit `bc42009`, com `etapas_execucao` contendo 2 linhas e `incluir_etapas_execucao = true`:

| Expressão | Resultado hoje |
|---|---|
| `incluir_etapas_execucao == true` | `true` |
| `incluir_etapas_execucao == true && tem_linhas('etapas_execucao')` | **`false`** |
| `incluir_etapas_execucao == true && qtde_linhas('etapas_execucao') > 0` | **`false`** |
| `etapas_execucao.length > 0` | **`false`** |

Ou seja: hoje a função é aceita silenciosamente e devolve `false`, o que **esconde o bloco inteiro**. Por isso esta é a mudança que destrava o problema da tabela vazia no próprio template.

### Fazer

Suportar em `<if expr>` (no `<formulario>` e no `<conteudo>`):

- `qtde_linhas('<id>')` → número de linhas **com ao menos uma célula não vazia** (linha em branco criada pelo editor não conta);
- `tem_linhas('<id>')` → equivalente a `qtde_linhas('<id>') > 0`.

Regras de retorno:

| Situação | Retorno |
|---|---|
| `<tabela>` com linhas preenchidas | quantidade de linhas não vazias |
| `<tabela>` vazia ou id inexistente | `0` |
| `<input tipo="lista_csv">` | quantidade de itens |
| campo escalar preenchido | `1` |
| campo escalar vazio | `0` |

- avaliar a função **antes** da comparação escalar;
- não deixar a função cair no regex de comparação (é o que acontece hoje);
- atualizar `extrairVariaveisDaExpressao` (l. ~132) para não tratar `qtde_linhas`/`tem_linhas` como nome de campo;
- o resto da linguagem permanece igual.

---

## 3. Bloqueio da exportação com pendência

### Estado atual

| Arquivo | Situação |
|---|---|
| `src/components/SidebarToolbar.tsx` | `onSaveZip` (l. 116), `onExportWord` (l. 179), `onExportPdf` (l. 183) exportam direto, sem verificação. |
| `src/hooks_App/useDocumentExporters.ts` | Concentra a geração de Word/PDF. |

### Fazer

1. Novo módulo `src/utils/pendencias.ts`:

```ts
export type Pendencia = {
  id: string;            // id do campo
  rotulo: string;        // label do campo
  grupo: string;         // título do grupo
  tipo: 'campo_obrigatorio' | 'tabela_vazia';
  mensagem: string;
};

export function coletarPendencias(
  campos: Record<string, FieldMetadata>,
  dados: DadosDocumento
): Pendencia[];
```

2. Regras de coleta:
   - campo cujo `obrigatorio` avaliou `true` e cujo valor está vazio;
   - vazio = `''`, `undefined`, `null`, `[]`, ou tabela sem nenhuma linha preenchida;
   - ignorar campo escondido pela própria `condicao`;
   - não duplicar: obrigatório **e** tabela vazia → uma pendência, tipo `tabela_vazia`.
3. `SidebarToolbar`: antes de Word, PDF ou pacote, chamar `coletarPendencias`. Com lista não vazia, abrir diálogo com grupo, campo e mensagem, e **não exportar**. Oferecer ação "ir para o campo".
4. Contador de pendências visível na barra lateral, atualizado a cada alteração de dados.
5. Nunca exportar silenciosamente. Se existir "exportar mesmo assim", tem de ser explícito na interface.

---

## 4. Bug — parênteses em `<if expr>`

`avaliarComparacao` faz `expr.trim().replace(/^\((.*)\)$/, '$1')` e em seguida aplica o regex de comparação simples. O operando entre parênteses perde os delimitadores e passa a ser comparado como string inteira, devolvendo `false` **mesmo quando é verdadeiro**.

Expressão testada:

```
tipo_contratacao == 'obras' || (tipo_contratacao == 'serviços' && servico_engenharia == 'sim')
```

| `tipo_contratacao` | `servico_engenharia` | com parênteses | sem parênteses |
|---|---|---|---|
| `obras` | `''` | `true` | `true` |
| `serviços` | `sim` | **`false`** — errado | `true` |
| `serviços` | `nao` | `false` | `false` |
| `serviços` | `''` | `false` | `false` |

**Fazer:** em `avaliarExpressao`, se a expressão estiver inteiramente envolvida por parênteses, removê-los (respeitando aspas) **antes** de dividir por `||`/`&&` e recursar. Parênteses nunca devem chegar ao regex de comparação escalar.

---

## 5. Compatibilidade

- Tudo é aditivo: template que não usa `obrigatorio`, `mensagem_pendencia`, `qtde_linhas` ou `tem_linhas` deve produzir saída **idêntica** à atual.
- `condicao` não muda de semântica: esconder campo continua **não** apagando o valor em `dados`.
- Não renomear ids, tags, atributos ou funções existentes.
- `src/utils/xmlLinter.ts` valida apenas nomes de tag (`ALLOWED_TAGS`), não atributos — confirme se algo mais precisa de liberação.
- `npm run lint` (`tsc --noEmit`) e `npm test` (`vitest run`) verdes, com casos novos em `src/utils/expressionEvaluator.test.ts` e `src/utils/pendencias.test.ts`.

---

## 6. Critérios de aceite

Casos reais do TR da AGU. Cada linha deve virar teste automatizado.

### 6.1 Obrigatoriedade condicional

`servico_engenharia` com `obrigatorio="tipo_contratacao == 'serviços'"`:

| Cenário | Esperado |
|---|---|
| `tipo_contratacao = obras` (campo oculto) | nenhuma pendência; exporta |
| `tipo_contratacao = serviços`, `servico_engenharia = ''` | pendência; exportação bloqueada |
| `tipo_contratacao = serviços`, `servico_engenharia = sim` | exporta |
| `tipo_contratacao = serviços`, `servico_engenharia = nao` | exporta |

### 6.2 Tabela opcional

`etapas_execucao` com `obrigatorio="incluir_etapas_execucao == true"`:

| Cenário | Esperado |
|---|---|
| `incluir_etapas_execucao = false`, tabela vazia | nenhuma pendência |
| `incluir_etapas_execucao = true`, 1 linha preenchida | exporta |
| `incluir_etapas_execucao = true`, tabela vazia | pendência; bloqueia |
| `incluir_etapas_execucao = true`, só linha em branco | pendência (linha em branco não conta) |

### 6.3 Impressão condicionada à contagem

| Expressão | Dados | Saída |
|---|---|---|
| `incluir_etapas_execucao == true && tem_linhas('etapas_execucao')` | marcado + 0 linhas | bloco não impresso, nem cabeçalho |
| `incluir_etapas_execucao == true && tem_linhas('etapas_execucao')` | marcado + 2 linhas | bloco completo |
| `qtde_linhas('materiais_equipamentos') > 2` | 3 linhas | `true` |
| `qtde_linhas('campo_inexistente') > 0` | — | `false`, sem exceção |

### 6.4 Parênteses

Reproduzir a tabela do item 4: a forma com parênteses tem de devolver o mesmo que a equivalente sem parênteses, nas quatro combinações.

### 6.5 Não regressão

- Template da AGU atual (186 campos, 205 `<if>`, 25 `<foreach>`), que **não** usa os recursos novos: Word/PDF e pacote idênticos aos de hoje.
- Nenhum valor de campo oculto pode ser apagado ao trocar a opção que controla o `<if>`.

---

## 7. Fora de escopo

- Não alterar DOCX/PDF, numeração de seções, estilos, nem o formato do pacote (XML + JSON).
- Não criar preenchimento automático de campo.
- Não alterar `condicao`, `<if>` ou `<foreach>` além do item 4.

---

## 8. Aviso de sequência (importante)

Enquanto esta entrega não estiver publicada, **não** use `qtde_linhas`/`tem_linhas` em template nenhum: hoje a expressão devolve `false` e o bloco desaparece sem erro. O atributo `obrigatorio` é inofensivo antes da hora (o motor ignora atributo desconhecido), mas só passa a valer depois desta entrega.
