import type { TemplateItem } from "../defaultTemplates";

export const catalogoCompletoTags: TemplateItem = {
  id: 'catalogo-completo-tags',
  nome: 'Catálogo Completo de Tags e Variações',
  descricao: 'Template de referência exaustivo que demonstra todas as tags, atributos, variações e filtros suportados pelo motor XML, estruturados em sequência comparativa imediata com repetição de texto idêntico.',
  categoria: 'Referência e Testes',
  xml: `<documento>
    <formulario>
        <grupo titulo="Campos de Entrada (Input e Tipos Especiais)">
            <input id="campo_texto_simples" label="Input Padrão (Texto)" placeholder="Texto de demonstração" descricao="Tag input sem tipo ou tipo text padrão" exemplo="Texto de demonstração"/>
            <number id="campo_cpf" label="Input CPF" tipo="cpf" placeholder="000.000.000-00" descricao="Tag input com máscara e validação de CPF" exemplo="123.456.789-00"/>
            <number id="campo_cnpj" label="Input CNPJ" tipo="cnpj" placeholder="00.000.000/0000-00" descricao="Tag input com máscara e validação de CNPJ" exemplo="12.345.678/0001-90"/>
            <number id="campo_cep" label="Input CEP" tipo="cep" placeholder="00000-000" descricao="Tag input com máscara de CEP e consulta integrada" exemplo="70040-010"/>
            <input id="campo_email" label="Input E-mail" tipo="email" placeholder="usuario@dominio.com.br" descricao="Tag input de e-mail" exemplo="contato@empresa.com.br"/>
            <input id="campo_tel" label="Input Telefone" tipo="tel" placeholder="(00) 00000-0000" descricao="Tag input com máscara telefônica" exemplo="(61) 98765-4321"/>
            <number id="campo_moeda_input" label="Input Moeda Monetária" tipo="moeda" placeholder="0,00" descricao="Tag input monetária formatada em Real" exemplo="15000,00"/>
        </grupo>

        <grupo titulo="Campos Numéricos, Data e Texto Longo">
            <number id="campo_numero_simples" label="Number Inteiro Padrão" min="1" max="100" step="1" descricao="Tag number com limites inteiros" exemplo="10"/>
            <number id="campo_numero_decimal" label="Number Decimal com Passo" min="0" max="100" step="0.5" descricao="Tag number decimal com step fracionado" exemplo="15.5"/>
            <number id="campo_valor_moeda" label="Number com Tipo Moeda" min="0" step="0.01" tipo="moeda" descricao="Tag number monetária com casas decimais" exemplo="2540.50"/>
            <date id="campo_data_registro" label="Data de Registro" descricao="Tag date com calendário nativo" exemplo="2026-08-29"/>
            <textarea id="campo_textarea_pequeno" label="Textarea com 3 Linhas" rows="3" placeholder="Texto de demonstração para área de texto" descricao="Tag textarea com altura compacta" exemplo="Texto de demonstração para área de texto longo com múltiplas linhas de conteúdo."/>
            <textarea id="campo_textarea_grande" label="Textarea com 6 Linhas" rows="6" placeholder="Texto de demonstração para área de texto" descricao="Tag textarea expandida" exemplo="Texto de demonstração para área de texto longo com múltiplas linhas de conteúdo."/>
        </grupo>

        <grupo titulo="Campos de Opções (Checkbox, Select e Radio)">
            <checkbox id="opt_ativo" label="Checkbox / Opção Ativo" descricao="Tag checkbox para controle booleano"/>
            <checkbox id="opt_urgente" label="Checkbox / Opção Urgente" descricao="Tag checkbox secundária para testes lógicos"/>

            <select id="campo_select_simples" label="Select com Opções de Texto Direto" descricao="Tag select com tags option simples">
                <option>Opção Alpha</option>
                <option>Opção Beta</option>
                <option>Opção Gama</option>
            </select>

            <select id="campo_select_valores" label="Select com Atributo valor" descricao="Tag select com pares de label e valor explícito">
                <option valor="val_alpha">Opção Alpha</option>
                <option valor="val_beta">Opção Beta</option>
                <option valor="val_gama">Opção Gama</option>
            </select>

            <select id="campo_select_condicional" label="Select com Opção Condicional (if)" descricao="Tag select com opção filtrada por condição">
                <option>Opção Padrão Sempre Visível</option>
                <if expr="opt_ativo == true">
                    <option>Opção Especial (Visível apenas quando Ativo)</option>
                </if>
            </select>

            <radio id="campo_radio_simples" label="Radio Button com Opções Diretas" descricao="Tag radio para escolha única simples">
                <option>Opção Primária</option>
                <option>Opção Secundária</option>
                <option>Opção Terciária</option>
            </radio>

            <radio id="campo_radio_valores" label="Radio Button com Atributo valor" descricao="Tag radio com chaves de valor">
                <option valor="opcao_a">Opção Primária</option>
                <option valor="opcao_b">Opção Secundária</option>
            </radio>
        </grupo>

        <grupo titulo="Campos Condicionais no Formulário (if)">
            <if expr="opt_ativo == true">
                <input id="campo_condicional_formulario" label="Campo Exibido Apenas quando Ativo" placeholder="Texto de demonstração condicional" descricao="Input inserido condicionalmente no formulário via tag if"/>
            </if>
        </grupo>

        <grupo titulo="Tabela Dinâmica de Dados e Suas Colunas">
            <tabela id="tabela_itens" label="Grade Dinâmica Completa com Múltiplas Colunas">
                <coluna id="col_nome" label="Nome do Item" tipo="input" placeholder="Ex: Produto A"/>
                <coluna id="col_categoria" label="Categoria" tipo="select" opcoes="Hardware, Software, Consultoria, Treinamento"/>
                <coluna id="col_prioridade" label="Prioridade" tipo="radio" opcoes="Alta, Média, Baixa"/>
                <coluna id="col_qtd" label="Quantidade" tipo="number" min="1" max="1000" step="1"/>
                <coluna id="col_valor" label="Valor Unitário" tipo="moeda" placeholder="0,00"/>
                <coluna id="col_data" label="Data Limite" tipo="date"/>
                <coluna id="col_status" label="Concluído" tipo="checkbox"/>
                <coluna id="col_observacao" label="Observação" tipo="textarea"/>
            </tabela>
        </grupo>
    </formulario>

    <conteudo>
        <!-- ================================================================= -->
        <!-- 1. SEÇÕES E HIERARQUIA (<secao>, <section>)                      -->
        <!-- ================================================================= -->
        <secao titulo="ESTRUTURA DE SEÇÕES E NUMERAÇÃO HIERÁRQUICA" numerar="true">
            <p>Demonstração da tag <b>&lt;secao&gt;</b> com numeração hierárquica automática sequencial.</p>

            <secao titulo="SUBSEÇÃO DE SEGUNDO NÍVEL (NÍVEL 1.1)" numerar="true">
                <p>Texto de exemplo dentro de uma subseção de segundo nível.</p>

                <secao titulo="SUBSEÇÃO DE TERCEIRO NÍVEL (NÍVEL 1.1.1)" numerar="true">
                    <p>Texto de exemplo dentro de uma subseção de terceiro nível.</p>
                </secao>
            </secao>

            <secao titulo="SUBSEÇÃO ADJACENTE (NÍVEL 1.2)" numerar="true">
                <p>Texto de exemplo demonstrando o incremento automático de ramos hierárquicos.</p>
            </secao>
        </secao>

        <secao titulo="SEÇÃO COM NUMERAÇÃO DESATIVADA (NUMERAR=FALSE)" numerar="false">
            <p>Texto de exemplo demonstrando a variação da tag <b>&lt;secao numerar="false"&gt;</b> (ideal para anexos, glossários ou blocos de assinatura).</p>
        </secao>

        <!-- ================================================================= -->
        <!-- 2. TÍTULOS E CABEÇALHOS (<titulo>, <subtitulo>)                     -->
        <!-- ================================================================= -->
        <secao titulo="TÍTULOS, CABEÇALHOS E ALINHAMENTOS" numerar="true">
            <!-- <titulo> = nível 1 (h1) -->
            <titulo alinhamento="centro">Texto de exemplo para comparação de título</titulo>
            <titulo alinhamento="esquerda">Texto de exemplo para comparação de título</titulo>
            <titulo alinhamento="direita">Texto de exemplo para comparação de título</titulo>

            <!-- <subtitulo> = nível 2 (h2) -->
            <subtitulo alinhamento="centro">Texto de exemplo para comparação de subtítulo</subtitulo>
            <subtitulo alinhamento="esquerda">Texto de exemplo para comparação de subtítulo</subtitulo>
            <subtitulo alinhamento="direita">Texto de exemplo para comparação de subtítulo</subtitulo>
        </secao>

        <!-- ================================================================= -->
        <!-- 3. PARÁGRAFOS E ALINHAMENTOS (<p>)                                -->
        <!-- ================================================================= -->
        <secao titulo="PARÁGRAFOS E ALINHAMENTOS DE TEXTO" numerar="true">
            <p alinhamento="justify">Este é o texto de exemplo utilizado para demonstrar e comparar visualmente o alinhamento de parágrafos justificado no documento.</p>
            <p alinhamento="esquerda">Este é o texto de exemplo utilizado para demonstrar e comparar visualmente o alinhamento de parágrafos alinhado à esquerda.</p>
            <p alinhamento="centro">Este é o texto de exemplo utilizado para demonstrar e comparar visualmente o alinhamento de parágrafos centralizado.</p>
            <p alinhamento="direita">Este é o texto de exemplo utilizado para demonstrar e comparar visualmente o alinhamento de parágrafos alinhado à direita.</p>
        </secao>

        <!-- ================================================================= -->
        <!-- 4. DIVISORES HORIZONTAIS (<hr>)                                  -->
        <!-- ================================================================= -->
        <secao titulo="DIVISORES HORIZONTAIS" numerar="true">
            <p>Texto de exemplo posicionado antes da linha divisória.</p>
            <hr />
            <p>Texto de exemplo posicionado após a linha divisória (renderizada pela tag &lt;hr /&gt;).</p>
        </secao>

        <!-- ================================================================= -->
        <!-- 5. LISTAS COM MARCADORES E NUMERADAS                              -->
        <!-- ================================================================= -->
        <secao titulo="LISTAS COM MARCADORES E NUMERADAS" numerar="true">
            <!-- Lista não ordenada (com marcadores / bolinha) -->
            <p><b>Lista com marcadores (&lt;lista&gt; com &lt;item&gt;):</b></p>
            <lista>
                <item>Primeiro item de exemplo da lista com marcadores</item>
                <item>Segundo item de exemplo da lista com marcadores</item>
                <item>Terceiro item de exemplo da lista com marcadores</item>
            </lista>

            <!-- Lista numerada -->
            <p><b>Lista numerada (&lt;lista_numerada&gt; com &lt;item&gt;):</b></p>
            <lista_numerada>
                <item>Primeiro item de exemplo da lista numerada</item>
                <item>Segundo item de exemplo da lista numerada</item>
                <item>Terceiro item de exemplo da lista numerada</item>
            </lista_numerada>

            <!-- Lista dinâmica com iteração <foreach> -->
            <p><b>Lista dinâmica com repetição de itens (&lt;foreach&gt;):</b></p>
            <lista>
                <foreach lista="tabela_itens" var="item_linha">
                    <item>Item {{item_linha._indice}}: {{item_linha.col_nome}} — Categoria: {{item_linha.col_categoria}} — Prioridade: {{item_linha.col_prioridade}} — Status: {{item_linha.col_status}} — R$ {{item_linha.col_valor | moeda}}</item>
                </foreach>
            </lista>

            <!-- Lista com itens condicionais (<if>) -->
            <p><b>Lista com itens condicionais (&lt;if&gt;):</b></p>
            <lista>
                <item>Item fixo permanente obrigatório</item>
                <if expr="opt_ativo == true">
                    <item>Item condicional (visível somente quando opt_ativo for verdadeiro)</item>
                </if>
                <if expr="opt_urgente == true">
                    <item>Item condicional de urgência (visível somente quando opt_urgente for verdadeiro)</item>
                </if>
            </lista>
        </secao>

        <!-- ================================================================= -->
        <!-- 6. TABELAS E ESTRUTURAS DE DADOS TABULARES                       -->
        <!-- ================================================================= -->
        <secao titulo="TABELAS E ESTRUTURAS DE DADOS TABULARES" numerar="true">
            <p><b>1. Renderização Automática Direta via Interpolação Simples:</b></p>
            {{tabela_itens}}

            <p><b>2. Tabela com Estrutura Completa (&lt;tabela&gt;, &lt;cabecalho&gt;, &lt;linha&gt;, &lt;celula&gt;):</b></p>
            <tabela id="tabela_itens">
                <cabecalho>
                    <celula>Nº</celula>
                    <celula>Descrição do Item</celula>
                    <celula>Categoria</celula>
                    <celula>Prioridade</celula>
                    <celula>Qtd</celula>
                    <celula>Valor Unitário</celula>
                    <celula>Data Limite</celula>
                    <celula>Status</celula>
                    <celula>Observação</celula>
                </cabecalho>
                <foreach lista="tabela_itens" var="linha">
                    <linha>
                        <celula>{{linha._indice}}</celula>
                        <celula>{{linha.col_nome}}</celula>
                        <celula>{{linha.col_categoria}}</celula>
                        <celula>{{linha.col_prioridade}}</celula>
                        <celula>{{linha.col_qtd}}</celula>
                        <celula>R$ {{linha.col_valor | moeda}}</celula>
                        <celula>{{linha.col_data | data}}</celula>
                        <celula>{{linha.col_status}}</celula>
                        <celula>{{linha.col_observacao}}</celula>
                    </linha>
                </foreach>
            </tabela>

            <p><b>3. Tabela com Células e Colunas Condicionais (&lt;if&gt;):</b></p>
            <tabela id="tabela_itens">
                <cabecalho>
                    <linha>
                        <celula>Item</celula>
                        <celula>Descrição</celula>
                        <if expr="opt_ativo == true">
                            <celula>Status Extra (Ativo)</celula>
                        </if>
                    </linha>
                </cabecalho>
                <foreach lista="tabela_itens" var="linha">
                    <linha>
                        <celula>{{linha._indice}}</celula>
                        <celula>{{linha.col_nome}}</celula>
                        <if expr="opt_ativo == true">
                            <celula>Em conformidade</celula>
                        </if>
                    </linha>
                </foreach>
            </tabela>
        </secao>

        <!-- ================================================================= -->
        <!-- 9. CONDICIONAIS EM BLOCO (<if expr="...">)                       -->
        <!-- ================================================================= -->
        <secao titulo="CONDICIONAIS EM BLOCO E OPERADORES LÓGICOS" numerar="true">
            <!-- Booleano direto -->
            <if expr="opt_ativo">
                <p>Texto de exemplo condicional: [Condição Booleana Direta (opt_ativo) é Verdadeira].</p>
            </if>

            <!-- Booleano com negação -->
            <if expr="!opt_ativo">
                <p>Texto de exemplo condicional: [Condição Booleana Negada (!opt_ativo) é Verdadeira].</p>
            </if>

            <!-- Igualdade booleana -->
            <if expr="opt_ativo == true">
                <p>Texto de exemplo condicional: [Condição de Igualdade Booleana (opt_ativo == true) é Verdadeira].</p>
            </if>

            <!-- Diferença booleana -->
            <if expr="opt_ativo != false">
                <p>Texto de exemplo condicional: [Condição de Diferença Booleana (opt_ativo != false) é Verdadeira].</p>
            </if>

            <!-- Igualdade de texto -->
            <if expr="campo_select_simples == 'Opção Alpha'">
                <p>Texto de exemplo condicional: [Condição de Texto Igual a 'Opção Alpha' é Verdadeira].</p>
            </if>

            <!-- Diferença de texto -->
            <if expr="campo_select_simples != 'Opção Beta'">
                <p>Texto de exemplo condicional: [Condição de Texto Diferente de 'Opção Beta' é Verdadeira].</p>
            </if>

            <!-- Operador Maior Que (>) -->
            <if expr="campo_numero_simples &gt; 5">
                <p>Texto de exemplo condicional: [Condição Numérica (campo_numero_simples &gt; 5) é Verdadeira].</p>
            </if>

            <!-- Operador Maior ou Igual (>=) -->
            <if expr="campo_numero_simples &gt;= 10">
                <p>Texto de exemplo condicional: [Condição Numérica (campo_numero_simples &gt;= 10) é Verdadeira].</p>
            </if>

            <!-- Operador Menor Que (<) -->
            <if expr="campo_numero_simples &lt; 50">
                <p>Texto de exemplo condicional: [Condição Numérica (campo_numero_simples &lt; 50) é Verdadeira].</p>
            </if>

            <!-- Operador Menor ou Igual (<=) -->
            <if expr="campo_numero_simples &lt;= 100">
                <p>Texto de exemplo condicional: [Condição Numérica (campo_numero_simples &lt;= 100) é Verdadeira].</p>
            </if>

            <!-- Operador Lógico AND (&&) -->
            <if expr="opt_ativo == true &amp;&amp; campo_numero_simples &gt; 0">
                <p>Texto de exemplo condicional: [Condição Lógica E (opt_ativo == true &amp;&amp; campo_numero_simples &gt; 0) é Verdadeira].</p>
            </if>

            <!-- Operador Lógico OR (||) -->
            <if expr="opt_ativo == true || opt_urgente == true">
                <p>Texto de exemplo condicional: [Condição Lógica OU (opt_ativo == true || opt_urgente == true) é Verdadeira].</p>
            </if>

            <!-- Condicionais Aninhadas -->
            <if expr="opt_ativo == true">
                <if expr="campo_numero_simples &gt;= 1">
                    <p>Texto de exemplo condicional: [Condições Aninhadas Múltiplas são Verdadeiras].</p>
                </if>
            </if>
        </secao>

        <!-- ================================================================= -->
        <!-- 10. REPETIÇÃO EM BLOCO (<foreach>)                                -->
        <!-- ================================================================= -->
        <secao titulo="ESTRUTURAS DE REPETIÇÃO EM BLOCO (FOREACH)" numerar="true">
            <!-- Variação com lista="..." e var="..." -->
            <p><b>1. Iteração com atributos lista="..." e var="...":</b></p>
            <foreach lista="tabela_itens" var="item_loop">
                <p>Elemento {{item_loop._indice}}: {{item_loop.col_nome}} — Categoria: {{item_loop.col_categoria}} — Prioridade: {{item_loop.col_prioridade}} — Quantidade: {{item_loop.col_qtd}} — Status: {{item_loop.col_status}} — R$ {{item_loop.col_valor | moeda}}</p>
            </foreach>

            <!-- Iteração canônica com lista="..." e var="..." -->
            <foreach lista="tabela_itens" var="item_loop">
                <p>Elemento {{item_loop._indice}}: {{item_loop.col_nome}} — Categoria: {{item_loop.col_categoria}} — Prioridade: {{item_loop.col_prioridade}} — Quantidade: {{item_loop.col_qtd}} — Status: {{item_loop.col_status}} — R$ {{item_loop.col_valor | moeda}}</p>
            </foreach>
        </secao>

        <!-- ================================================================= -->
        <!-- 11. FORMATAÇÃO TIPOGRÁFICA INLINE                                 -->
        <!-- ================================================================= -->
        <secao titulo="FORMATAÇÃO TIPOGRÁFICA E ESTILOS INLINE" numerar="true">
            <!-- Negrito: <b> -->
            <p><b>Texto de exemplo para estilo em negrito</b> (renderizado via tag &lt;b&gt;)</p>
            <!-- Itálico: <i> -->
            <p><i>Texto de exemplo para estilo em itálico</i> (renderizado via tag &lt;i&gt;)</p>
            <!-- Sublinhado: <u> -->
            <p><u>Texto de exemplo para estilo sublinhado</u> (renderizado via tag &lt;u&gt;)</p>
            <!-- Tachado: <s> -->
            <p><s>Texto de exemplo para estilo tachado</s> (renderizado via tag &lt;s&gt;)</p>
            <!-- Destaque / Marca-texto: <mark> -->
            <p><mark>Texto de exemplo para estilo em destaque/marca-texto</mark> (renderizado via tag &lt;mark&gt;)</p>
            <!-- Cores: <cor cor="..."> -->
            <p><cor cor="#0284c7">Texto de exemplo colorido com azul</cor> (renderizado via tag &lt;cor cor="#0284c7"&gt;)</p>
            <!-- Quebra de linha inline: <br /> -->
            <p>Primeira linha do texto de demonstração.<br />Segunda linha do texto de demonstração após quebra de linha inline com a tag &lt;br /&gt;.</p>
            <!-- Links: <a href="..."> -->
            <p><a href="https://exemplo.com.br">Texto de exemplo para link de navegação</a> (renderizado via tag &lt;a href="..."&gt;)</p>
            <!-- Combinação de múltiplos estilos inline -->
            <p><b><i><u>Texto de exemplo para comparação combinando negrito, itálico e sublinhado</u></i></b></p>
        </secao>

        <!-- ================================================================= -->
        <!-- 12. INVOCAÇÃO DE VARIÁVEIS E FILTROS DE FORMATAÇÃO               -->
        <!-- ================================================================= -->
        <secao titulo="INVOCAÇÃO DE VARIÁVEIS E FILTROS DE FORMATAÇÃO" numerar="true">
            <!-- Catálogo completo de filtros via {{campo | filtro}} -->
            <p><b>1. Catálogo completo de filtros via sintaxe {{campo | filtro}}:</b></p>
            <p>Valor de texto simples: {{campo_texto_simples}}</p>
            <p>Campo input monetário formatado (campo_moeda_input): R$ {{campo_moeda_input | moeda}} (<i>{{campo_moeda_input | moedaPorExtenso}}</i>)</p>
            <p>Campo número monetário formatado (campo_valor_moeda): R$ {{campo_valor_moeda | moeda}} (<i>{{campo_valor_moeda | moedaPorExtenso}}</i>)</p>
            <p>Campo número decimal: {{campo_numero_decimal}}</p>
            <p>Filtro de data padrão (DD/MM/AAAA): {{campo_data_registro | data}}</p>
            <p>Filtro de data por extenso: {{campo_data_registro | dataPorExtenso}}</p>
            <p>Filtro de número por extenso: {{campo_numero_simples | numeroPorExtenso}}</p>
            <p>Filtro de algarismos romanos: {{campo_numero_simples | romano}}</p>
            <p>Filtro de máscara de CPF: {{campo_cpf | cpf}}</p>
            <p>Filtro de máscara de CNPJ: {{campo_cnpj | cnpj}}</p>
            <p>Filtro de máscara de CEP: {{campo_cep | cep}}</p>
            <p>Filtro de telefone: {{campo_tel | telefone}}</p>
            <p>Filtro de e-mail: {{campo_email | email}}</p>

            <!-- Acesso pontual e indexado a dados tabulares -->
            <p><b>2. Acessos diretos e indexados a coleções e colunas da tabela:</b></p>
            <p>Primeiro elemento da coluna por array dot (tabela.coluna[0]): {{tabela_itens.col_nome[0]}}</p>
            <p>Primeiro elemento por índice de linha (tabela[0].coluna): {{tabela_itens[0].col_nome}}</p>
            <p>Categoria do primeiro item: {{tabela_itens.col_categoria[0]}} (Prioridade: {{tabela_itens.col_prioridade[0]}})</p>
            <p>Quantidade do primeiro item: {{tabela_itens.col_qtd[0]}} un.</p>
            <p>Data limite do primeiro item: {{tabela_itens.col_data[0] | data}}</p>
            <p>Status concluído do primeiro item: {{tabela_itens.col_status[0]}}</p>
            <p>Observação do primeiro item: {{tabela_itens.col_observacao[0]}}</p>
            <p>Valores concatenados de toda a coluna de nomes (tabela.coluna): {{tabela_itens.col_nome}}</p>
            <p>Preço da primeira linha com filtro de moeda: R$ {{tabela_itens.col_valor[0] | moeda}}</p>
        </secao>

        <!-- ================================================================= -->
        <!-- 13. CONDICIONAIS E REPETIÇÕES INLINE                              -->
        <!-- ================================================================= -->
        <secao titulo="CONDICIONAIS E FOREACH INLINE NO FLUXO DO PARÁGRAFO" numerar="true">
            <p><b>Condicional Inline:</b> O status operacional atual deste documento é: <if expr="opt_urgente == true"><mark><b>[PRIORIDADE MÁXIMA / URGENTE]</b></mark></if><if expr="opt_urgente == false">[ROTINA NORMAL / REGULAR]</if>.</p>

            <p><b>Repetição Inline (Foreach dentro do parágrafo):</b> Os itens cadastrados são: <foreach lista="tabela_itens" var="it"><b>{{it.col_nome}}</b> (R$ {{it.col_valor | moeda}} - Prazo: {{it.col_data | data}})<if expr="it._indice &lt; 3">; </if></foreach>.</p>
        </secao>

        <!-- ================================================================= -->
        <!-- 14. PAINEL CONSOLIDADO DE TODOS OS CAMPOS DO FORMULÁRIO           -->
        <!-- ================================================================= -->
        <secao titulo="PAINEL CONSOLIDADO DE TODOS OS CAMPOS DO FORMULÁRIO" numerar="true">
            <p>Abaixo são apresentados e validados todos os campos definidos no formulário:</p>

            <tabela>
                <cabecalho>
                    <celula>Identificador (ID)</celula>
                    <celula>Tipo / Categoria</celula>
                    <celula>Valor no Documento</celula>
                </cabecalho>
                <linha>
                    <celula>campo_texto_simples</celula>
                    <celula>input (texto)</celula>
                    <celula>{{campo_texto_simples}}</celula>
                </linha>
                <linha>
                    <celula>campo_cpf</celula>
                    <celula>input (cpf)</celula>
                    <celula>{{campo_cpf | cpf}}</celula>
                </linha>
                <linha>
                    <celula>campo_cnpj</celula>
                    <celula>input (cnpj)</celula>
                    <celula>{{campo_cnpj | cnpj}}</celula>
                </linha>
                <linha>
                    <celula>campo_cep</celula>
                    <celula>input (cep)</celula>
                    <celula>{{campo_cep | cep}}</celula>
                </linha>
                <linha>
                    <celula>campo_email</celula>
                    <celula>input (email)</celula>
                    <celula>{{campo_email | email}}</celula>
                </linha>
                <linha>
                    <celula>campo_tel</celula>
                    <celula>input (tel)</celula>
                    <celula>{{campo_tel | telefone}}</celula>
                </linha>
                <linha>
                    <celula>campo_moeda_input</celula>
                    <celula>input (moeda)</celula>
                    <celula>R$ {{campo_moeda_input | moeda}}</celula>
                </linha>
                <linha>
                    <celula>campo_numero_simples</celula>
                    <celula>number (inteiro)</celula>
                    <celula>{{campo_numero_simples}}</celula>
                </linha>
                <linha>
                    <celula>campo_numero_decimal</celula>
                    <celula>number (decimal)</celula>
                    <celula>{{campo_numero_decimal}}</celula>
                </linha>
                <linha>
                    <celula>campo_valor_moeda</celula>
                    <celula>number (moeda)</celula>
                    <celula>R$ {{campo_valor_moeda | moeda}}</celula>
                </linha>
                <linha>
                    <celula>campo_data_registro</celula>
                    <celula>date</celula>
                    <celula>{{campo_data_registro | data}}</celula>
                </linha>
                <linha>
                    <celula>campo_textarea_pequeno</celula>
                    <celula>textarea (3 linhas)</celula>
                    <celula>{{campo_textarea_pequeno}}</celula>
                </linha>
                <linha>
                    <celula>campo_textarea_grande</celula>
                    <celula>textarea (6 linhas)</celula>
                    <celula>{{campo_textarea_grande}}</celula>
                </linha>
                <linha>
                    <celula>opt_ativo</celula>
                    <celula>checkbox</celula>
                    <celula>{{opt_ativo}}</celula>
                </linha>
                <linha>
                    <celula>opt_urgente</celula>
                    <celula>checkbox</celula>
                    <celula>{{opt_urgente}}</celula>
                </linha>
                <linha>
                    <celula>campo_select_simples</celula>
                    <celula>select</celula>
                    <celula>{{campo_select_simples}}</celula>
                </linha>
                <linha>
                    <celula>campo_select_valores</celula>
                    <celula>select (valor)</celula>
                    <celula>{{campo_select_valores}}</celula>
                </linha>
                <linha>
                    <celula>campo_select_condicional</celula>
                    <celula>select (condicional)</celula>
                    <celula>{{campo_select_condicional}}</celula>
                </linha>
                <linha>
                    <celula>campo_radio_simples</celula>
                    <celula>radio</celula>
                    <celula>{{campo_radio_simples}}</celula>
                </linha>
                <linha>
                    <celula>campo_radio_valores</celula>
                    <celula>radio (valor)</celula>
                    <celula>{{campo_radio_valores}}</celula>
                </linha>
                <linha>
                    <celula>campo_condicional_formulario</celula>
                    <celula>input (condicional)</celula>
                    <celula><if expr="opt_ativo == true">{{campo_condicional_formulario}}</if><if expr="opt_ativo == false"><i>(Inativo)</i></if></celula>
                </linha>
            </tabela>
        </secao>
    </conteudo>
</documento>`,
  json: `{
  "campo_texto_simples": "Exemplo de texto preenchido",
  "campo_cpf": "12345678900",
  "campo_cnpj": "12345678000190",
  "campo_cep": "70040010",
  "campo_email": "contato@empresa.com.br",
  "campo_tel": "61987654321",
  "campo_moeda_input": "15000,00",
  "campo_numero_simples": 10,
  "campo_numero_decimal": 15.5,
  "campo_valor_moeda": 2540.50,
  "campo_data_registro": "2026-08-29",
  "campo_textarea_pequeno": "Texto descritivo curto para validação de área de texto.",
  "campo_textarea_grande": "Texto detalhado com múltiplas linhas para testar renderização e exportação contínua de parágrafos.",
  "opt_ativo": true,
  "opt_urgente": false,
  "campo_select_simples": "Opção Beta",
  "campo_select_valores": "val_beta",
  "campo_select_condicional": "Opção Padrão Sempre Visível",
  "campo_radio_simples": "Opção Primária",
  "campo_radio_valores": "opcao_a",
  "campo_condicional_formulario": "Conteúdo preenchido do campo condicional ativo",
  "tabela_itens": [
    {
      "col_nome": "Assinatura Cloud Pro",
      "col_categoria": "Software",
      "col_prioridade": "Alta",
      "col_qtd": 3,
      "col_valor": "1.200,00",
      "col_data": "2026-12-31",
      "col_status": true,
      "col_observacao": "Licenciamento anual corporativo com suporte prioritário 24/7."
    },
    {
      "col_nome": "Consultoria Especializada",
      "col_categoria": "Consultoria",
      "col_prioridade": "Média",
      "col_qtd": 1,
      "col_valor": "3.500,00",
      "col_data": "2026-10-15",
      "col_status": false,
      "col_observacao": "Auditoria de infraestrutura e otimização de custos em nuvem."
    },
    {
      "col_nome": "Servidor Dedicado Rack 2U",
      "col_categoria": "Hardware",
      "col_prioridade": "Baixa",
      "col_qtd": 2,
      "col_valor": "8.900,00",
      "col_data": "2026-09-30",
      "col_status": true,
      "col_observacao": "Equipamento para processamento local de dados sensíveis."
    }
  ]
}`
};
