import React, { useState, useEffect } from 'react';
import {
  atendimentoService,
  AIAgentConfig,
  TokenMetrics,
} from '../../services/atendimentoService';
import {
  Bot,
  Zap,
  Sliders,
  Clock,
  MessageSquare,
  ShieldCheck,
  Save,
  CheckCircle2,
  Sparkles,
  TrendingDown,
  Cpu,
  Layers,
  ArrowRight,
  HelpCircle,
  Play,
  RotateCcw,
} from 'lucide-react';

interface AiAgentConfigViewProps {
  onNavigateToAtendimento?: () => void;
  onNavigateToRadar?: () => void;
}

export const AiAgentConfigView: React.FC<AiAgentConfigViewProps> = ({
  onNavigateToAtendimento,
  onNavigateToRadar,
}) => {
  const [config, setConfig] = useState<AIAgentConfig>({
    enabled: true,
    mode: 'auto',
    agentName: 'Sofia',
    companyName: 'Nxs Divulgação',
    companyPitch:
      'Ajudamos prestadores de serviço, autônomos e pequenos comércios a automatizarem suas divulgações em grupos de WhatsApp no piloto automático.',
    step1GreetingTemplate: 'Bom dia!',
    step2ContextTemplate: 'Bom dia! Vi sua mensagem no grupo {grupo} divulgando {demanda}. É você quem cuida dessa parte?',
    step3PitchTemplate:
      'Legal! Nós temos uma ferramenta que automatiza a postagem em dezenas de grupos do WhatsApp todos os dias, sem você precisar ficar postando manualmente. Você já usa algo automático ou faz na mão?',
    followUp1Hours: 2,
    followUp1Template:
      'Oi, tudo bem?\n\nPassando só para ver se conseguiu dar uma olhada na mensagem anterior. Fico à total disposição para tirar qualquer dúvida!',
    followUp2Days: 2,
    followUp2Template:
      'Olá! Tudo bem?\n\nNão quero ser inconveniente! Esse será meu último contato por aqui. Se ainda fizer sentido automatizar suas postagens nos grupos e atrair mais clientes, me avise por aqui. Um abraço!',
    operatingHours: {
      enabled: false,
      start: '08:00',
      end: '20:00',
    },
    triggerKeywordsHuman: ['humano', 'atendente', 'falar com pessoa', 'suporte humano', 'preço final', 'cancelar', 'suporte'],
    saveMemories: true,
  });

  const [metrics, setMetrics] = useState<TokenMetrics>({
    totalInspected: 1420,
    rejectedSocial: 680,
    rejectedSpam: 290,
    rejectedTooShort: 310,
    rejectedNoCommercial: 110,
    totalTokensSaved: 625500,
    acceptedCandidates: 30,
    totalAiCalls: 18,
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Simulator state
  const [simName, setSimName] = useState('Carlos');
  const [simGroup, setSimGroup] = useState('Feira do Rolo & Negócios ES');
  const [simDemand, setSimDemand] = useState('serviços de eletricista e instalações');

  // Load config & metrics on mount
  useEffect(() => {
    atendimentoService.getConfig().then((res) => {
      if (res) setConfig(res);
    });

    atendimentoService.getTokenMetrics().then((res) => {
      if (res && res.totalInspected > 0) {
        setMetrics(res);
      }
    });

    const interval = setInterval(() => {
      atendimentoService.getTokenMetrics().then((res) => {
        if (res && res.totalInspected > 0) setMetrics(res);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await atendimentoService.updateConfig(config);
      if (updated) {
        setConfig(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  // Simulation interpolation
  const renderPreview = (template: string) => {
    return template
      .replace(/{nome}/g, simName || 'Lead')
      .replace(/{grupo}/g, simGroup || 'Grupo WhatsApp')
      .replace(/{demanda}/g, simDemand || 'Serviço Comercial');
  };

  // Token savings calculations
  const totalFiltered = metrics.rejectedSocial + metrics.rejectedSpam + metrics.rejectedTooShort + metrics.rejectedNoCommercial;
  const savingsPercent = metrics.totalInspected > 0
    ? Math.round((totalFiltered / metrics.totalInspected) * 100)
    : 95;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8faf9] overflow-y-auto">
      {/* Header */}
      <header className="px-8 py-6 bg-white border-b border-[#eaefec] flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Configuração do Agente IA & Automação</h1>
              <p className="text-xs text-gray-500">
                Gerencie as regras de atendimento automático no WhatsApp, réguas de follow-up e filtros de tokens
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToAtendimento && (
            <button
              onClick={onNavigateToAtendimento}
              className="px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
            >
              Ir para CRM Atendimento
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {saving ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saveSuccess ? 'Salvo com sucesso!' : 'Salvar Regras'}</span>
          </button>
        </div>
      </header>

      {/* Content Container */}
      <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
        {/* Banner: Token-Saver Intelligence Telemetry */}
        <section className="bg-linear-to-r from-emerald-900 to-teal-950 rounded-2xl p-6 text-white shadow-sm border border-emerald-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-800/60 text-emerald-200 border border-emerald-700">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                Motor Pré-Filtro Inteligente (Zero Tokens)
              </div>
              <h3 className="text-base font-bold text-white pt-1">
                Economia Real de Tokens & Proteção Contra Custo Excessivo
              </h3>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                Cada mensagem que chega nos grupos passa primeiro por uma validação léxica determinística. Saudações triviais ("bom dia", "amém"), spam e figurinhas são descartadas com <strong>0 tokens gastos</strong>, chamando a IA apenas quando há intenção comercial real.
              </p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              <div className="bg-emerald-800/40 border border-emerald-700/50 rounded-xl p-3 text-center">
                <span className="text-[10px] text-emerald-300 uppercase font-semibold">Mensagens Inspecionadas</span>
                <p className="text-lg font-extrabold text-white mt-0.5">{metrics.totalInspected}</p>
              </div>

              <div className="bg-emerald-800/40 border border-emerald-700/50 rounded-xl p-3 text-center">
                <span className="text-[10px] text-emerald-300 uppercase font-semibold">Filtradas (0 Tokens)</span>
                <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{totalFiltered}</p>
              </div>

              <div className="bg-emerald-800/40 border border-emerald-700/50 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] text-emerald-300 uppercase font-semibold">Tokens Poupados</span>
                <p className="text-lg font-extrabold text-teal-300 mt-0.5">
                  ~{(metrics.totalTokensSaved || totalFiltered * 450).toLocaleString()}
                </p>
                <span className="text-[9px] text-emerald-300/80 font-medium">({savingsPercent}% economia)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Master AI Activation Switch & Mode */}
        <section className="bg-white rounded-2xl p-6 border border-[#eaefec] shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                Atendimento Automático pelo WhatsApp
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Quando o Radar qualifica uma oportunidade, a IA inicia o contato e gerencia a régua de follow-up
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setConfig({ ...config, mode: 'auto' })}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                config.mode === 'auto'
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">Piloto Automático (Recomendado)</span>
                {config.mode === 'auto' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                A IA Sofia envia a abordagem inicial no WhatsApp imediatamente após a qualificação pelo Radar e agenda os follow-ups.
              </p>
            </div>

            <div
              onClick={() => setConfig({ ...config, mode: 'copilot' })}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                config.mode === 'copilot'
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">Modo Copiloto (Revisão Humana)</span>
                {config.mode === 'copilot' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                A IA redige o rascunho de abordagem e adiciona na conversa no CRM Atendimento para você aprovar e enviar com 1 clique.
              </p>
            </div>
          </div>
        </section>

        {/* Identity & Company Pitch */}
        <section className="bg-white rounded-2xl p-6 border border-[#eaefec] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-600" />
            Identidade do Atendente & Apresentação Comercial
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nome da Atendente Virtual
              </label>
              <input
                type="text"
                value={config.agentName}
                onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                placeholder="Sofia"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nome da Empresa
              </label>
              <input
                type="text"
                value={config.companyName}
                onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                placeholder="Nexus Digital"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Proposta de Valor / Pitch Comercial
              </label>
              <textarea
                rows={2}
                value={config.companyPitch}
                onChange={(e) => setConfig({ ...config, companyPitch: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                placeholder="Nós ajudamos empresas locais a serem reconhecidas e encontradas na internet e no Google..."
              />
            </div>
          </div>
        </section>

        {/* Message Templates & Follow-up Rule */}
        <section className="bg-white rounded-2xl p-6 border border-[#eaefec] shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Fluxo Humano Passo a Passo & Memória da IA
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              A IA não despeja textões de vendas de uma vez. Ela inicia com calma e educação, avança conforme o cliente responde e guarda informações importantes na memória.
            </p>
          </div>

          {/* 1. Passo 1 - Saudação Inicial */}
          <div className="space-y-2 p-4 rounded-xl bg-emerald-50/40 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                Primeira Mensagem: Saudação Pura ("Bom dia!")
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Disparo Imediato & Aguarda
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              A IA NÃO diz "Bom dia, [nome]". Envia apenas "Bom dia!" e aguarda a pessoa responder antes de qualquer continuidade.
            </p>
            <input
              type="text"
              value={config.step1GreetingTemplate || 'Bom dia!'}
              onChange={(e) => setConfig({ ...config, step1GreetingTemplate: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-medium text-gray-900"
            />
          </div>

          {/* 2. Passo 2 - Continuação Natural */}
          <div className="space-y-2 p-4 rounded-xl bg-blue-50/40 border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                Continuação Natural: Resposta Contextual
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                Após Cliente Responder
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Se a pessoa responder "Bom dia, tudo bem?" ou "Em que posso ajudar?", a IA responde naturalmente e descobre o nome se ainda não souber.
            </p>
            <textarea
              rows={2}
              value={config.step2ContextTemplate || ''}
              onChange={(e) => setConfig({ ...config, step2ContextTemplate: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 3. Passo 3 - Proposta Consultiva & Sondagem */}
          <div className="space-y-2 p-4 rounded-xl bg-purple-50/40 border border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                Contexto do Grupo & Sondagem Consultiva
              </span>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                Condução Dinâmica
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Sem engessamento. A IA analisa todo o histórico da conversa antes de cada resposta, responde perguntas feitas antes de continuar e adapta o tom.
            </p>
            <textarea
              rows={2}
              value={config.step3PitchTemplate || ''}
              onChange={(e) => setConfig({ ...config, step3PitchTemplate: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-purple-300 rounded-lg focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Memória & Revisão de Conversa */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Revisão Contínua do Diálogo & Memória de Atendimento
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  A IA lê todo o histórico do chat antes de cada nova resposta para nunca esquecer do que já foi falado e extrai dados (nome da empresa, dor, região).
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.saveMemories !== false}
                onChange={(e) => setConfig({ ...config, saveMemories: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Follow-ups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* 1º Follow-up */}
            <div className="space-y-2 p-4 rounded-xl bg-purple-50/50 border border-purple-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  1º Follow-up (Após {config.followUp1Hours}h)
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={config.followUp1Hours}
                    onChange={(e) => setConfig({ ...config, followUp1Hours: Number(e.target.value) || 2 })}
                    className="w-12 px-1.5 py-1 text-xs bg-white border border-purple-300 rounded text-center font-bold text-purple-900"
                  />
                  <span className="text-[10px] text-gray-500">h</span>
                </div>
              </div>
              <textarea
                rows={3}
                value={config.followUp1Template}
                onChange={(e) => setConfig({ ...config, followUp1Template: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-lg focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* 2º Follow-up */}
            <div className="space-y-2 p-4 rounded-xl bg-amber-50/50 border border-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  2º Follow-up (Após {config.followUp2Days}d)
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={config.followUp2Days}
                    onChange={(e) => setConfig({ ...config, followUp2Days: Number(e.target.value) || 2 })}
                    className="w-12 px-1.5 py-1 text-xs bg-white border border-amber-300 rounded text-center font-bold text-amber-900"
                  />
                  <span className="text-[10px] text-gray-500">d</span>
                </div>
              </div>
              <textarea
                rows={3}
                value={config.followUp2Template}
                onChange={(e) => setConfig({ ...config, followUp2Template: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-lg focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </section>

        {/* Live Simulator */}
        <section className="bg-white rounded-2xl p-6 border border-[#eaefec] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Simulação da Conversa Humana em Tempo Real
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Veja o fluxo compassado e natural acontecendo passo a passo como no WhatsApp real
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Nome do Contato:</label>
              <input
                type="text"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Grupo do WhatsApp:</label>
              <input
                type="text"
                value={simGroup}
                onChange={(e) => setSimGroup(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Demanda Captada:</label>
              <input
                type="text"
                value={simDemand}
                onChange={(e) => setSimDemand(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs font-semibold"
              />
            </div>
          </div>

          {/* Simulator WhatsApp Messages Preview */}
          <div className="bg-[#efeae2] p-4 rounded-xl border border-amber-200/60 space-y-3 max-w-xl mx-auto shadow-inner">
            {/* 1. Saudação Inicial Pura */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-gray-500 font-semibold mb-1">1. IA Sofia (Primeira mensagem - Simples e direta)</span>
              <div className="bg-emerald-600 text-white p-2.5 rounded-2xl rounded-tr-xs text-xs max-w-md shadow-xs leading-relaxed">
                Bom dia!
              </div>
            </div>

            {/* Resposta do Cliente */}
            <div className="flex flex-col items-start">
              <span className="text-[9px] text-gray-500 font-semibold mb-1">Contato (Cliente respondeu à saudação)</span>
              <div className="bg-white text-gray-800 p-2.5 rounded-2xl rounded-tl-xs text-xs max-w-md shadow-xs leading-relaxed border border-gray-200">
                Bom dia, tudo bem? Em que posso ajudar?
              </div>
            </div>

            {/* 2. Contexto & Confirmação de Responsável */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-gray-500 font-semibold mb-1">2. IA Sofia (Contextualiza o grupo & Pergunta se é responsável)</span>
              <div className="bg-emerald-600 text-white p-2.5 rounded-2xl rounded-tr-xs text-xs max-w-md shadow-xs leading-relaxed">
                Bom dia! Vi sua mensagem no grupo {simGroup} divulgando {simDemand}. É você quem cuida dessa parte?
              </div>
            </div>

            {/* Resposta do Cliente */}
            <div className="flex flex-col items-start">
              <span className="text-[9px] text-gray-500 font-semibold mb-1">Contato (Cliente confirma que é o responsável)</span>
              <div className="bg-white text-gray-800 p-2.5 rounded-2xl rounded-tl-xs text-xs max-w-md shadow-xs leading-relaxed border border-gray-200">
                Sim, sou eu mesmo!
              </div>
            </div>

            {/* 3. Apresentação da Solução de Divulgação Automática */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-gray-500 font-semibold mb-1">3. IA Sofia (Apresenta a ferramenta de divulgação automática)</span>
              <div className="bg-emerald-600 text-white p-2.5 rounded-2xl rounded-tr-xs text-xs max-w-md shadow-xs leading-relaxed">
                Legal! Nós temos uma ferramenta que automatiza a divulgação dos seus anúncios em vários grupos de WhatsApp todos os dias, sem você precisar ficar postando manualmente um por um. Você já usa algo automático ou divulga tudo na mão?
              </div>
            </div>
          </div>
        </section>

        {/* Action Save Bar at bottom */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {saving ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saveSuccess ? 'Salvo com sucesso!' : 'Salvar Todas as Regras'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
