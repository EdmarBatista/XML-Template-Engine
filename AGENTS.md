# Regras e Diretrizes do Projeto para Agentes de IA

## 1. Regra de Imutabilidade Estrita do README de Testes

> [!CAUTION]
> **PROIBIÇÃO ABSOLUTA DE EDIÇÃO DO ARQUIVO `teste/README.md`**
>
> - É **ESTRITAMENTE PROIBIDO** criar, editar, alterar ou sobrescrever o arquivo `teste/README.md` sob qualquer hipótese, seja via ferramentas de edição (`edit_file`, `multi_edit_file`, `create_file`), scripts ou comandos de terminal.
> - O arquivo `teste/README.md` é uma referência normativa de teste e especificação que **NUNCA DEVE SER MODIFICADO**, exceto se o usuário der uma ordem explícita, direta e inequívoca como *"edite o readme"* ou *"atualize o arquivo teste/README.md"*.
> - O agente NUNCA deve atualizar o `teste/README.md` por iniciativa própria para "documentar soluções", "resumir correções" ou "refletir implementações".

## 2. Fidelidade às Regras Técnicas de Conversão (DOCX -> XML)

As regras documentadas em `teste/README.md` devem ser rigorosamente consultadas e respeitadas pelo agente em todas as implementações:
- **Parágrafos Limpos (Regra 1)**: As tags `<p>` são sempre puras (`<p>Conteúdo...</p>`), sem atributos de formatação ou estado como `nivel="..."` ou `numerado="false"`. O uso de atributos em `<p>` é estritamente banido.
- **Elementos Especiais em `<secao numerar="false">` (Regra 7)**: Conectivos (ex.: "OU"), fórmulas matemáticas e notas explicativas não-numeradas devem ser encapsulados em `<secao numerar="false">` para não receberem numeração e não interromperem a contagem hierárquica dos parágrafos numerados subsequentes.
- **Títulos Reais e Subtítulos**: Apenas headings reais geram `<secao titulo="...">`. Subtítulos e títulos com numeração desativada no Word (`numId="0"`) devem ser tratados como `<subtitulo>` para preservar o capítulo aberto.
- **Numeração Hierárquica Pura**: Nenhuma tag `<secao>` deve emitir `numero="..."`. A numeração em tela é calculada dinamicamente pelo renderizador.
