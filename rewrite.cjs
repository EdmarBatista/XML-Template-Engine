const fs = require('fs');
const content = fs.readFileSync('src/utils/docxToXmlConverter.ts', 'utf-8');

const targetStr = `function transformarHtmlParaEstruturaXml`;
const startIndex = content.indexOf(targetStr);
const beforeContent = content.substring(0, startIndex);

const newFunction = `type FormFieldDef = {
  id: string;
  tag: string;
  attrs: Record<string, string>;
  options?: string[];
};

function transformarHtmlParaEstruturaXml(html: string, nomeArquivo: string): { xml: string; jsonInicial: Record<string, any> } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  const childNodes = Array.from(doc.body.childNodes);
  let insideSecao = false;
  let conteudoXml = '';
  const formulariosXml: string[] = [];
  const jsonInicial: Record<string, any> = {};
  
  const tabelaIdsUsados = new Set<string>();
  
  const camposExtraidos = new Map<string, FormFieldDef>();
  const tabelasExtraidas = new Map<string, Map<string, FormFieldDef>>();
  let currentForeachTable: string | null = null;

  function processText(text: string): string {
      return text.replace(/\\{\\{\\s*(.*?)\\s*\\}\\}/g, (match, inner) => {
          const parts = inner.split('|').map((p: string) => p.trim());
          const rawLabel = parts[0];
          
          if (rawLabel.toLowerCase().startsWith('if ')) {
              const expr = rawLabel.substring(3).trim();
              const exprParts = expr.split(/(==|!=|>=|<=|>|<)/);
              if (exprParts.length >= 3) {
                  exprParts[0] = normalizarIdentificadorValido(exprParts[0].trim(), 'var') + ' ';
              }
              return \`<if expr="\${escapeXml(exprParts.join(''))}">\`;
          }
          if (rawLabel.toLowerCase().startsWith('/if')) {
              return \`</if>\`;
          }
          if (rawLabel.toLowerCase().startsWith('foreach ')) {
              const listNameRaw = rawLabel.substring(8).trim();
              const listId = normalizarIdentificadorValido(listNameRaw, 'lista');
              currentForeachTable = listId;
              if (!tabelasExtraidas.has(listId)) {
                  tabelasExtraidas.set(listId, new Map());
              }
              return \`<foreach lista="\${listId}" var="item">\`;
          }
          if (rawLabel.toLowerCase().startsWith('/foreach')) {
              currentForeachTable = null;
              return \`</foreach>\`;
          }
          
          let isItem = false;
          let id = '';
          let label = rawLabel;
          
          if (rawLabel.toLowerCase().startsWith('item.')) {
              isItem = true;
              id = normalizarIdentificadorValido(rawLabel.substring(5), 'col');
              label = rawLabel.substring(5);
              label = label.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          } else {
              id = normalizarIdentificadorValido(rawLabel, 'var');
          }
          
          const field: FormFieldDef = {
              id,
              tag: 'input',
              attrs: { label, tipo: 'texto' },
          };
          
          const displayFilters: string[] = [];
          
          for (let i = 1; i < parts.length; i++) {
              const part = parts[i];
              const lowerPart = part.toLowerCase();
              
              if (part.includes('=')) {
                  const eqIdx = part.indexOf('=');
                  const k = part.substring(0, eqIdx).trim().toLowerCase();
                  const v = part.substring(eqIdx + 1).trim();
                  
                  if (k === 'desc' || k === 'descricao') field.attrs['descricao'] = v;
                  else field.attrs[k] = v;
                  continue;
              }
              
              const funcMatch = part.match(/^([a-zA-Z_]+)\\((.*)\\)$/);
              if (funcMatch) {
                  const funcName = funcMatch[1].toLowerCase();
                  const funcArgsStr = funcMatch[2];
                  if (['select', 'radio', 'checkbox'].includes(funcName)) {
                      field.tag = funcName;
                      delete field.attrs['tipo'];
                      field.options = funcArgsStr.split(',').map((o: string) => o.trim());
                  } else if (funcName === 'number') {
                      field.tag = 'number';
                      field.attrs['tipo'] = 'number';
                      funcArgsStr.split(',').forEach((arg: string) => {
                          const [k, v] = arg.split('=').map((s: string) => s.trim());
                          if (k && v) field.attrs[k.toLowerCase()] = v;
                      });
                  }
                  continue;
              }
              
              if (['cpf', 'cnpj', 'cep', 'telefone', 'moeda'].includes(lowerPart)) {
                  field.tag = 'number';
                  field.attrs['tipo'] = lowerPart;
                  displayFilters.push(part);
              } else if (lowerPart === 'email') {
                  field.tag = 'input';
                  field.attrs['tipo'] = 'email';
              } else if (lowerPart === 'data' || lowerPart === 'date') {
                  field.tag = 'date';
                  delete field.attrs['tipo'];
              } else if (lowerPart === 'textarea' || lowerPart === 'longo') {
                  field.tag = 'textarea';
                  delete field.attrs['tipo'];
              } else if (lowerPart === 'number' || lowerPart === 'numero') {
                  field.tag = 'number';
                  field.attrs['tipo'] = 'number';
              } else if (lowerPart === 'lista_csv') {
                  field.tag = 'input';
                  field.attrs['tipo'] = 'lista_csv';
              } else {
                  displayFilters.push(part);
              }
          }
          
          if (isItem && currentForeachTable) {
              const tableFields = tabelasExtraidas.get(currentForeachTable)!;
              if (!tableFields.has(id)) {
                  tableFields.set(id, field);
              }
          } else if (!isItem) {
              if (!camposExtraidos.has(id)) {
                  camposExtraidos.set(id, field);
              } else {
                  const existing = camposExtraidos.get(id)!;
                  if (field.tag !== 'input' || field.attrs.tipo !== 'texto') {
                      existing.tag = field.tag;
                      existing.options = field.options;
                  }
                  existing.attrs = { ...existing.attrs, ...field.attrs };
              }
          }
          
          let replacement = isItem ? \`{{item.\${id}\` : \`{{\${id}\`;
          if (displayFilters.length > 0) {
              replacement += \` | \${displayFilters.join(' | ')}\`;
          }
          replacement += \`}}\`;
          return replacement;
      });
  }

  const serializeInner = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return processText(escapeXml(node.textContent || ''));
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.nodeName.toLowerCase();
      if (tag === 'br') return '<br/>';
      const inner = Array.from(el.childNodes).map(serializeInner).join('');
      if (['b', 'strong'].includes(tag)) return \`<b>\${inner}</b>\`;
      if (['i', 'em'].includes(tag)) return \`<i>\${inner}</i>\`;
      if (['u'].includes(tag)) return \`<u>\${inner}</u>\`;
      if (['s', 'strike', 'del'].includes(tag)) return \`<s>\${inner}</s>\`;
      if (['mark'].includes(tag)) return \`<mark>\${inner}</mark>\`;
      if (tag === 'span' && el.style.color) return \`<cor cor="\${el.style.color}">\${inner}</cor>\`;
      return inner;
    }
    return '';
  };

  let tableIndex = 0;
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    
    const el = node as HTMLElement;
    const tag = el.nodeName.toLowerCase();
    
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      if (insideSecao) conteudoXml += \`    </secao>\\n\`;
      let tNodeContent = el.textContent || '';
      let titulo = processText(escapeXml(tNodeContent)).trim();
      titulo = titulo.replace(/<(if|foreach|\\/if|\\/foreach)[^>]*>/g, '');
      
      let isSubtitulo = ['h3', 'h4', 'h5', 'h6'].includes(tag);
      if (isSubtitulo) {
          conteudoXml += \`    <subtitulo>\${titulo}</subtitulo>\\n\`;
      } else {
          conteudoXml += \`    <secao titulo="\${titulo}" numerar="true">\\n\`;
          insideSecao = true;
      }
    } else if (tag === 'p') {
      if (!insideSecao) { conteudoXml += \`    <secao>\\n\`; insideSecao = true; }
      const content = serializeInner(el).trim();
      if (content) {
        if (/^(?:<if[^>]*>|<\\/if>|<foreach[^>]*>|<\\/foreach>|\\s*)+$/.test(content)) {
            conteudoXml += \`      \${content}\\n\`;
        } else {
            conteudoXml += \`      <p>\${content}</p>\\n\`;
        }
      }
    } else if (tag === 'hr') {
      if (!insideSecao) { conteudoXml += \`    <secao>\\n\`; insideSecao = true; }
      conteudoXml += \`      <hr />\\n\`;
    } else if (['ul', 'ol'].includes(tag)) {
      if (!insideSecao) { conteudoXml += \`    <secao>\\n\`; insideSecao = true; }
      const isOrdered = tag === 'ol';
      conteudoXml += \`      <lista\${isOrdered ? ' numerada="true"' : ''}>\\n\`;
      const listItems = Array.from(el.childNodes).filter(n => n.nodeName.toLowerCase() === 'li');
      listItems.forEach(li => {
        conteudoXml += \`        <item>\${serializeInner(li).trim()}</item>\\n\`;
      });
      conteudoXml += \`      </lista>\\n\`;
    } else if (tag === 'table') {
      tableIndex++;
      if (!insideSecao) { conteudoXml += \`    <secao>\\n\`; insideSecao = true; }
      
      const rows = Array.from(el.querySelectorAll('tr'));
      if (rows.length === 0) continue;

      const firstRowCells = Array.from(rows[0].querySelectorAll('td, th'));
      const colLabels = firstRowCells.map((c, idx) => (c.textContent || '').trim() || \`Coluna \${idx + 1}\`);

      const col1Raw = colLabels[0] || '';
      const col2Raw = colLabels[1] || '';
      
      let baseTableId = '';
      if (col1Raw && col2Raw) {
        baseTableId = \`\${col1Raw}_\${col2Raw}\`;
      } else if (col1Raw) {
        baseTableId = col1Raw;
      } else {
        baseTableId = \`tabela_\${tableIndex}\`;
      }

      let tableId = normalizarIdentificadorValido(baseTableId, \`tabela_\${tableIndex}\`);
      
      if (tabelaIdsUsados.has(tableId)) {
        let suffix = 2;
        while (tabelaIdsUsados.has(\`\${tableId}_\${suffix}\`)) {
          suffix++;
        }
        tableId = \`\${tableId}_\${suffix}\`;
      }
      tabelaIdsUsados.add(tableId);

      const tableRotulo = colLabels.slice(0, 2).join(' / ') || \`Tabela \${tableIndex}\`;

      const colIds: string[] = [];
      const colIdsSet = new Set<string>();
      colLabels.forEach((label, idx) => {
        let cId = normalizarIdentificadorValido(label, \`coluna_\${idx + 1}\`);
        if (colIdsSet.has(cId)) {
          let sfx = 2;
          while (colIdsSet.has(\`\${cId}_\${sfx}\`)) {
            sfx++;
          }
          cId = \`\${cId}_\${sfx}\`;
        }
        colIdsSet.add(cId);
        colIds.push(cId);
      });

      let formTabelaXml = \`    <tabela id="\${tableId}" rotulo="\${escapeXml(tableRotulo)}">\\n\`;
      colLabels.forEach((label, idx) => {
        const cId = colIds[idx];
        let tipo = 'texto';
        const lblLower = label.toLowerCase();
        if (lblLower.includes('cep')) tipo = 'cep';
        else if (lblLower.includes('email') || lblLower.includes('e-mail')) tipo = 'texto';
        else if (lblLower.includes('cpf')) tipo = 'cpf';
        else if (lblLower.includes('cnpj')) tipo = 'cnpj';
        else if (lblLower.includes('data')) tipo = 'date';
        else if (lblLower.includes('valor') || lblLower.includes('preço') || lblLower.includes('preco')) tipo = 'moeda';
        else if (lblLower.includes('telefone')) tipo = 'telefone';

        formTabelaXml += \`      <coluna id="\${cId}" rotulo="\${escapeXml(label)}" tipo="\${tipo}" />\\n\`;
      });
      formTabelaXml += \`    </tabela>\`;
      formulariosXml.push(formTabelaXml);

      const dataRows = rows.slice(1);
      const rowsJson: Record<string, any>[] = [];
      dataRows.forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td, th'));
        const rowObj: Record<string, any> = {};
        colIds.forEach((cId, cIdx) => {
          const cellEl = cells[cIdx];
          if (cellEl) {
            const rawHtmlText = serializeInner(cellEl).trim().replace(/<br\\s*\\/?>/gi, '\\n');
            rowObj[cId] = rawHtmlText;
          } else {
            rowObj[cId] = '';
          }
        });
        rowsJson.push(rowObj);
      });
      jsonInicial[tableId] = rowsJson;

      conteudoXml += \`      <tabela borda="true">\\n\`;
      conteudoXml += \`        <cabecalho>\\n\`;
      colLabels.forEach(label => {
        conteudoXml += \`          <coluna>\${processText(escapeXml(label))}</coluna>\\n\`;
      });
      conteudoXml += \`        </cabecalho>\\n\`;
      conteudoXml += \`        <foreach lista="\${tableId}" var="item">\\n\`;
      conteudoXml += \`          <linha>\\n\`;
      colIds.forEach(cId => {
        conteudoXml += \`            <coluna>{{item.\${cId}}}</coluna>\\n\`;
      });
      conteudoXml += \`          </linha>\\n\`;
      conteudoXml += \`        </foreach>\\n\`;
      conteudoXml += \`      </tabela>\\n\`;
    }
  }

  if (insideSecao) {
    conteudoXml += \`    </secao>\\n\`;
  }
  
  let xml = \`<?xml version="1.0" encoding="UTF-8"?>\\n<documento>\\n  <!-- Convertido de \${escapeXml(nomeArquivo)} -->\\n\`;
  xml += \`  <formulario>\\n\`;
  
  if (camposExtraidos.size > 0) {
    xml += \`    <grupo titulo="Campos Identificados">\\n\`;
    camposExtraidos.forEach(field => {
        let attrStr = Object.entries(field.attrs).map(([k, v]) => \`\${k}="\${escapeXml(v)}"\`).join(' ');
        if (field.options && field.options.length > 0) {
            xml += \`      <\${field.tag} id="\${field.id}" \${attrStr}>\\n\`;
            field.options.forEach(opt => {
                xml += \`        <option>\${escapeXml(opt)}</option>\\n\`;
            });
            xml += \`      </\${field.tag}>\\n\`;
        } else {
            xml += \`      <\${field.tag} id="\${field.id}" \${attrStr} />\\n\`;
        }
    });
    xml += \`    </grupo>\\n\`;
  }

  tabelasExtraidas.forEach((fields, listId) => {
    let formTabelaXml = \`    <tabela id="\${listId}" rotulo="\${escapeXml(listId.replace(/_/g, ' '))}">\\n\`;
    fields.forEach(field => {
        let attrStr = Object.entries(field.attrs).map(([k, v]) => \`\${k}="\${escapeXml(v)}"\`).join(' ');
        formTabelaXml += \`      <coluna id="\${field.id}" \${attrStr} />\\n\`;
    });
    formTabelaXml += \`    </tabela>\`;
    formulariosXml.push(formTabelaXml);
  });

  if (formulariosXml.length > 0) {
    xml += \`    <grupo titulo="Tabelas do Documento">\\n\`;
    xml += formulariosXml.join('\\n') + '\\n';
    xml += \`    </grupo>\\n\`;
  }
  
  xml += \`  </formulario>\\n\\n\`;
  
  xml += \`  <conteudo>\\n\`;
  xml += conteudoXml;
  xml += \`  </conteudo>\\n</documento>\`;
  
  return { xml, jsonInicial };
}
`;

fs.writeFileSync('src/utils/docxToXmlConverter.ts', beforeContent + newFunction);
