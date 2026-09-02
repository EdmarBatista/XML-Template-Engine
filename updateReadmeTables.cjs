const fs = require('fs');
let content = fs.readFileSync('README.md', 'utf-8');

const additionalTables = `
#### De Para (Word vs. XML)

Aqui está o paralelo exato do que você digita no Word e como o sistema compila estruturalmente no XML da aplicação:

| O que você digita no Word (DOCX) | O que o motor gera no Formulario XML | O que o motor gera no Conteúdo XML |
|:---|:---|:---|
| \`{{ Nome da Mãe }}\` | \`<input id="nome_da_mae" tipo="texto" rotulo="Nome da Mãe" />\` | \`<p>{{nome_da_mae}}</p>\` |
| \`{{ Valor \| moeda }}\` | \`<number id="valor" tipo="moeda" rotulo="Valor" />\` | \`<p>{{valor \| moeda}}</p>\` |
| \`{{ Nasc. \| data }}\` | \`<date id="nasc" rotulo="Nasc." />\` | \`<p>{{nasc \| data}}</p>\` |
| \`{{ Resumo \| longo }}\` | \`<textarea id="resumo" rotulo="Resumo" />\` | \`<p>{{resumo}}</p>\` |
| \`{{ UF \| select(AC, AL, AP) }}\` | \`<select id="uf" rotulo="UF"><option>AC</option>...</select>\` | \`<p>{{uf}}</p>\` |
| \`{{ CNH \| radio(Sim, Não) }}\` | \`<radio id="cnh" rotulo="CNH"><option>Sim</option>...</radio>\` | \`<p>{{cnh}}</p>\` |
| \`{{ if UF == 'SP' }}\` | *(Nenhum campo criado, apenas lógica)* | \`<if expr="uf == 'SP'">\` |
| \`{{ /if }}\` | *(Fechamento de condicional)* | \`</if>\` |
| \`{{ foreach dependentes }}\` | *(Inicia lista dinâmica)* | \`<foreach lista="dependentes" var="item">\` |
| \`{{ item.nome }}\` | \`<coluna id="nome" rotulo="Nome" />\` (inserido na tabela dependentes) | \`{{item.nome}}\` |
| \`{{ /foreach }}\` | *(Fechamento da lista dinâmica)* | \`</foreach>\` |

#### Tabelas Nativas do Word
O sistema também converte **Tabelas do Word** perfeitamente:
1. Ele cria automaticamente um grupo de \`<tabela>\` no formulário para preenchimento de múltiplas linhas.
2. Cada cabeçalho da tabela do Word vira uma \`<coluna>\` desta tabela do formulário.
3. No conteúdo, ele envolve as linhas com \`<foreach>\` para renderizar todos os dados que o usuário preencher.

`;

const marker = "*(Nota: Tabelas nativas do Word são convertidas automaticamente e os seus cabeçalhos também se tornam campos do formulário para o usuário preencher múltiplas linhas).*";

if (content.includes(marker)) {
    content = content.replace(marker, marker + "\n\n" + additionalTables);
    fs.writeFileSync('README.md', content);
    console.log("README updated with tables.");
} else {
    console.log("Marker not found in README.");
}
