import { TemplateItem } from '../defaultTemplates';

const parte1Xml = `<documento>
    <formulario>
        <grupo titulo="1. Identificação das Partes e Objeto">
            <input id="numero_contrato" label="Número do Contrato" />
            <input id="contratante_razao" label="Razão Social do Contratante" />
            <input id="contratante_cnpj" label="CNPJ do Contratante" />
            <input id="contratada_razao" label="Razão Social da Contratada" />
            <input id="contratada_cnpj" label="CNPJ da Contratada" />
            <textarea id="objeto_resumo" label="Descrição do Objeto Contratual" />
        </grupo>
    </formulario>

    <conteudo>
        <titulo>CONTRATO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS Nº {{numero_contrato}}</titulo>
        
        <secao titulo="IDENTIFICAÇÃO DAS PARTES">
            <p>Pelo presente instrumento particular, de um lado <b>{{contratante_razao}}</b>, inscrita no CNPJ sob o nº {{contratante_cnpj}}, doravante denominada simplesmente <b>CONTRATANTE</b>, e de outro lado <b>{{contratada_razao}}</b>, inscrita no CNPJ sob o nº {{contratada_cnpj}}, doravante denominada simplesmente <b>CONTRATADA</b>, têm entre si justo e avençado o quanto segue:</p>
        </secao>
        
        <secao titulo="DO OBJETO DO CONTRATO">
            <p>O presente instrumento tem por objeto a prestação de serviços especializados consistindo em: {{objeto_resumo}}.</p>
            <p>Os serviços serão prestados em estrita observância às normas técnicas vigentes e às especificações constantes nos anexos deste instrumento.</p>
        </secao>
    </conteudo>
</documento>`;

const parte2Xml = `<documento>
    <formulario>
        <grupo titulo="2. Obrigações e Prazo de Execução">
            <number id="prazo_meses" label="Prazo de Execução (em meses)" />
            <input id="data_inicio" label="Data Prevista de Início" />
            <input id="local_execucao" label="Local Principal de Execução" />
            <select id="modalidade_garantia" label="Modalidade da Garantia">
                <option valor="caucao">Caução em Dinheiro</option>
                <option valor="seguro">Seguro Garantia</option>
                <option valor="fianca">Fiança Bancária</option>
            </select>
        </grupo>
    </formulario>

    <conteudo>
        <secao titulo="DO PRAZO E LOCAL DE EXECUÇÃO">
            <p>O prazo total estimado para cumprimento integral do objeto é de <b>{{prazo_meses}} meses</b>, com data de início prevista para <b>{{data_inicio}}</b>.</p>
            <p>Os trabalhos serão desenvolvidos primordialmente nas dependências localizadas em <b>{{local_execucao}}</b>, facultada a realização remota de atividades analíticas e de planejamento.</p>
        </secao>

        <secao titulo="DAS OBRIGAÇÕES DAS PARTES">
            <p>Compete à <b>CONTRATADA</b> disponibilizar equipe técnica devidamente qualificada, zelar pela confidencialidade das informações acessadas e prestar a garantia na modalidade de <b>{{modalidade_garantia}}</b>.</p>
            <p>Compete à <b>CONTRATANTE</b> prover os acessos necessários aos ambientes de homologação e efetuar a conferência e aprovação dos relatórios mensais de progresso.</p>
        </secao>
    </conteudo>
</documento>`;

const parte3Xml = `<documento>
    <formulario>
        <grupo titulo="3. Valores, Preços e Tabela de Itens">
            <input id="valor_total_contrato" label="Valor Total Global do Contrato (R$)" />
            <input id="condicao_faturamento" label="Condição de Pagamento" />
            <tabela id="itens_orcamentarios" label="Detalhamento dos Itens do Contrato">
                <coluna id="item" label="Item" tipo="number" />
                <coluna id="descricao" label="Descrição do Serviço" tipo="input" />
                <coluna id="qtd" label="Qtd" tipo="number" />
                <coluna id="valor_unit" label="Valor Unitário" tipo="input" />
                <coluna id="valor_total" label="Subtotal" tipo="input" />
            </tabela>
        </grupo>
    </formulario>

    <conteudo>
        <secao titulo="DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO">
            <p>Pela execução dos serviços descritos neste Contrato, a CONTRATANTE pagará à CONTRATADA o valor global estimado de <b>R$ {{valor_total_contrato}}</b>.</p>
            <p>O faturamento será processado sob as seguintes condições: <b>{{condicao_faturamento}}</b>, mediante apresentação de nota fiscal devidamente atestada pelo gestor do contrato.</p>
        </secao>
        
        <secao titulo="DO DETALHAMENTO ORÇAMENTÁRIO">
            <p>O detalhamento dos serviços, quantidades estimadas e custos unitários compreendem:</p>
            {{itens_orcamentarios}}
        </secao>
    </conteudo>
</documento>`;

const parte4Xml = `<documento>
    <formulario>
        <grupo titulo="4. Foro, Disposições Finais e Assinaturas">
            <input id="cidade_foro" label="Comarca do Foro de Eleição" />
            <input id="estado_foro" label="UF do Foro" />
            <input id="cidade_assinatura" label="Cidade de Assinatura" />
            <date id="data_assinatura" label="Data de Assinatura" />
            <input id="rep_contratante" label="Nome do Representante da Contratante" />
            <input id="cargo_rep_contratante" label="Cargo do Rep. Contratante" />
            <input id="rep_contratada" label="Nome do Representante da Contratada" />
            <input id="cargo_rep_contratada" label="Cargo do Rep. Contratada" />
            <input id="testemunha_1" label="Nome da 1ª Testemunha" />
            <input id="cpf_testemunha_1" label="CPF da 1ª Testemunha" />
            <input id="testemunha_2" label="Nome da 2ª Testemunha" />
            <input id="cpf_testemunha_2" label="CPF da 2ª Testemunha" />
        </grupo>
    </formulario>

    <conteudo>
        <secao titulo="DO FORO DE ELEIÇÃO">
            <p>Para dirimir quaisquer dúvidas oriundas da interpretação ou execução deste Contrato, as partes elegem expressamente o Foro da Comarca de <b>{{cidade_foro}}/{{estado_foro}}</b>, com renúncia irrevogável a qualquer outro, por mais privilegiado que seja.</p>
        </secao>

        <secao titulo="FORMALIZAÇÃO E ASSINATURAS" numerar="false">
            <p>E, por estarem assim justas e contratadas, as partes assinam o presente instrumento perante as testemunhas qualificadas.</p>
            <p>Local e data: {{cidade_assinatura}}, {{data_assinatura}}.</p>
            <br />
            <p><b>CONTRATANTE:</b> {{contratante_razao}}</p>
            <p>Representante: {{rep_contratante}} - {{cargo_rep_contratante}}</p>
            <br />
            <p><b>CONTRATADA:</b> {{contratada_razao}}</p>
            <p>Representante: {{rep_contratada}} - {{cargo_rep_contratada}}</p>
            <br />
            <p><b>Testemunhas:</b></p>
            <p>1. {{testemunha_1}} (CPF: {{cpf_testemunha_1}})</p>
            <p>2. {{testemunha_2}} (CPF: {{cpf_testemunha_2}})</p>
        </secao>
    </conteudo>
</documento>`;

const xmlConcatenado = `<documento>
    <formulario>
        <grupo titulo="1. Identificação das Partes e Objeto">
            <input id="numero_contrato" label="Número do Contrato" />
            <input id="contratante_razao" label="Razão Social do Contratante" />
            <input id="contratante_cnpj" label="CNPJ do Contratante" />
            <input id="contratada_razao" label="Razão Social da Contratada" />
            <input id="contratada_cnpj" label="CNPJ da Contratada" />
            <textarea id="objeto_resumo" label="Descrição do Objeto Contratual" />
        </grupo>
        <grupo titulo="2. Obrigações e Prazo de Execução">
            <number id="prazo_meses" label="Prazo de Execução (em meses)" />
            <input id="data_inicio" label="Data Prevista de Início" />
            <input id="local_execucao" label="Local Principal de Execução" />
            <select id="modalidade_garantia" label="Modalidade da Garantia">
                <option valor="caucao">Caução em Dinheiro</option>
                <option valor="seguro">Seguro Garantia</option>
                <option valor="fianca">Fiança Bancária</option>
            </select>
        </grupo>
        <grupo titulo="3. Valores, Preços e Tabela de Itens">
            <input id="valor_total_contrato" label="Valor Total Global do Contrato (R$)" />
            <input id="condicao_faturamento" label="Condição de Pagamento" />
            <tabela id="itens_orcamentarios" label="Detalhamento dos Itens do Contrato">
                <coluna id="item" label="Item" tipo="number" />
                <coluna id="descricao" label="Descrição do Serviço" tipo="input" />
                <coluna id="qtd" label="Qtd" tipo="number" />
                <coluna id="valor_unit" label="Valor Unitário" tipo="input" />
                <coluna id="valor_total" label="Subtotal" tipo="input" />
            </tabela>
        </grupo>
        <grupo titulo="4. Foro, Disposições Finais e Assinaturas">
            <input id="cidade_foro" label="Comarca do Foro de Eleição" />
            <input id="estado_foro" label="UF do Foro" />
            <input id="cidade_assinatura" label="Cidade de Assinatura" />
            <date id="data_assinatura" label="Data de Assinatura" />
            <input id="rep_contratante" label="Nome do Representante da Contratante" />
            <input id="cargo_rep_contratante" label="Cargo do Rep. Contratante" />
            <input id="rep_contratada" label="Nome do Representante da Contratada" />
            <input id="cargo_rep_contratada" label="Cargo do Rep. Contratada" />
            <input id="testemunha_1" label="Nome da 1ª Testemunha" />
            <input id="cpf_testemunha_1" label="CPF da 1ª Testemunha" />
            <input id="testemunha_2" label="Nome da 2ª Testemunha" />
            <input id="cpf_testemunha_2" label="CPF da 2ª Testemunha" />
        </grupo>
    </formulario>

    <conteudo>
        <titulo>CONTRATO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS Nº {{numero_contrato}}</titulo>
        
        <secao titulo="IDENTIFICAÇÃO DAS PARTES">
            <p>Pelo presente instrumento particular, de um lado <b>{{contratante_razao}}</b>, inscrita no CNPJ sob o nº {{contratante_cnpj}}, doravante denominada simplesmente <b>CONTRATANTE</b>, e de outro lado <b>{{contratada_razao}}</b>, inscrita no CNPJ sob o nº {{contratada_cnpj}}, doravante denominada simplesmente <b>CONTRATADA</b>, têm entre si justo e avençado o quanto segue:</p>
        </secao>
        
        <secao titulo="DO OBJETO DO CONTRATO">
            <p>O presente instrumento tem por objeto a prestação de serviços especializados consistindo em: {{objeto_resumo}}.</p>
            <p>Os serviços serão prestados em estrita observância às normas técnicas vigentes e às especificações constantes nos anexos deste instrumento.</p>
        </secao>

        <secao titulo="DO PRAZO E LOCAL DE EXECUÇÃO">
            <p>O prazo total estimado para cumprimento integral do objeto é de <b>{{prazo_meses}} meses</b>, com data de início prevista para <b>{{data_inicio}}</b>.</p>
            <p>Os trabalhos serão desenvolvidos primordialmente nas dependências localizadas em <b>{{local_execucao}}</b>, facultada a realização remota de atividades analíticas e de planejamento.</p>
        </secao>

        <secao titulo="DAS OBRIGAÇÕES DAS PARTES">
            <p>Compete à <b>CONTRATADA</b> disponibilizar equipe técnica devidamente qualificada, zelar pela confidencialidade das informações acessadas e prestar a garantia na modalidade de <b>{{modalidade_garantia}}</b>.</p>
            <p>Compete à <b>CONTRATANTE</b> prover os acessos necessários aos ambientes de homologação e efetuar a conferência e aprovação dos relatórios mensais de progresso.</p>
        </secao>

        <secao titulo="DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO">
            <p>Pela execução dos serviços descritos neste Contrato, a CONTRATANTE pagará à CONTRATADA o valor global estimado de <b>R$ {{valor_total_contrato}}</b>.</p>
            <p>O faturamento será processado sob as seguintes condições: <b>{{condicao_faturamento}}</b>, mediante apresentação de nota fiscal devidamente atestada pelo gestor do contrato.</p>
        </secao>
        
        <secao titulo="DO DETALHAMENTO ORÇAMENTÁRIO">
            <p>O detalhamento dos serviços, quantidades estimadas e custos unitários compreendem:</p>
            {{itens_orcamentarios}}
        </secao>

        <secao titulo="DO FORO DE ELEIÇÃO">
            <p>Para dirimir quaisquer dúvidas oriundas da interpretação ou execução deste Contrato, as partes elegem expressamente o Foro da Comarca de <b>{{cidade_foro}}/{{estado_foro}}</b>, com renúncia irrevogável a qualquer outro, por mais privilegiado que seja.</p>
        </secao>

        <secao titulo="FORMALIZAÇÃO E ASSINATURAS" numerar="false">
            <p>E, por estarem assim justas e contratadas, as partes assinam o presente instrumento perante as testemunhas qualificadas.</p>
            <p>Local e data: {{cidade_assinatura}}, {{data_assinatura}}.</p>
            <br />
            <p><b>CONTRATANTE:</b> {{contratante_razao}}</p>
            <p>Representante: {{rep_contratante}} - {{cargo_rep_contratante}}</p>
            <br />
            <p><b>CONTRATADA:</b> {{contratada_razao}}</p>
            <p>Representante: {{rep_contratada}} - {{cargo_rep_contratada}}</p>
            <br />
            <p><b>Testemunhas:</b></p>
            <p>1. {{testemunha_1}} (CPF: {{cpf_testemunha_1}})</p>
            <p>2. {{testemunha_2}} (CPF: {{cpf_testemunha_2}})</p>
        </secao>
    </conteudo>
</documento>`;

export const exemploParticionado: TemplateItem = {
  id: 'exemplo-particionado-01-04',
  nome: 'Exemplo [01 a 04] - Multi-Part',
  descricao: 'Documento dividido em 4 seções/arquivos XML com dados em JSON único',
  categoria: 'Exemplos Multi-Part',
  xml: xmlConcatenado,
  xmlParts: [
    { nome: 'Exemplo [01].xml', xml: parte1Xml, index: 1 },
    { nome: 'Exemplo [02].xml', xml: parte2Xml, index: 2 },
    { nome: 'Exemplo [03].xml', xml: parte3Xml, index: 3 },
    { nome: 'Exemplo [04].xml', xml: parte4Xml, index: 4 },
  ],
  json: JSON.stringify(
    {
      numero_contrato: '042/2026',
      contratante_razao: 'SECRETARIA MUNICIPAL DE TECNOLOGIA E INOVAÇÃO',
      contratante_cnpj: '12.345.678/0001-90',
      contratada_razao: 'NEXUS SISTEMAS E ENGENHARIA DE SOFTWARE LTDA',
      contratada_cnpj: '98.765.432/0001-10',
      objeto_resumo:
        'Desenvolvimento, sustentação e implantação de plataforma integrada de gestão documental com geração dinâmica de relatórios em XML e exportação automatizada',
      prazo_meses: 12,
      data_inicio: '01/09/2026',
      local_execucao: 'Sede Administrativa Municipal e Nuvem Governamental',
      modalidade_garantia: 'seguro',
      valor_total_contrato: '480.000,00',
      condicao_faturamento:
        'Pagamentos mensais mediante medição de entregáveis e emissão de NF',
      itens_orcamentarios: [
        {
          item: 1,
          descricao: 'Módulo de Parsing XML e AST com Validação Estrutural',
          qtd: 1,
          valor_unit: '120.000,00',
          valor_total: '120.000,00',
        },
        {
          item: 2,
          descricao: 'Módulo de Renderização Split-Screen e Foco Bidirecional',
          qtd: 1,
          valor_unit: '140.000,00',
          valor_total: '140.000,00',
        },
        {
          item: 3,
          descricao: 'Módulo de Particionamento e Concatenação Multi-Part XML',
          qtd: 1,
          valor_unit: '110.000,00',
          valor_total: '110.000,00',
        },
        {
          item: 4,
          descricao: 'Suporte Técnico Especializado e Exportadores (Word/PDF/ZIP)',
          qtd: 12,
          valor_unit: '9.166,67',
          valor_total: '110.000,00',
        },
      ],
      cidade_foro: 'São Paulo',
      estado_foro: 'SP',
      cidade_assinatura: 'São Paulo',
      data_assinatura: '2026-08-31',
      rep_contratante: 'Dr. Fernando Henrique Silveira',
      cargo_rep_contratante: 'Secretário Municipal de Tecnologia',
      rep_contratada: 'Engª. Beatriz Mendes de Oliveira',
      cargo_rep_contratada: 'Diretora de Operações',
      testemunha_1: 'Carlos Eduardo Lima',
      cpf_testemunha_1: '111.222.333-44',
      testemunha_2: 'Mariana Souza Santos',
      cpf_testemunha_2: '555.666.777-88',
    },
    null,
    2
  ),
};
