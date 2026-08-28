import React from 'react';
import { DocumentViewer } from './components/DocumentViewer';
import { ModelModal } from './components/ModelModal';
import { SidebarToolbar } from './components/SidebarToolbar';
import { Sidebar } from './components/Sidebar';
import { XmlEditorModal } from './components/XmlEditorModal';
import { DEFAULT_TEMPLATES, TemplateItem } from './data/defaultTemplates';
import { FilePackageService } from './services/filePackageService';
import { StorageService, UserPreferences } from './services/storageService';
import { IntermediateModel } from './types';
import { exportarParaPdf, imprimirDocumentoIsolado } from './utils/pdfExporter';
import { exportarParaWord } from './utils/wordExporter';
import { construirEstadoInicial, criarModeloIntermediario, parseXmlDocument } from './utils/xmlParser';

export default function App() {
  // 1. Carregamento inicial de preferências unificadas
  const initialPrefs = React.useMemo(() => StorageService.loadPreferences(), []);

  const [customTemplates, setCustomTemplates] = React.useState<TemplateItem[]>(() => 
    StorageService.loadCustomTemplates()
  );

  const [currentTemplate, setCurrentTemplate] = React.useState<TemplateItem>(() => {
    try {
      const savedId = StorageService.getLastTemplateId();
      const customList = StorageService.loadCustomTemplates();

      if (savedId) {
        const foundCustom = customList.find(t => t.id === savedId);
        if (foundCustom) return foundCustom;

        const foundDefault = DEFAULT_TEMPLATES.find(t => t.id === savedId);
        if (foundDefault) return foundDefault;
      }

      if (customList.length > 0) {
        return customList[0];
      }
    } catch {}
    return DEFAULT_TEMPLATES[0];
  });

  const [rawXml, setRawXml] = React.useState<string>(() => currentTemplate.xml);
  const [xmlName, setXmlName] = React.useState<string>(() => currentTemplate.nome);

  const [modelo, setModelo] = React.useState<IntermediateModel | null>(() => {
    try {
      const doc = parseXmlDocument(currentTemplate.xml);
      return criarModeloIntermediario(doc, currentTemplate.nome);
    } catch (e) {
      console.error(e);
      return null;
    }
  });

  const [dados, setDados] = React.useState<Record<string, any>>(() => {
    try {
      const savedForTemplate = StorageService.loadFormData(currentTemplate.id);
      if (savedForTemplate && Object.keys(savedForTemplate).length > 0) {
        return savedForTemplate;
      }
    } catch {}
    if (modelo) return modelo.dados;
    return {};
  });

  // Preferências de interface unificadas
  const [sidebarWidth, setSidebarWidth] = React.useState<number>(initialPrefs.sidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(initialPrefs.sidebarCollapsed);
  const [isResizing, setIsResizing] = React.useState(false);

  const [zoomA4, setZoomA4] = React.useState<number>(initialPrefs.zoomA4);
  const [zoomFluido, setZoomFluido] = React.useState<number>(initialPrefs.zoomFluido);
  const [modoA4, setModoA4] = React.useState<boolean>(initialPrefs.modoA4);
  const [copiado, setCopiado] = React.useState<boolean>(false);

  const [variaveisVermelhasWord, setVariaveisVermelhasWord] = React.useState<boolean>(initialPrefs.variaveisVermelhasWord);
  const [numeracaoAtiva, setNumeracaoAtiva] = React.useState<boolean>(initialPrefs.numeracaoAtiva);
  const [irParaCampoAtivo, setIrParaCampoAtivo] = React.useState<boolean>(initialPrefs.irParaCampoAtivo);
  const [irParaDocumentoAtivo, setIrParaDocumentoAtivo] = React.useState<boolean>(initialPrefs.irParaDocumentoAtivo);
  const [edicaoInline, setEdicaoInline] = React.useState<boolean>(initialPrefs.edicaoInline);

  // Focus & Highlights
  const [ultimoCampoAlterado, setUltimoCampoAlterado] = React.useState<string | null>(null);
  const [versaoCampoAlterado, setVersaoCampoAlterado] = React.useState(0);
  const [origemCampoAlterado, setOrigemCampoAlterado] = React.useState<string | null>(null);
  const [campoFocadoDoc, setCampoFocadoDoc] = React.useState<{ id: string; timestamp: number } | null>(null);
  const [campoFocadoSidebar, setCampoFocadoSidebar] = React.useState<{ id: string; timestamp: number } | null>(null);

  // Modals
  const [isModelModalOpen, setIsModelModalOpen] = React.useState(false);
  const [isXmlEditorOpen, setIsXmlEditorOpen] = React.useState(false);

  // Drag overlay & Toast
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Re-compila quando XML muda, é renomeado ou dados JSON são editados no Editor de Código
  const aplicarNovoXmlEJson = React.useCallback((novoXml: string, novosDados: Record<string, any>, novoNome?: string) => {
    try {
      let nomeFinal = (novoNome && novoNome.trim()) ? novoNome.trim() : xmlName;
      if (!nomeFinal.toLowerCase().endsWith('.xml')) {
        nomeFinal += '.xml';
      }

      const doc = parseXmlDocument(novoXml);
      const novoModelo = criarModeloIntermediario(doc, nomeFinal);
      setRawXml(novoXml);
      setXmlName(nomeFinal);
      setModelo(novoModelo);

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
            };
            nextList.unshift(newTpl);
            targetId = newId;
            setCurrentTemplate(newTpl);
          }
        } else {
          // Editou um Modelo Pronto -> cria uma cópia em Seus Templates
          const newId = 'custom-' + Date.now();
          const newTpl: TemplateItem = {
            id: newId,
            nome: nomeFinal,
            descricao: `Cópia personalizada de ${currentTemplate.nome}`,
            categoria: 'Personalizados',
            xml: novoXml,
          };
          nextList.unshift(newTpl);
          targetId = newId;
          setCurrentTemplate(newTpl);
        }

        StorageService.saveCustomTemplates(nextList);
        StorageService.setLastTemplateId(targetId);

        return nextList;
      });

      // Preserva e mescla os dados preenchidos com os novos dados recebidos do editor
      setDados(prev => {
        const novoEstado = construirEstadoInicial(novoModelo.formulario.campos);
        Object.keys(novoEstado).forEach(k => {
          if (novosDados[k] !== undefined) {
            novoEstado[k] = novosDados[k];
          } else if (prev[k] !== undefined) {
            novoEstado[k] = prev[k];
          }
        });
        // Preserva também chaves extras se fornecidas no JSON
        Object.keys(novosDados).forEach(k => {
          if (novoEstado[k] === undefined) {
            novoEstado[k] = novosDados[k];
          }
        });
        return novoEstado;
      });

      showToast(`Modelo e dados de "${nomeFinal}" salvos com sucesso!`);
    } catch (err: any) {
      alert(`Erro ao compilar: ${err.message}`);
    }
  }, [currentTemplate, xmlName]);

  // Salva no LocalStorage dados preenchidos do template ativo
  React.useEffect(() => {
    StorageService.saveFormDataForTemplate(currentTemplate.id, dados);
  }, [dados, currentTemplate.id]);

  // Salva preferências de interface de forma unificada sempre que houver alteração
  React.useEffect(() => {
    if (isResizing) return;
    const currentPrefs: UserPreferences = {
      sidebarWidth,
      sidebarCollapsed,
      irParaCampoAtivo,
      irParaDocumentoAtivo,
      edicaoInline,
      variaveisVermelhasWord,
      numeracaoAtiva,
      modoA4,
      zoomA4,
      zoomFluido,
    };
    StorageService.savePreferences(currentPrefs);
  }, [
    sidebarWidth,
    sidebarCollapsed,
    irParaCampoAtivo,
    irParaDocumentoAtivo,
    edicaoInline,
    variaveisVermelhasWord,
    numeracaoAtiva,
    modoA4,
    zoomA4,
    zoomFluido,
    isResizing,
  ]);

  // Redimensionamento do divisor da barra lateral
  const startResizing = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(280, Math.min(e.clientX, window.innerWidth - 350));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Referência para impedir que o foco vindo do documento ou reativação de aba faça o documento pular
  const bloquearScrollDocAte = React.useRef(0);

  // Previne deslocamento involuntário quando a janela ganha foco ou ao alternar abas
  React.useEffect(() => {
    const handleWindowFocus = () => {
      bloquearScrollDocAte.current = Date.now() + 1000;
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        bloquearScrollDocAte.current = Date.now() + 1000;
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Copiar todo o texto gerado
  const handleCopiarTexto = React.useCallback(async () => {
    const docElement = document.getElementById('documento-visualizado');
    if (!docElement) return;
    const text = docElement.innerText;
    try {
      await navigator.clipboard.writeText(text);
      setCopiado(true);
      showToast('Texto do documento copiado para a área de transferência!');
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback para seleção manual
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiado(true);
      showToast('Texto copiado com sucesso!');
      setTimeout(() => setCopiado(false), 2500);
    }
  }, []);

  // Atualização de campos com emissão de destaque
  const handleUpdateField = React.useCallback((id: string, value: any, origem = 'painel') => {
    setDados(prev => ({ ...prev, [id]: value }));
    setUltimoCampoAlterado(id);
    setOrigemCampoAlterado(origem);
    setVersaoCampoAlterado(v => v + 1);
  }, []);

  // Foco acionado ao clicar no campo do Sidebar -> rola para o documento se ativo
  const handleFocusFieldFromSidebar = React.useCallback((fieldId: string) => {
    if (Date.now() < bloquearScrollDocAte.current) return;
    setCampoFocadoDoc({ id: fieldId, timestamp: Date.now() });
  }, [irParaDocumentoAtivo]);

  // Foco acionado ao clicar na variável ou condição If do Documento -> abre a seção e rola suavemente no Sidebar
  const handleFocusFieldInSidebar = (fieldId: string) => {
    if (!irParaCampoAtivo) return;
    // Bloqueia qualquer rolagem de volta no documento disparada pelo foco do input
    bloquearScrollDocAte.current = Date.now() + 1200;
    if (sidebarCollapsed) setSidebarCollapsed(false);
    setCampoFocadoSidebar({ id: fieldId, timestamp: Date.now() });
  };

  // Troca de Template (seja Modelo Pronto ou Customizado)
  const handleSelectTemplate = React.useCallback((template: TemplateItem) => {
    try {
      const doc = parseXmlDocument(template.xml);
      const novoModelo = criarModeloIntermediario(doc, template.nome);

      setCurrentTemplate(template);
      setRawXml(template.xml);
      setXmlName(template.nome);
      setModelo(novoModelo);

      // Constrói estado inicial dos campos do formulário
      const novoEstado = construirEstadoInicial(novoModelo.formulario.campos);
      try {
        const savedForTemplate = StorageService.loadFormData(template.id);
        if (savedForTemplate) {
          Object.keys(novoEstado).forEach(k => {
            if (savedForTemplate[k] !== undefined) {
              novoEstado[k] = savedForTemplate[k];
            }
          });
        }
      } catch {}

      setDados(novoEstado);
      StorageService.setLastTemplateId(template.id);

      showToast(`Modelo "${template.nome}" selecionado.`);
    } catch (err: any) {
      alert(`Erro ao abrir modelo: ${err.message}`);
    }
  }, []);

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

  // Remover Template Customizado
  const handleRemoveCustomTemplate = React.useCallback((id: string) => {
    setCustomTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      StorageService.saveCustomTemplates(next);

      if (currentTemplate.id === id) {
        if (next.length > 0) {
          handleSelectTemplate(next[0]);
        } else {
          handleSelectTemplate(DEFAULT_TEMPLATES[0]);
        }
      }
      return next;
    });
    showToast('Template removido com sucesso.');
  }, [currentTemplate.id, handleSelectTemplate]);

  // Função centralizada para carregar XML e (opcionalmente) os dados JSON juntos
  const carregarXmlEJson = React.useCallback((novoXml: string, nomeArquivoXml: string, jsonPayload?: any) => {
    try {
      const doc = parseXmlDocument(novoXml);
      let nomeLimpo = nomeArquivoXml.trim() || 'Modelo Personalizado.xml';
      if (!nomeLimpo.toLowerCase().endsWith('.xml')) {
        nomeLimpo += '.xml';
      }
      const novoModelo = criarModeloIntermediario(doc, nomeLimpo);

      let targetTemplate: TemplateItem = {
        id: 'custom-' + Date.now(),
        nome: nomeLimpo,
        descricao: 'Modelo personalizado importado',
        categoria: 'Personalizados',
        xml: novoXml,
      };

      setCustomTemplates(prev => {
        const idx = prev.findIndex(t => t.nome.toLowerCase() === nomeLimpo.toLowerCase());
        let nextList = [...prev];
        if (idx >= 0) {
          targetTemplate = {
            ...prev[idx],
            xml: novoXml,
            nome: nomeLimpo,
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
      setModelo(novoModelo);

      // Constrói estado inicial dos campos do formulário
      const novoEstado = construirEstadoInicial(novoModelo.formulario.campos);
      
      // Se houver dados JSON fornecidos, preenche os campos correspondentes
      if (jsonPayload) {
        const dadosExtraidos = jsonPayload.dados ? jsonPayload.dados : jsonPayload;
        if (typeof dadosExtraidos === 'object' && dadosExtraidos !== null) {
          Object.keys(dadosExtraidos).forEach(k => {
            novoEstado[k] = dadosExtraidos[k];
          });
        }
      } else {
        // Tenta recuperar dados previamente salvos deste template se já existia
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

      setDados(novoEstado);
      StorageService.setLastTemplateId(targetTemplate.id);
      StorageService.saveFormDataForTemplate(targetTemplate.id, novoEstado);

      if (jsonPayload) {
        showToast(`Modelo "${nomeLimpo}" e dados JSON carregados juntos com sucesso!`);
      } else {
        showToast(`Modelo "${nomeLimpo}" carregado com sucesso!`);
      }
    } catch (err: any) {
      alert(`Erro ao processar modelo XML: ${err.message}`);
    }
  }, []);

  // Processa arquivo ZIP contendo XML e JSON
  const processarArquivoZip = React.useCallback(async (file: File) => {
    try {
      showToast('Lendo pacote ZIP...');
      const { xmlText, xmlFileName, jsonData } = await FilePackageService.parseZipPackage(file);

      if (xmlText) {
        carregarXmlEJson(xmlText, xmlFileName, jsonData);
        showToast(`Pacote ZIP "${file.name}" carregado com sucesso!`);
      } else if (jsonData) {
        const payload = jsonData.dados ? jsonData.dados : jsonData;
        setDados(prev => ({ ...prev, ...payload }));
        showToast('Preenchimento JSON do arquivo ZIP importado com sucesso!');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao ler arquivo ZIP: ' + err.message);
    }
  }, [carregarXmlEJson]);

  // Upload de arquivo XML (ou ZIP caso selecionado)
  const handleUploadXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')) {
      await processarArquivoZip(file);
      e.target.value = '';
      return;
    }

    try {
      const content = await FilePackageService.readFileAsText(file);
      if (content) {
        carregarXmlEJson(content, file.name);
      }
    } catch (err: any) {
      alert('Erro ao ler arquivo XML: ' + err.message);
    }
    e.target.value = '';
  };

  // Upload de pacote ZIP
  const handleUploadZip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processarArquivoZip(file);
    e.target.value = '';
  };

  // Upload de arquivo JSON com dados
  const handleUploadJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await FilePackageService.readFileAsText(file);
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        const payload = parsed.dados ? parsed.dados : parsed;
        setDados(prev => ({ ...prev, ...payload }));
        showToast('Preenchimento JSON importado com sucesso!');
      }
    } catch (err: any) {
      alert('Arquivo JSON inválido: ' + err.message);
    }
    e.target.value = '';
  };

  // Salvar JSON de preenchimento
  const handleSaveJson = () => {
    FilePackageService.exportJsonData(xmlName, dados);
    showToast('Arquivo JSON baixado!');
  };

  // Salvar Pacote ZIP contendo XML + JSON juntos
  const handleSaveZip = async () => {
    try {
      showToast('Empacotando modelo XML e preenchimento JSON...');
      await FilePackageService.exportZipPackage(xmlName, rawXml, dados);
      showToast('Pacote ZIP (XML + JSON) baixado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar pacote ZIP: ' + err.message);
    }
  };

  // Exportar Word (.docx) - Gerado a partir do HTML Renderizado no DOM com fidelidade tipográfica e tema centralizado
  const handleExportWord = async () => {
    const docElement = (document.getElementById('documento-visualizado') ||
      document.querySelector('.document-content-a4, .print\\:p-0 > div')) as HTMLElement;
    if (!docElement) {
      alert('Elemento visual do documento não encontrado no DOM.');
      return;
    }
    try {
      showToast('Gerando documento Word formatado...');
      await exportarParaWord(docElement, `${xmlName.replace(/\.xml$/i, '')}.docx`, {
        ativarNumeracaoDocumento: numeracaoAtiva,
        variaveisVermelhas: variaveisVermelhasWord,
      });
      showToast('Documento Word (.docx) gerado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar documento Word: ' + err.message);
    }
  };

  // Exportar PDF (.pdf) - Gerado a partir do HTML Renderizado no DOM com texto vetorial e paridade com o Word
  const handleExportPdf = async () => {
    const docElement = (document.getElementById('documento-visualizado') ||
      document.querySelector('.document-content-a4, .print\\:p-0 > div')) as HTMLElement;
    if (!docElement) {
      alert('Elemento visual do documento não encontrado no DOM.');
      return;
    }
    try {
      showToast('Gerando arquivo PDF vetorial...');
      await exportarParaPdf(docElement, `${xmlName.replace(/\.xml$/i, '')}.pdf`, {
        ativarNumeracaoDocumento: numeracaoAtiva,
        variaveisVermelhas: variaveisVermelhasWord,
      });
      showToast('Arquivo PDF (.pdf) gerado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      if (docElement) {
        imprimirDocumentoIsolado(docElement, xmlName);
      } else {
        window.print();
      }
    }
  };

  // Imprimir documento
  const handlePrint = () => {
    const docElement = (document.getElementById('documento-visualizado') ||
      document.querySelector('.document-content-a4, .print\\:p-0 > div')) as HTMLElement;
    if (docElement) {
      imprimirDocumentoIsolado(docElement, xmlName);
    } else {
      window.print();
    }
  };

  // Limpar formulário
  const handleClearForm = () => {
    if (!modelo) return;
    if (confirm(`Deseja limpar todos os dados preenchidos no documento "${xmlName}"?`)) {
      setDados(construirEstadoInicial(modelo.formulario.campos));
      showToast('Formulário limpo com sucesso.');
    }
  };

  // Drag and Drop de múltiplos arquivos (.xml, .json ou pacote .zip)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const files: File[] = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    // 1. Caso haja um arquivo ZIP arrastado
    const zipFile = files.find(f => f.name.toLowerCase().endsWith('.zip') || f.type.includes('zip'));
    if (zipFile) {
      await processarArquivoZip(zipFile);
      return;
    }

    // 2. Procura se há XML e JSON entre os arquivos arrastados
    const xmlFile = files.find(f => f.name.toLowerCase().endsWith('.xml') || f.type.includes('xml'));
    const jsonFile = files.find(f => f.name.toLowerCase().endsWith('.json') || f.type.includes('json'));

    // 2a. Ambos XML e JSON foram arrastados juntos
    if (xmlFile && jsonFile) {
      try {
        const xmlText = await xmlFile.text();
        const jsonText = await jsonFile.text();
        let jsonData = null;
        try {
          jsonData = JSON.parse(jsonText);
        } catch (err: any) {
          console.warn('JSON inválido arrastado:', err);
        }
        carregarXmlEJson(xmlText, xmlFile.name, jsonData);
      } catch (err: any) {
        alert('Erro ao ler arquivos arrastados: ' + err.message);
      }
      return;
    }

    // 2b. Apenas arquivo(s) XML arrastado(s)
    if (xmlFile) {
      try {
        const xmlText = await xmlFile.text();
        carregarXmlEJson(xmlText, xmlFile.name);
        
        // Se houver múltiplos XMLs arrastados, adiciona os outros na lista de templates customizados
        const outrosXmls = files.filter(f => f !== xmlFile && (f.name.toLowerCase().endsWith('.xml') || f.type.includes('xml')));
        for (const outro of outrosXmls) {
          const outroTexto = await outro.text();
          adicionarTemplateSilencioso(outro.name, outroTexto);
        }
      } catch (err: any) {
        alert('Erro ao ler arquivo XML: ' + err.message);
      }
      return;
    }

    // 2c. Apenas arquivo JSON arrastado
    if (jsonFile) {
      try {
        const jsonText = await jsonFile.text();
        const parsed = JSON.parse(jsonText);
        const payload = parsed.dados ? parsed.dados : parsed;
        setDados(prev => ({ ...prev, ...payload }));
        showToast('Preenchimento JSON carregado com sucesso!');
      } catch (err: any) {
        alert('Erro ao carregar JSON: ' + err.message);
      }
      return;
    }

    alert('Por favor, solte arquivos válidos (.xml, .json ou pacote .zip).');
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans select-none"
    >
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Drag & Drop Visual Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-blue-600/20 backdrop-blur-xs border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-blue-200 text-center space-y-2 max-w-sm mx-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
              +
            </div>
            <h3 className="text-base font-bold text-slate-800">Solte os arquivos aqui</h3>
            <p className="text-xs text-slate-500">
              Arraste XML, JSON, ambos juntos (XML + JSON) ou um Pacote ZIP (.zip) para carregamento automático.
            </p>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      

      {/* Work Area Split Screen */}
      <div className="flex-1 flex overflow-hidden relative">
        {modelo ? (
          <>
            {/* Form Sidebar */}
            <Sidebar
              estrutura={modelo.formulario}
              dados={dados}
              onChange={handleUpdateField}
              onFieldFocus={handleFocusFieldFromSidebar}
              campoFocadoSidebar={campoFocadoSidebar}
              deslocarSidebar={irParaCampoAtivo}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              sidebarWidth={sidebarWidth}
              headerActions={
                <SidebarToolbar
                  customTemplates={customTemplates}
                  onRemoveCustomTemplate={handleRemoveCustomTemplate}
                  currentXmlName={xmlName}
                  onSelectTemplate={handleSelectTemplate}
                  onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                  onUploadXml={handleUploadXml}
                  onUploadJson={handleUploadJson}
                  onUploadZip={handleUploadZip}
                  onSaveJson={handleSaveJson}
                  onSaveZip={handleSaveZip}
                  onExportWord={handleExportWord}
                  onExportPdf={handleExportPdf}
                  onPrint={handlePrint}
                  onOpenXmlEditor={() => setIsXmlEditorOpen(true)}
                  onOpenModelModal={() => setIsModelModalOpen(true)}
                  onClearForm={handleClearForm}
                  variaveisVermelhasWord={variaveisVermelhasWord}
                  onToggleVariaveisVermelhas={() => setVariaveisVermelhasWord(v => !v)}
                  numeracaoAtiva={numeracaoAtiva}
                  onToggleNumeracao={() => setNumeracaoAtiva(!numeracaoAtiva)}
                  edicaoInline={edicaoInline}
                  onToggleEdicaoInline={() => setEdicaoInline(!edicaoInline)}
                  irParaCampoAtivo={irParaCampoAtivo}
                  onToggleIrParaCampo={() => {
                    setIrParaCampoAtivo(prev => {
                      const next = !prev;
                      showToast(next ? 'Ir para o Campo: Ativado (←)' : 'Ir para o Campo: Desativado');
                      return next;
                    });
                  }}
                  irParaDocumentoAtivo={irParaDocumentoAtivo}
                  onToggleIrParaDocumento={() => {
                    setIrParaDocumentoAtivo(prev => {
                      const next = !prev;
                      showToast(next ? 'Ir para o Documento: Ativado (→)' : 'Ir para o Documento: Desativado');
                      return next;
                    });
                  }}
                  modoA4={modoA4}
                  onToggleModoA4={() => setModoA4(m => !m)}
                  collapsed={sidebarCollapsed}
                  zoom={modoA4 ? zoomA4 : zoomFluido}
                  onZoomIn={() => {
                    if (modoA4) {
                      setZoomA4(z => Math.min(200, z + 10));
                    } else {
                      setZoomFluido(z => Math.min(200, z + 10));
                    }
                  }}
                  onZoomOut={() => {
                    if (modoA4) {
                      setZoomA4(z => Math.max(50, z - 10));
                    } else {
                      setZoomFluido(z => Math.max(50, z - 10));
                    }
                  }}
                  onResetZoom={() => {
                    if (modoA4) {
                      setZoomA4(100);
                      showToast('Zoom da página A4 restaurado para 100%');
                    } else {
                      setZoomFluido(100);
                      showToast('Tamanho da fonte restaurado para 100%');
                    }
                  }}
                  onCopiarTexto={handleCopiarTexto}
                  copiado={copiado}
                />
              }
            />

            {/* Drag Resizer Divider Bar */}
            {!sidebarCollapsed && (
              <div
                onMouseDown={startResizing}
                onDoubleClick={() => {
                  const defaultWidth = Math.round(window.innerWidth * 0.33);
                  setSidebarWidth(Math.max(280, Math.min(defaultWidth, 800)));
                  showToast('Largura do formulário restaurada para 33%');
                }}
                className={`w-[2px] hover:w-[4px] bg-slate-300 hover:bg-blue-500 cursor-col-resize shrink-0 transition-all z-20 relative group ${
                  isResizing ? 'bg-blue-600 w-[4px]' : ''
                }`}
                title="Arraste para redimensionar (Duplo clique para restaurar 33%)"
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </div>
            )}

            {/* Live Document Viewer Area */}
            <DocumentViewer
              conteudo={modelo.conteudo}
              dados={dados}
              estrutura={modelo.formulario}
              ultimoCampoAlterado={ultimoCampoAlterado}
              versaoCampoAlterado={versaoCampoAlterado}
              origemCampoAlterado={origemCampoAlterado}
              campoFocadoDoc={campoFocadoDoc}
              onFocusField={handleFocusFieldInSidebar}
              onUpdateField={handleUpdateField}
              numeracaoAtiva={numeracaoAtiva}
              edicaoInline={edicaoInline}
              irParaCampoAtivo={irParaCampoAtivo}
              deslocarDocumento={irParaDocumentoAtivo}
              variaveisVermelhasWord={variaveisVermelhasWord}
              nomeDocumento={xmlName}
              zoom={modoA4 ? zoomA4 : zoomFluido}
              modoA4={modoA4}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <p className="text-sm font-semibold text-slate-700">Erro ao carregar o template XML.</p>
            <p className="text-xs mt-1">Abra o editor de código para verificar e corrigir a estrutura.</p>
            <button
              type="button"
              onClick={() => setIsXmlEditorOpen(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-500 transition"
            >
              Abrir Editor de Código (XML & JSON)
            </button>
          </div>
        )}
      </div>

      {/* Variables & Model Inspector Modal */}
      {modelo && (
        <ModelModal
          isOpen={isModelModalOpen}
          onClose={() => setIsModelModalOpen(false)}
          modelo={{ ...modelo, dados }}
          rawXml={rawXml}
          xmlName={xmlName}
          onUpdateField={handleUpdateField}
          onUpdateMultipleFields={(novosDados) => {
            setDados(prev => ({
              ...prev,
              ...novosDados,
            }));
            showToast('Dados atualizados com sucesso!');
          }}
          onApplyAll={aplicarNovoXmlEJson}
          onApplyXml={(novoXml, novoNome) => aplicarNovoXmlEJson(novoXml, dados, novoNome)}
        />
      )}

      {/* Real-time Code Source Editor Modal (XML & JSON) */}
      <XmlEditorModal
        isOpen={isXmlEditorOpen}
        onClose={() => setIsXmlEditorOpen(false)}
        xmlContent={rawXml}
        dadosContent={dados}
        onApply={aplicarNovoXmlEJson}
        xmlName={xmlName}
      />
    </div>
  );
}
