import type { TemplateItem } from "../defaultTemplates";

export const bateriaTestes: TemplateItem =
  {
    id: 'teste-funcionalidades',
    nome: 'Bateria de Testes do Motor XML',
    descricao: 'Template abrangente contendo todas as tags suportadas: tipos de input, máscaras, formatação monetária, datas por extenso, números romanos, filtros, foreach, tabelas, e condições booleanas.',
    categoria: 'Testes',
    xml: `<documento>
    <formulario>
        <grupo titulo="1. Campos de texto">
            <input id="texto" label="Texto [tipo=&quot;texto&quot;]" tipo="texto" descricao="Campo de texto simples" exemplo="Contratação de Tecnologia"/>
            <textarea id="texto_multilinha" label="Texto multilinha [tipo=&quot;texto_multilinha&quot;]" descricao="Campo de texto com várias linhas"/>
            <input id="email" label="E-mail [tipo=&quot;email&quot;]" tipo="email" descricao="Campo de e-mail" exemplo="contato@empresa.com.br"/>
        </grupo>

        <grupo titulo="2. Data e documentos">
            <date id="data" label="Data [tipo=&quot;data&quot;]" descricao="Campo de data"/>
            <number id="cnpj" label="CNPJ [tipo=&quot;cnpj&quot;]" tipo="cnpj" descricao="Campo com máscara de CNPJ" exemplo="12345678000199"/>
            <number id="cep" label="CEP [tipo=&quot;cep&quot;]" tipo="cep" descricao="Campo com máscara de CEP" exemplo="30123456"/>
        </grupo>

        <grupo titulo="3. Números">
            <number id="numero" label="Número [sem tipo]" min="0" step="1" descricao="Número sem tipo especial"/>
            <number id="inteiro" label="Número inteiro [tipo=&quot;numero_inteiro&quot;]" min="0" step="1" tipo="numero_inteiro" descricao="Número inteiro"/>
            <number id="moeda" label="Valor [tipo=&quot;moeda&quot;]" min="0" step="0.01" tipo="moeda" descricao="Campo monetário"/>
        </grupo>

        <grupo titulo="4. Seleções">
            <select id="selecao" label="Seleção [tipo=&quot;selecao&quot;]" descricao="Campo select">
                <option>Opção A</option>
                <option>Opção B</option>
                <option>Opção C</option>
            </select>
            <radio id="radio" label="Radio [tipo=&quot;radio&quot;]" descricao="Campo radio">
                <option>Sim</option>
                <option>Não</option>
            </radio>
            <checkbox id="checkbox" label="Checkbox [sem tipo]" descricao="Campo checkbox"/>

            <radio id="divisao_objeto" label="Nota Explicativa sobre o Objeto">
                <option valor="varios">Vários itens</option>
                <if expr="divisao_objeto == 'varios'">
                    <number id="quantidade_itens" label="Informe a quantidade de itens" min="1" step="1"/>
                </if>
                <option valor="unico">Item único</option>
            </radio>
        </grupo>

        <grupo titulo="5. Tabelas e Listas">
            <tabela id="tabela_testes" label="Tabela Dinâmica de Produtos / Serviços">
                <coluna id="codigo" label="Código" tipo="input" placeholder="Ex: COD-01"/>
                <coluna id="descricao" label="Descrição" tipo="input" placeholder="Ex: Servidor Cloud"/>
                <coluna id="quantidade" label="Qtd" tipo="number" min="1"/>
                <coluna id="valor_unitario" label="Valor Unitário" tipo="input" validar="moeda" placeholder="Ex: 3.500,00"/>
            </tabela>
            <input id="lista" label="Lista [tipo=&quot;lista_csv&quot;]" tipo="lista_csv" descricao="Lista usada pelo foreach" exemplo="Servidores Cloud, Banco de Dados, Segurança de Rede, Backup Diário"/>
        </grupo>
    </formulario>

    <conteudo>
        <titulo>TESTE DO MOTOR XML</titulo>
        <subtitulo>Validação Completa de Tags e Expressões</subtitulo>

        <secao titulo="Variáveis simples">
            Texto: <b>{{texto}}</b>.
            Texto multilinha: <i>{{texto_multilinha}}</i>.
            E-mail: {{email}}.
        </secao>

        <secao titulo="Data e documentos">
            Data: <b>{{data | data}}</b>.
            Data por extenso: <i>{{data | dataPorExtenso}}</i>.
            CNPJ: <b>{{cnpj | cnpj}}</b>.
            CEP: <b>{{cep | cep}}</b>.
        </secao>

        <secao titulo="Números e moeda">
            Número: {{numero}}.
            Número inteiro: {{inteiro}}.
            Número inteiro por extenso: {{inteiro | numeroPorExtenso}}.
            Número inteiro com extenso: {{inteiro | numeroPorExtenso}}.
            Número inteiro em romano: {{inteiro | romano}}.
            Valor monetário: <b>R$ {{moeda | moeda}}</b>.
            Valor por extenso: <i>{{moeda | moedaPorExtenso}}</i>.
        </secao>

        <secao titulo="Seleções">
            Seleção: {{selecao}}.
            Radio: {{radio}}.
            Checkbox: <b>{{checkbox}}</b>.

            <if expr="divisao_objeto == 'varios'">
                Quantidade de itens: <b>{{quantidade_itens}}</b>.
            </if>

            <if expr="divisao_objeto == 'unico'">
                A contratação será composta por item único.
            </if>
        </secao>

        <secao titulo="Estilos Tipográficos">
            Texto normal.
            <b>Texto em negrito.</b>
            <i>Texto em itálico.</i>
            <u>Texto sublinhado.</u>
            <b><i>Texto em negrito e itálico.</i></b>
            <b><u>Texto em negrito e sublinhado.</u></b>
            <i><u>Texto em itálico e sublinhado.</u></i>
            <b><i><u>Texto com os três estilos combinados.</u></i></b>
        </secao>

        <secao titulo="Condições de texto">
            <if expr="selecao == 'Opção A'">A seleção é Opção A.</if>
            <if expr="selecao != 'Opção A'">A seleção é diferente de Opção A.</if>
        </secao>

        <secao titulo="Condições numéricas">
            <if expr="numero > 1">Número maior que 1.</if>
            <if expr="numero < 10">Número menor que 10.</if>
            <if expr="numero >= 10">Número maior ou igual a 10.</if>
            <if expr="numero <= 10">Número menor ou igual a 10.</if>
            <if expr="numero == 1">Número igual a 1.</if>
            <if expr="numero != 1">Número diferente de 1.</if>
        </secao>

        <secao titulo="Condições booleanas">
            <if expr="checkbox == true">Checkbox está marcado como verdadeiro.</if>
            <if expr="checkbox == false">Checkbox está desmarcado como falso.</if>
        </secao>

        <secao titulo="Condições aninhadas">
            <if expr="selecao == 'Opção A'">
                Primeira condição verdadeira (Seleção = Opção A).
                <if expr="radio == 'Sim'">
                    Segunda condição verdadeira (Radio = Sim).
                    <if expr="numero > 1">
                        Terceira condição verdadeira (Número > 1).
                    </if>
                </if>
            </if>
        </secao>

        <secao titulo="Operadores lógicos">
            <if expr="checkbox == true &amp;&amp; radio == 'Sim'">Condição AND (checkbox E radio) verdadeira.</if>
            <if expr="checkbox == true || radio == 'Sim'">Condição OR (checkbox OU radio) verdadeira.</if>
        </secao>

        <secao titulo="Lista e foreach">
            <lista>
                <foreach var="item" lista="lista">
                    <item>Item dinâmico: <b>{{item}}</b>.</item>
                </foreach>
            </lista>

            <lista>
                <item>Item estático 1.</item>
                <item>Item estático 2.</item>
                <item><i>Item estático 3 com estilo itálico.</i></item>
            </lista>
        </secao>

        <secao titulo="Tabela de Dados Dinâmica (Renderizada Diretamente)">
            <p>Abaixo, a tabela cadastrada no formulário é renderizada automaticamente pelo motor apenas invocando a variável:</p>
            {{tabela_testes}}

            <p><b>Acessos pontuais a linhas e células específicas da tabela:</b></p>
            <p>• Primeiro item (via coluna indexada): <b>{{tabela_testes.descricao[0]}}</b> (Código: {{tabela_testes.codigo[0]}}, Valor: R$ {{tabela_testes.valor_unitario[0] | moeda}})</p>
            <p>• Segundo item (via linha indexada): <b>{{tabela_testes[1].descricao}}</b> (Valor: R$ {{tabela_testes[1].valor_unitario | moeda}})</p>
            <p>• Coluna inteira de descrições concatenadas: <i>{{tabela_testes.descricao}}</i></p>
        </secao>

        <secao titulo="Tabela de Dados Dinâmica (Customizada com Foreach)">
            <p>Abaixo, a mesma tabela é percorrida via tag &lt;foreach&gt; dentro de &lt;tabela&gt;:</p>
            <tabela>
                <cabecalho>
                    <celula>#</celula>
                    <celula>Código</celula>
                    <celula>Descrição do Item</celula>
                    <celula>Qtd</celula>
                    <celula>Valor Unit.</celula>
                </cabecalho>
                <foreach lista="tabela_testes" var="item">
                    <linha>
                        <celula>{{item._indice}}</celula>
                        <celula>{{item.codigo}}</celula>
                        <celula>{{item.descricao}}</celula>
                        <celula>{{item.quantidade}}</celula>
                        <celula>R$ {{item.valor_unitario | moeda}}</celula>
                    </linha>
                </foreach>
            </tabela>
        </secao>

        <secao titulo="Tabela de Dados">
            <tabela>
                <cabecalho>
                    <celula>Campo</celula>
                    <celula>Valor Bruto</celula>
                    <celula>Valor Formatado</celula>
                </cabecalho>
                <linha>
                    <celula>Texto</celula>
                    <celula>{{texto}}</celula>
                    <celula><b>{{texto}}</b></celula>
                </linha>
                <linha>
                    <celula>Data</celula>
                    <celula>{{data}}</celula>
                    <celula>{{data | dataPorExtenso}}</celula>
                </linha>
                <linha>
                    <celula>Número</celula>
                    <celula>{{numero}}</celula>
                    <celula>{{numero | romano}}</celula>
                </linha>
                <linha>
                    <celula>Inteiro</celula>
                    <celula>{{inteiro}}</celula>
                    <celula>{{inteiro | numeroPorExtenso}}</celula>
                </linha>
                <linha>
                    <celula>Moeda</celula>
                    <celula>{{moeda}}</celula>
                    <celula>R$ {{moeda | moeda}}</celula>
                </linha>
                <linha>
                    <celula>CNPJ</celula>
                    <celula>{{cnpj}}</celula>
                    <celula>{{cnpj | cnpj}}</celula>
                </linha>
                <linha>
                    <celula>CEP</celula>
                    <celula>{{cep}}</celula>
                    <celula>{{cep | cep}}</celula>
                </linha>
                <linha>
                    <celula>Seleção</celula>
                    <celula>{{selecao}}</celula>
                    <celula><u>{{selecao}}</u></celula>
                </linha>
            </tabela>
        </secao>
    </conteudo>
</documento>`,
    json: `{
  "texto": "Contratação de Tecnologia e Soluções Digitais",
  "texto_multilinha": "Linha 1 de descrição detalhada.\\nLinha 2 de especificações técnicas.\\nLinha 3 com requisitos adicionais.",
  "email": "contato@empresa.com.br",
  "data": "2026-08-29",
  "cnpj": "12345678000199",
  "cep": "30123456",
  "numero": "42",
  "inteiro": "10",
  "moeda": "15450.75",
  "selecao": "Opção B",
  "radio": "Sim",
  "checkbox": true,
  "divisao_objeto": "varios",
  "quantidade_itens": "5",
  "tabela_testes": [
    { "codigo": "COD-01", "descricao": "Servidor Cloud Enterprise", "quantidade": 2, "valor_unitario": "4.500,00" },
    { "codigo": "COD-02", "descricao": "Licença Banco de Dados", "quantidade": 1, "valor_unitario": "8.200,00" }
  ],
  "lista": "Servidores Cloud, Banco de Dados, Segurança de Rede, Backup Diário"
}`
  };
