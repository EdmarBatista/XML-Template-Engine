import type { TemplateItem } from "../defaultTemplates";

export const contratoServicos: TemplateItem =
  {
    id: 'contrato-servicos',
    nome: 'Contrato de Prestação de Serviços',
    descricao: 'Contrato padrão de prestação de serviços com qualificação das partes, cláusula de pagamento, confidencialidade e foro.',
    categoria: 'Jurídico',
    xml: `<documento>
    <formulario>
        <grupo titulo="1. Contratante">
            <input id="contratante_nome" label="Razão Social / Nome do Contratante" tipo="texto" descricao="Nome completo do contratante" exemplo="Empresa Alpha Ltda"/>
            <input id="contratante_cnpj" label="CNPJ / CPF do Contratante" tipo="cnpj" descricao="Documento do contratante" exemplo="12345678000199"/>
            <input id="contratante_endereco" label="Endereço Completo" tipo="texto" descricao="Endereço da sede" exemplo="Rua das Flores, 100 - Centro"/>
            <input id="contratante_representante" label="Representante Legal" tipo="texto" descricao="Nome do representante legal" exemplo="Ana Beatriz Mendes"/>
        </grupo>

        <grupo titulo="2. Contratada">
            <input id="contratada_nome" label="Razão Social / Nome da Contratada" tipo="texto" descricao="Nome completo da contratada" exemplo="Beta Soluções Digitais ME"/>
            <input id="contratada_cnpj" label="CNPJ da Contratada" tipo="cnpj" descricao="CNPJ da contratada" exemplo="98765432000188"/>
            <input id="contratada_endereco" label="Endereço da Contratada" tipo="texto" descricao="Endereço da sede da contratada"/>
            <input id="contratada_email" label="E-mail de Contato" tipo="email" descricao="E-mail oficial de notificações"/>
        </grupo>

        <grupo titulo="3. Escopo e Entregas">
            <textarea id="descricao_servico" label="Descrição dos Serviços" descricao="Detalhamento das entregas e escopo técnico"/>
            <tabela id="cronograma_entregas" label="Cronograma de Marcos e Parcelas">
                <coluna id="etapa" label="Etapa / Marco" tipo="input" placeholder="Ex: Fase 1 - Planejamento e Arquitetura"/>
                <coluna id="prazo" label="Prazo Estimado" tipo="input" placeholder="Ex: 30 dias"/>
                <coluna id="valor" label="Valor da Etapa (R$)" tipo="input" validar="moeda" placeholder="Ex: 15.000,00"/>
            </tabela>
            <number id="valor_total" label="Valor Total dos Serviços (R$)" tipo="moeda" min="0" step="0.01"/>
            <select id="forma_pagamento" label="Forma de Pagamento" descricao="Condição de quitação">
                <option>À vista via PIX / Transferência</option>
                <option>Parcelado conforme cronograma de entregas</option>
                <option>Por marcos de entrega (milestones)</option>
            </select>
            <input id="prazo_vigencia" label="Prazo de Vigência Contratual" tipo="texto" exemplo="12 (doze) meses"/>
            <input id="cidade_foro" label="Comarca / Foro de Eleição" tipo="texto" exemplo="São Paulo / SP"/>
        </grupo>
    </formulario>

    <conteudo>
        <titulo>INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS</titulo>
        <subtitulo>Contrato nº {{contratante_cnpj}}</subtitulo>

        <secao titulo="DAS PARTES CONTRATANTES">
        De um lado, <b>{{contratante_nome}}</b>, inscrita no CNPJ/MF sob o nº <b>{{contratante_cnpj | cnpj}}</b>, com sede em {{contratante_endereco}}, neste ato representada por seu representante legal, <i>{{contratante_representante}}</i>, doravante denominada simplesmente <b>CONTRATANTE</b>;
        
        E, de outro lado, <b>{{contratada_nome}}</b>, inscrita no CNPJ/MF sob o nº <b>{{contratada_cnpj | cnpj}}</b>, com sede em {{contratada_endereco}}, e-mail para notificações <u>{{contratada_email | email}}</u>, doravante denominada simplesmente <b>CONTRATADA</b>;

        Têm entre si, justo e acordado, o presente Contrato de Prestação de Serviços, mediante as cláusulas e condições seguintes:
        </secao>

        <secao titulo="DO OBJETO DO CONTRATO">
        O presente contrato tem por objeto a prestação dos serviços especializados pela CONTRATADA à CONTRATANTE, compreendendo:
        <i>{{descricao_servico}}</i>.
        </secao>

        <secao titulo="DO CRONOGRAMA DE ENTREGAS E MARCOS">
        A execução dos serviços e os respectivos repasses financeiros seguirão rigorosamente o cronograma abaixo:
        {{cronograma_entregas}}

        <p><b>Destaques e Acessos Diretos às Células da Tabela:</b></p>
        <p>• Primeira Entrega: <b>{{cronograma_entregas.etapa[0]}}</b> (Prazo: {{cronograma_entregas.prazo[0]}}) no valor de <b>{{cronograma_entregas.valor[0] | moeda}}</b>.</p>
        <p>• Relação de todos os prazos cadastrados: {{cronograma_entregas.prazo}}.</p>
        </secao>

        <secao titulo="DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO">
        Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor total de <b>{{valor_total | moeda}}</b> (<i>{{valor_total | moedaPorExtenso}}</i>).
        A condição de pagamento acordada entre as partes será: <b>{{forma_pagamento}}</b>.
        </secao>

        <secao titulo="DO PRAZO E VIGÊNCIA">
        O presente contrato vigorará pelo prazo de <b>{{prazo_vigencia}}</b>, a contar da data de sua assinatura, podendo ser prorrogado mediante termo aditivo formal.
        </secao>

        <secao titulo="DO FORO">
        Para dirimir quaisquer controvérsias oriundas deste Contrato, as partes elegem o Foro da Comarca de <b>{{cidade_foro}}</b>, com expressa renúncia a qualquer outro, por mais privilegiado que seja.
        </secao>

        <secao titulo="ASSINATURAS" numerar="false">
        Local e Data: {{cidade_foro}}, na data de assinatura digital.
        
        <b>{{contratante_nome}}</b> (CONTRATANTE)
        Representante: {{contratante_representante}}

        <b>{{contratada_nome}}</b> (CONTRATADA)
        </secao>
    </conteudo>
</documento>`,
  };
