/**
 * ============================================================================
 * useDocumentEngine (Gerenciador de Templates, Engine XML e Parsing de AST)
 * ============================================================================
 *
 * Atribuições & Responsabilidades:
 * 1. Carregar lista de templates nativos e customizados (LocalStorage via StorageService).
 * 2. Realizar o parsing do XML para AST (`IntermediateModel` / `xmlAst`).
 * 3. Capturar e sinalizar erros de sintaxe XML (`xmlError`).
 * 4. Alternância entre modelos (templates padrão e personalizados).
 * 5. Persistência e compilação de novos templates via editor ou upload.
 * 6. Suporte à inserção silenciosa de arquivos XML secundários.
 */

import React from 'react';
import { DEFAULT_TEMPLATES, TemplateItem } from '../data/defaultTemplates';
import { StorageService } from '../services/storageService';
import { IntermediateModel, XmlPart } from '../types';
import { construirEstadoInicial, criarModeloIntermediario, parseXmlDocument, concatenarXmlsParticionados } from '../utils/xmlParser';

interface UseDocumentEngineProps {
  showToast: (msg: string) => void;
  onNovoEstadoGerado?: (novoEstado: Record<string, any>) => void;
}

export function useDocumentEngine({ showToast, onNovoEstadoGerado }: UseDocumentEngineProps) {
  // Lista de templates customizados
  const [customTemplates, setCustomTemplates] = React.useState<TemplateItem[]>(() =>
    StorageService.loadCustomTemplates()
  );

  // Template atualmente selecionado
  const [currentTemplate, setCurrentTemplate] = React.useState<TemplateItem>(() => {
    try {
      const savedId = StorageService.getLastTemplateId();
      const customList = StorageService.loadCustomTemplates();

      if (savedId) {
        const foundCustom = customList.find(t => t.id === savedId);
        if (foundCustom) {
          try {
            parseXmlDocument(foundCustom.xml);
            return foundCustom;
          } catch {}
        }

        const foundDefault = DEFAULT_TEMPLATES.find(t => t.id === savedId);
        if (foundDefault) return foundDefault;
      }

      if (customList.length > 0) {
        for (const t of customList) {
          try {
            parseXmlDocument(t.xml);
            return t;
          } catch {}
        }
      }
    } catch {}
    return DEFAULT_TEMPLATES[0];
  });

  const [rawXml, setRawXml] = React.useState<string>(() => currentTemplate.xml);
  const [xmlName, setXmlName] = React.useState<string>(() => currentTemplate.nome);
  const [xmlParts, setXmlParts] = React.useState<XmlPart[] | null>(() => currentTemplate.xmlParts || null);
  const [xmlError, setXmlError] = React.useState<string | null>(null);

  // Modelo intermediário compilado (AST + Estrutura de Formulário)
  const [modelo, setModelo] = React.useState<IntermediateModel | null>(() => {
    try {
      const doc = parseXmlDocument(currentTemplate.xml);
      return criarModeloIntermediario(doc, currentTemplate.nome, currentTemplate.xmlParts);
    } catch (e: any) {
      console.warn('Erro ao compilar template inicial, revertendo para template padrão:', e);
      try {
        const fallbackDoc = parseXmlDocument(DEFAULT_TEMPLATES[0].xml);
        return criarModeloIntermediario(fallbackDoc, DEFAULT_TEMPLATES[0].nome);
      } catch {
        return null;
      }
    }
  });

  // Troca de Template
  const handleSelectTemplate = React.useCallback(
    (template: TemplateItem) => {
      try {
        const doc = parseXmlDocument(template.xml);
        const novoModelo = criarModeloIntermediario(doc, template.nome, template.xmlParts);

        setCurrentTemplate(template);
        setRawXml(template.xml);
        setXmlName(template.nome);
        setXmlParts(template.xmlParts || null);
        setModelo(novoModelo);
        setXmlError(null);

        const novoEstado = construirEstadoInicial(novoModelo.formulario.campos);
        try {
          const savedForTemplate = StorageService.loadFormData(template.id);
          if (savedForTemplate && Object.keys(savedForTemplate).length > 0) {
            Object.keys(novoEstado).forEach(k => {
              if (savedForTemplate[k] !== undefined) {
                novoEstado[k] = savedForTemplate[k];
              }
            });
          } else if (template.json) {
            try {
              const parsed = JSON.parse(template.json);
              const payload = parsed.dados ? parsed.dados : parsed;
              Object.assign(novoEstado, payload);
            } catch {}
          }
        } catch {}

        if (onNovoEstadoGerado) {
          onNovoEstadoGerado(novoEstado);
        }
        StorageService.setLastTemplateId(template.id);
        showToast(`Modelo "${template.nome}" selecionado.`);
      } catch (err: any) {
        setXmlError(err.message);
        alert(`Erro ao abrir modelo: ${err.message}`);
      }
    },
    [onNovoEstadoGerado, showToast]
  );

  // Aplica novo XML e dados vindos do editor de código
  const aplicarNovoXmlEJson = React.useCallback(
    (
      novoXml: string,
      novosDados: Record<string, any>,
      novoNome?: string,
      novasXmlParts?: XmlPart[]
    ) => {
      try {
        let nomeFinal = novoNome && novoNome.trim() ? novoNome.trim() : xmlName;
        if (!nomeFinal.toLowerCase().endsWith('.xml')) {
          nomeFinal += '.xml';
        }

        const partsFinal = novasXmlParts !== undefined ? novasXmlParts : xmlParts;
        const doc = parseXmlDocument(novoXml);
        const novoModelo = criarModeloIntermediario(doc, nomeFinal, partsFinal || undefined);
        
        // Constrói novo estado filtrando e mesclando com os novos dados recebidos
        const novoEstado = construirEstadoInicial(novoModelo.formulario.campos);
        if (novosDados) {
          Object.keys(novosDados).forEach(k => {
            if (k in novoEstado) {
              novoEstado[k] = novosDados[k];
            }
          });
        }
        const jsonStrNovo = JSON.stringify(novoEstado, null, 2);
        StorageService.saveJsonHistory(nomeFinal, jsonStrNovo);

        setRawXml(novoXml);
        setXmlName(nomeFinal);
        setXmlParts(partsFinal || null);
        setModelo(novoModelo);
        setXmlError(null);

        const isDefault = DEFAULT_TEMPLATES.some(t => t.id === currentTemplate.id);

        setCustomTemplates(prev => {
          let nextList = [...prev];
          let targetId = currentTemplate.id;

          if (!isDefault) {
            const idx = nextList.findIndex(t => t.id === currentTemplate.id);
            if (idx >= 0) {
              const updated: TemplateItem = {
                ...nextList[idx],
                nome: nomeFinal,
                xml: novoXml,
                json: jsonStrNovo ?? nextList[idx].json,
                xmlParts: partsFinal && partsFinal.length > 0 ? partsFinal : undefined,
              };
              nextList[idx] = updated;
              targetId = updated.id;
              setCurrentTemplate(updated);
            } else {
              const newId = 'custom-' + Date.now();
              const newTpl: TemplateItem = {
                id: newId,
                nome: nomeFinal,
                descricao: 'Modelo personalizado',
                categoria: 'Personalizados',
                xml: novoXml,
                json: jsonStrNovo,
                xmlParts: partsFinal && partsFinal.length > 0 ? partsFinal : undefined,
              };
              nextList.unshift(newTpl);
              targetId = newId;
              setCurrentTemplate(newTpl);
            }
          } else {
            const newId = 'custom-' + Date.now();
            const newTpl: TemplateItem = {
              id: newId,
              nome: nomeFinal,
              descricao: `Cópia personalizada de ${currentTemplate.nome}`,
              categoria: 'Personalizados',
              xml: novoXml,
              json: jsonStrNovo ?? currentTemplate.json,
              xmlParts: partsFinal && partsFinal.length > 0 ? partsFinal : undefined,
            };
            nextList.unshift(newTpl);
            targetId = newId;
            setCurrentTemplate(newTpl);
          }

          StorageService.saveCustomTemplates(nextList);
          StorageService.setLastTemplateId(targetId);
          return nextList;
        });

        if (onNovoEstadoGerado) {
          onNovoEstadoGerado(novoEstado);
        }

        showToast(`Modelo e dados de "${nomeFinal}" salvos com sucesso!`);
      } catch (err: any) {
        setXmlError(err.message);
        alert(`Erro ao compilar: ${err.message}`);
      }
    },
    [currentTemplate, xmlName, xmlParts, onNovoEstadoGerado, showToast]
  );

  // Carrega arquivo XML e opcionalmente preenchimento JSON e partes XML
  const carregarXmlEJson = React.useCallback(
    (novoXml: string, nomeArquivoXml: string, jsonPayload?: any, partesCarregadas?: XmlPart[]) => {
      try {
        let nomeLimpo = (nomeArquivoXml || '').trim() || 'Modelo Personalizado.xml';
        if (nomeLimpo.includes('<') || nomeLimpo.includes('\n') || nomeLimpo.length > 80) {
          nomeLimpo = 'Modelo Personalizado.xml';
        }
        if (!nomeLimpo.toLowerCase().endsWith('.xml')) {
          nomeLimpo += '.xml';
        }

        const doc = parseXmlDocument(novoXml);
        const novoModelo = criarModeloIntermediario(doc, nomeLimpo, partesCarregadas);

        let jsonPayloadStr = jsonPayload ? JSON.stringify(jsonPayload.dados ? jsonPayload.dados : jsonPayload, null, 2) : undefined;
        
        if (jsonPayloadStr) {
          StorageService.saveJsonHistory(nomeLimpo, jsonPayloadStr);
        } else {
          // If no json provided, try to load from history
          const historico = StorageService.loadJsonHistory(nomeLimpo);
          if (historico) {
            jsonPayloadStr = historico;
          }
        }

        let targetTemplate: TemplateItem = {
          id: 'custom-' + Date.now(),
          nome: nomeLimpo,
          descricao: partesCarregadas && partesCarregadas.length > 0 ? `Modelo particionado em ${partesCarregadas.length} seções` : 'Modelo personalizado importado',
          categoria: 'Personalizados',
          xml: novoXml,
          json: jsonPayloadStr,
          xmlParts: partesCarregadas && partesCarregadas.length > 0 ? partesCarregadas : undefined,
        };

        setCustomTemplates(prev => {
          const idx = prev.findIndex(t => t.nome.toLowerCase() === nomeLimpo.toLowerCase());
          let nextList = [...prev];
          if (idx >= 0) {
            targetTemplate = {
              ...prev[idx],
              xml: novoXml,
              nome: nomeLimpo,
              json: jsonPayloadStr ?? prev[idx].json,
              xmlParts: partesCarregadas && partesCarregadas.length > 0 ? partesCarregadas : prev[idx].xmlParts,
            };
            nextList[idx] = targetTemplate;
          } else {
            nextList.unshift(targetTemplate);
          }
          StorageService.saveCustomTemplates(nextList);
          return nextList;
        });

        setCurrentTemplate(targetTemplate);
        setRawXml(novoXml);
        setXmlName(nomeLimpo);
        setXmlParts(partesCarregadas && partesCarregadas.length > 0 ? partesCarregadas : null);
        setModelo(novoModelo);
        setXmlError(null);

        const novoEstado = construirEstadoInicial(novoModelo.formulario.campos);
        if (jsonPayload) {
          const dadosExtraidos = jsonPayload.dados ? jsonPayload.dados : jsonPayload;
          if (typeof dadosExtraidos === 'object' && dadosExtraidos !== null) {
            Object.keys(dadosExtraidos).forEach(k => {
              if (k in novoEstado) {
                novoEstado[k] = dadosExtraidos[k];
              }
            });
          }
        } else {
          try {
            const savedForTemplate = StorageService.loadFormData(targetTemplate.id);
            if (savedForTemplate) {
              Object.keys(novoEstado).forEach(k => {
                if (savedForTemplate[k] !== undefined) {
                  novoEstado[k] = savedForTemplate[k];
                }
              });
            }
          } catch {}
        }

        if (onNovoEstadoGerado) {
          onNovoEstadoGerado(novoEstado);
        }
        StorageService.setLastTemplateId(targetTemplate.id);
        StorageService.saveFormDataForTemplate(targetTemplate.id, novoEstado);

        if (partesCarregadas && partesCarregadas.length > 0) {
          showToast(`Documento particionado em ${partesCarregadas.length} partes ("${nomeLimpo}") carregado com sucesso!`);
        } else if (jsonPayload) {
          showToast(`Modelo "${nomeLimpo}" e dados JSON carregados juntos com sucesso!`);
        } else {
          showToast(`Modelo "${nomeLimpo}" carregado com sucesso!`);
        }
      } catch (err: any) {
        setXmlError(err.message);
        alert(`Erro ao processar modelo XML: ${err.message}`);
      }
    },
    [onNovoEstadoGerado, showToast]
  );

  // Adiciona arquivos XML adicionais silenciosamente aos templates customizados
  const adicionarTemplateSilencioso = React.useCallback((nome: string, xml: string) => {
    try {
      parseXmlDocument(xml);
      let nomeLimpo = nome.trim() || 'Modelo.xml';
      if (!nomeLimpo.toLowerCase().endsWith('.xml')) {
        nomeLimpo += '.xml';
      }
      setCustomTemplates(prev => {
        const idx = prev.findIndex(t => t.nome.toLowerCase() === nomeLimpo.toLowerCase());
        let nextList = [...prev];
        if (idx >= 0) {
          nextList[idx] = { ...prev[idx], xml, nome: nomeLimpo };
        } else {
          nextList.push({
            id: 'custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            nome: nomeLimpo,
            descricao: 'Modelo personalizado importado',
            categoria: 'Personalizados',
            xml,
          });
        }
        StorageService.saveCustomTemplates(nextList);
        return nextList;
      });
    } catch (e) {
      console.warn('Erro ao validar arquivo XML adicional:', e);
    }
  }, []);

  // Remover Template Customizado e/ou Dados
  const handleRemoveCustomTemplate = React.useCallback(
    (t: TemplateItem, removeXml: boolean, removeJson: boolean) => {
      if (removeJson) {
        StorageService.removeJsonHistory(t.nome);
      }

      setCustomTemplates(prev => {
        let next = [...prev];
        
        if (removeXml) {
          next = next.filter(item => item.id !== t.id);
        } else if (removeJson) {
          // Mantém o XML mas limpa o JSON atrelado
          const idx = next.findIndex(item => item.id === t.id);
          if (idx >= 0) {
            next[idx] = { ...next[idx], json: undefined };
          }
        }
        
        StorageService.saveCustomTemplates(next);

        if (removeXml && currentTemplate.id === t.id) {
          if (next.length > 0) {
            handleSelectTemplate(next[0]);
          } else {
            handleSelectTemplate(DEFAULT_TEMPLATES[0]);
          }
        } else if (!removeXml && removeJson && currentTemplate.id === t.id) {
          setCurrentTemplate(prevTpl => ({ ...prevTpl, json: undefined }));
        }
        
        return next;
      });
      showToast('Ação concluída com sucesso.');
    },
    [currentTemplate.id, handleSelectTemplate, showToast]
  );

  return {
    customTemplates,
    currentTemplate,
    rawXml,
    xmlName,
    xmlParts,
    modelo,
    xmlError,
    aplicarNovoXmlEJson,
    handleSelectTemplate,
    adicionarTemplateSilencioso,
    handleRemoveCustomTemplate,
    carregarXmlEJson,
  };
}
