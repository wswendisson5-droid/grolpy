import React, { useState } from 'react';
import {
  Search,
  HelpCircle,
  Smartphone,
  Phone,
  QrCode,
  ShieldCheck,
  Megaphone,
  Users,
  Crown,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Clock,
  Send,
  Zap,
} from 'lucide-react';
import { ClientTab } from '../types';

interface ClientAjudaViewProps {
  onNavigateTab?: (tab: ClientTab) => void;
  onOpenSupportModal?: () => void;
  onOpenPlanModal?: () => void;
}

interface HelpArticle {
  id: string;
  category: 'conexao' | 'divulgacoes' | 'grupos' | 'planos' | 'faq';
  title: string;
  description: string;
  badge?: string;
  icon: React.FC<{ size?: number; className?: string }>;
  content: React.ReactNode;
}

export const ClientAjudaView: React.FC<ClientAjudaViewProps> = ({
  onNavigateTab,
  onOpenSupportModal,
  onOpenPlanModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'todos' | 'conexao' | 'divulgacoes' | 'grupos' | 'planos' | 'faq'>('todos');
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>('art-conexao-qrcode');

  const categories = [
    { id: 'todos', label: 'Todos os Artigos', icon: HelpCircle },
    { id: 'conexao', label: 'Conexão WhatsApp', icon: MessageSquare },
    { id: 'divulgacoes', label: 'Disparos & Envios', icon: Megaphone },
    { id: 'grupos', label: 'Grupos & Contatos', icon: Users },
    { id: 'planos', label: 'Planos & Limites', icon: Crown },
    { id: 'faq', label: 'Dúvidas Frequentes (FAQ)', icon: Sparkles },
  ];

  const articles: HelpArticle[] = [
    {
      id: 'art-conexao-qrcode',
      category: 'conexao',
      title: 'Como conectar o WhatsApp pelo QR Code',
      description: 'Passo a passo simples para ler o código na tela do computador usando a câmera do celular.',
      badge: 'Recomendado',
      icon: QrCode,
      content: (
        <div className="space-y-3 text-sm text-[#3c5044] leading-relaxed">
          <p>
            O método por QR Code é a forma mais rápida e prática de autenticar seu WhatsApp na plataforma:
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-1 font-medium text-[#11241c]">
            <li>
              Acesse o menu lateral e clique em <span className="font-bold text-[#109353]">Conexão WhatsApp</span>.
            </li>
            <li>
              Certifique-se de que a aba <strong>QR Code</strong> está selecionada e clique em <strong>\"Gerar QR Code\"</strong>.
            </li>
            <li>
              Abra o WhatsApp no celular:
              <ul className="list-disc list-inside pl-4 mt-1 font-normal text-[#5b6e63]">
                <li><strong>Android</strong>: Toque nos três pontinhos (⋮) no canto superior &gt; <em>Aparelhos conectados</em>.</li>
                <li><strong>iPhone</strong>: Toque em <em>Configurações</em> no canto inferior &gt; <em>Aparelhos conectados</em>.</li>
              </ul>
            </li>
            <li>
              Toque em <strong>\"Conectar um aparelho\"</strong> e aponte a câmera para o QR Code gerado na tela.
            </li>
            <li>
              A tela mudará automaticamente para <strong>\"WhatsApp Conectado!\"</strong> com sua foto e número.
            </li>
          </ol>
          {onNavigateTab && (
            <div className="pt-2">
              <button
                onClick={() => onNavigateTab('conexao')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#109353] hover:bg-[#0c7a44] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <span>Ir para Conexão WhatsApp</span>
                <ExternalLink size={14} />
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'art-conexao-pairing',
      category: 'conexao',
      title: 'Como conectar com Número de Telefone (Código de Pareamento)',
      description: 'Ideal para quando a câmera estiver danificada ou sem foco, ou quando você estiver pelo celular.',
      badge: 'Alternativa',
      icon: Phone,
      content: (
        <div className="space-y-3 text-sm text-[#3c5044] leading-relaxed">
          <p>
            Se não puder usar a câmera para ler o QR Code, utilize o Código de Pareamento de 8 dígitos:
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-1 font-medium text-[#11241c]">
            <li>
              Acesse a aba <strong>Conexão WhatsApp</strong> e clique no botão <strong>\"Conectar com Número\"</strong>.
            </li>
            <li>
              Digite o número do seu WhatsApp com DDD (ex: <code className="bg-[#e8f6ee] text-[#109353] px-1.5 py-0.5 rounded font-mono font-bold">11987654321</code>) e clique em <strong>\"Gerar Código de Conexão\"</strong>.
            </li>
            <li>
              Um código de 8 dígitos será exibido na tela (ex: <code className="bg-[#f0f4f1] text-[#11241c] px-2 py-0.5 rounded font-mono font-extrabold tracking-wider">ABCD - 1234</code>). Clique no botão <strong>\"Copiar Código\"</strong>.
            </li>
            <li>
              No WhatsApp do seu celular:
              <ul className="list-disc list-inside pl-4 mt-1 font-normal text-[#5b6e63]">
                <li>Acesse <em>Aparelhos conectados &gt; Conectar um aparelho</em>.</li>
                <li>Na parte inferior, toque na opção <strong>\"Conectar com número de telefone\"</strong>.</li>
                <li>Cole ou digite o código de 8 dígitos fornecido pelo Groply.</li>
              </ul>
            </li>
            <li>
              Após validar o código, o sistema atualizará a conexão automaticamente em tempo real!
            </li>
          </ol>
          <div className="p-3 rounded-xl bg-[#fff8e6] border border-[#fbe4a8] text-xs text-[#92400e] flex items-start gap-2">
            <Clock size={16} className="shrink-0 mt-0.5 text-[#b45309]" />
            <span>
              <strong>Atenção:</strong> O código de pareamento do WhatsApp expira em 2 minutos. Digite-o no aparelho logo após gerá-lo.
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'art-conexao-problemas',
      category: 'conexao',
      title: 'Resolução de Problemas: WhatsApp Caiu ou Desconectou',
      description: 'Como resolver quando a conexão cair ou a leitura do código não for reconhecida.',
      icon: RefreshCw,
      content: (
        <div className="space-y-3 text-sm text-[#3c5044] leading-relaxed">
          <p className="font-semibold text-[#11241c]">Principais causas e soluções imediatas:</p>
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-[#fbfdfc] border border-[#e5ebe7]">
              <p className="font-bold text-xs text-[#11241c] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Celular ficou muito tempo sem internet / desligado
              </p>
              <p className="text-xs text-[#5b6e63] mt-1">
                O WhatsApp exige que o aparelho principal tenha sincronização periódica. Mantenha seu celular carregado e conectado a um Wi-Fi estável.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#fbfdfc] border border-[#e5ebe7]">
              <p className="font-bold text-xs text-[#11241c] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Câmera não foca no QR Code
              </p>
              <p className="text-xs text-[#5b6e63] mt-1">
                Aumente o brilho do monitor, limpe a lente da câmera do celular ou utilize a alternativa <strong>\"Conectar com Número\"</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#fbfdfc] border border-[#e5ebe7]">
              <p className="font-bold text-xs text-[#11241c] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#109353]" />
                Como reconectar do zero
              </p>
              <p className="text-xs text-[#5b6e63] mt-1">
                Clique em <strong>\"Desconectar WhatsApp\"</strong> na aba de Conexão e gere um novo QR Code ou código de pareamento.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'art-divulgacoes-criar',
      category: 'divulgacoes',
      title: 'Como criar e agendar sua primeira Divulgação',
      description: 'Aprenda a cadastrar copies, imagens, selecionar grupos e programar horários de envio.',
      badge: 'Essencial',
      icon: Megaphone,
      content: (
        <div className="space-y-3 text-sm text-[#3c5044] leading-relaxed">
          <p>
            Criar divulgações automáticas no Groply é rápido e intuitivo:
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-1 font-medium text-[#11241c]">
            <li>
              Acesse <strong>Divulgações &gt; Nova Divulgação</strong> no menu lateral.
            </li>
            <li>
              Dê um <strong>Título</strong> à divulgação para seu controle e selecione a <strong>Categoria</strong>.
            </li>
            <li>
              Escreva o <strong>Texto da Mensagem</strong>. Você pode incluir links, números e emojis à vontade.
            </li>
            <li>
              (Opcional) Faça upload de uma imagem chamativa do seu produto/oferta.
            </li>
            <li>
              Marque os <strong>Grupos de Destino</strong> que receberão o disparo.
            </li>
            <li>
              Defina os <strong>Dias da Semana</strong>, o <strong>Horário de Envio</strong> e o <strong>Intervalo entre mensagens</strong> (recomendamos de 15 a 45 segundos).
            </li>
            <li>
              Clique em <strong>\"Salvar e Ativar\"</strong>. Pronto! O robô fará os envios de forma 100% automática.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: 'art-divulgacoes-disparar-agora',
      category: 'divulgacoes',
      title: 'Disparo Imediato: Como usar a função \"Disparar Agora\"',
      description: 'Envie sua mensagem imediatamente sem precisar esperar o horário do agendamento.',
      icon: Zap,
      content: (
        <div className="space-y-3 text-sm text-[#3c5044] leading-relaxed">
          <p>
            Precisa fazer um anúncio urgente ou testar uma nova copy de imediato?
          </p>
          <p>
            Na listagem de <strong>Divulgações</strong>, localize a campanha desejada e clique no botão verde <strong>\"Disparar Agora\"</strong> com ícone de raio.
          </p>
          <div className="p-3 rounded-xl bg-[#eef7f2] border border-[#d6ecdf] text-xs text-[#134e32]">
            <strong>Importante:</strong> O disparo imediato respeita os intervalos configurados entre cada grupo para proteger seu número contra bloqueios do WhatsApp.
          </div>
        </div>
      ),
    },
    {
      id: 'art-boas-praticas-bloqueio',
      category: 'divulgacoes',
      title: 'Dicas de Ouro: Como evitar bloqueios no WhatsApp',
      description: 'Diretrizes oficiais para aquecimento de chip e envios em massa com total segurança.',
      badge: 'Segurança',
      icon: ShieldCheck,
      content: (
        <div className="space-y-3 text-sm text-[#3c5044] leading-relaxed">
          <p>
            Siga estas práticas recomendadas pela nossa equipe de especialistas para manter seu número protegido:
          </p>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-[#109353] shrink-0 mt-0.5" />
              <span><strong>Aquecimento de chips novos:</strong> Se comprou um chip novo, use-o por 7 a 15 dias normalmente antes de disparar em dezenas de grupos. Comece com 10 a 20 grupos por dia.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-[#109353] shrink-0 mt-0.5" />
              <span><strong>Intervalo de segurança:</strong> Nunca configure intervalos menores que 15 segundos entre mensagens. O recomendado é entre 20 e 45 segundos.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-[#109353] shrink-0 mt-0.5" />
              <span><strong>Grupos abertos para anúncio:</strong> Divulgue apenas em grupos onde anúncios são permitidos para evitar denúncias de administradores.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-[#109353] shrink-0 mt-0.5" />
              <span><strong>Varie suas mensagens:</strong> Alterne suas copies e imagens periodicamente para manter o engajamento elevado.</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'art-grupos-importar',
      category: 'grupos',
      title: 'Como importar e gerenciar grupos do WhatsApp',
      description: 'Como funciona a sincronização automática dos grupos em que seu número participa.',
      icon: Users,
      content: (
        <div className="space-y-3 text-sm text-[#3c5044] leading-relaxed">
          <p>
            O Groply detecta automaticamente todos os grupos em que seu número conectado participa:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 pl-1 font-medium text-[#11241c]">
            <li>Acesse a aba <strong>Grupos</strong> no menu lateral.</li>
            <li>Clique no botão <strong>\"Importar Grupos\"</strong> ou <strong>\"Sincronizar\"</strong>.</li>
            <li>O sistema lerá a lista atualizada de grupos, quantidade de membros e permissão de postagem.</li>
          </ol>
          <p className="text-xs text-[#5b6e63] mt-2">
            Caso você entre em novos grupos pelo WhatsApp no celular, basta clicar em Sincronizar para que eles apareçam no painel.
          </p>
        </div>
      ),
    },
    {
      id: 'art-planos-limites',
      category: 'planos',
      title: 'Como funcionam os Planos e Limites de Grupos Únicos',
      description: 'Entenda como são contabilizados os grupos únicos, rodadas diárias e limite mensal de envios.',
      icon: Crown,
      content: (
        <div className="space-y-3 text-sm text-[#3c5044] leading-relaxed">
          <p>
            Cada plano no Groply possui capacidades dimensionadas para diferentes tamanhos de negócio:
          </p>
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-[#fbfdfc] border border-[#e5ebe7]">
              <p className="font-bold text-xs text-[#11241c]">O que são Grupos Únicos?</p>
              <p className="text-xs text-[#5b6e63] mt-0.5">
                É a contagem de grupos distintos selecionados em suas automações ativas. Se você tiver 3 campanhas diferentes enviando para os mesmos 50 grupos, isso conta apenas como 50 grupos únicos!
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#fbfdfc] border border-[#e5ebe7]">
              <p className="font-bold text-xs text-[#11241c]">Como fazer upgrade de plano?</p>
              <p className="text-xs text-[#5b6e63] mt-0.5">
                Acesse a aba <strong>Planos</strong> ou clique no card da barra lateral para escolher um novo plano. A liberação do limite é instantânea após o pagamento.
              </p>
            </div>
          </div>
          {onOpenPlanModal && (
            <div className="pt-2">
              <button
                onClick={onOpenPlanModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#109353] hover:bg-[#0c7a44] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <span>Ver Planos Disponíveis</span>
                <Crown size={14} />
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'art-faq-computador-ligado',
      category: 'faq',
      title: 'O computador precisa ficar ligado 24 horas?',
      description: 'Esclarecimento sobre a infraestrutura em nuvem e execução em segundo plano.',
      icon: Sparkles,
      content: (
        <div className="space-y-2 text-sm text-[#3c5044] leading-relaxed">
          <p className="font-bold text-[#11241c]">Não! Você pode desligar seu computador tranquilamente.</p>
          <p>
            Todos os seus agendamentos, cronogramas e disparos rodam diretamente nos servidores em nuvem de alta disponibilidade do Groply. Uma vez programada a campanha, ela será disparada mesmo que você esteja offline ou com o computador desligado.
          </p>
        </div>
      ),
    },
    {
      id: 'art-faq-usar-whatsapp-normal',
      category: 'faq',
      title: 'Posso usar o WhatsApp normalmente no meu celular?',
      description: 'Saiba como a integração coexiste com seu uso diário de conversas e ligações.',
      icon: Smartphone,
      content: (
        <div className="space-y-2 text-sm text-[#3c5044] leading-relaxed">
          <p className="font-bold text-[#11241c]">Sim, perfeitamente!</p>
          <p>
            A conexão com o Groply funciona exatamente como uma sessão do WhatsApp Web oficial. Você pode continuar enviando mensagens, atendendo clientes e fazendo ligações no celular normalmente enquanto o sistema realiza as divulgações.
          </p>
        </div>
      ),
    },
  ];

  // Filter articles based on category and search query
  const filteredArticles = articles.filter((art) => {
    const matchesCategory = activeCategory === 'todos' || art.category === activeCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesQuery =
      art.title.toLowerCase().includes(query) ||
      art.description.toLowerCase().includes(query) ||
      art.category.toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });

  return (
    <div className="flex flex-col max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Page Header Banner */}
      <div className="bg-gradient-to-br from-[#109353] via-[#0c7a44] to-[#085a31] rounded-3xl p-6 sm:p-10 text-white shadow-md mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs mb-3">
            <HelpCircle size={14} />
            Central de Ajuda Oficial
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Como podemos te ajudar hoje?
          </h1>
          <p className="text-white/85 text-sm sm:text-base mt-2 leading-relaxed">
            Tutoriais passo a passo, guias de conexão WhatsApp, dicas de automação e respostas para dúvidas frequentes.
          </p>

          {/* Search Input Box */}
          <div className="mt-6 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#708479]">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por palavras-chave (ex: QR Code, número, agendamento, bloqueio)..."
              className="w-full pl-11 pr-4 py-3.5 bg-white text-[#11241c] placeholder:text-[#8c9e94] rounded-2xl text-sm font-medium shadow-lg outline-none focus:ring-4 focus:ring-white/30 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => onNavigateTab && onNavigateTab('conexao')}
          className="p-4.5 bg-white rounded-2xl border border-[#e5ebe7] hover:border-[#109353]/40 hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[#e8f6ee] text-[#109353] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <QrCode size={20} />
          </div>
          <h3 className="font-bold text-sm text-[#11241c] group-hover:text-[#109353] transition-colors">
            Conectar por QR Code
          </h3>
          <p className="text-xs text-[#617469] mt-1 leading-relaxed">
            Passo a passo rápido para ler o código na tela.
          </p>
        </button>

        <button
          onClick={() => onNavigateTab && onNavigateTab('conexao')}
          className="p-4.5 bg-white rounded-2xl border border-[#e5ebe7] hover:border-[#109353]/40 hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[#e8f6ee] text-[#109353] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Phone size={20} />
          </div>
          <h3 className="font-bold text-sm text-[#11241c] group-hover:text-[#109353] transition-colors">
            Conectar por Número
          </h3>
          <p className="text-xs text-[#617469] mt-1 leading-relaxed">
            Código de pareamento sem precisar de câmera.
          </p>
        </button>

        <button
          onClick={() => {
            setActiveCategory('divulgacoes');
            setExpandedArticleId('art-boas-praticas-bloqueio');
          }}
          className="p-4.5 bg-white rounded-2xl border border-[#e5ebe7] hover:border-[#109353]/40 hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[#e8f6ee] text-[#109353] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <ShieldCheck size={20} />
          </div>
          <h3 className="font-bold text-sm text-[#11241c] group-hover:text-[#109353] transition-colors">
            Evitar Bloqueios
          </h3>
          <p className="text-xs text-[#617469] mt-1 leading-relaxed">
            Boas práticas e aquecimento seguro de chip.
          </p>
        </button>

        <button
          onClick={() => onOpenSupportModal && onOpenSupportModal()}
          className="p-4.5 bg-white rounded-2xl border border-[#e5ebe7] hover:border-[#109353]/40 hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[#eef6f1] text-[#109353] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <MessageSquare size={20} />
          </div>
          <h3 className="font-bold text-sm text-[#11241c] group-hover:text-[#109353] transition-colors">
            Falar com Suporte
          </h3>
          <p className="text-xs text-[#617469] mt-1 leading-relaxed">
            Atendimento humanizado direto via WhatsApp.
          </p>
        </button>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#109353] text-white shadow-xs'
                  : 'bg-white text-[#5b6e63] hover:text-[#11241c] hover:bg-[#f0f4f1] border border-[#e5ebe7]'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-white' : 'text-[#6b7e73]'} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Articles Accordion List */}
      <div className="space-y-4 mb-10">
        {filteredArticles.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#e5ebe7] p-10 text-center">
            <HelpCircle className="w-10 h-10 text-[#8c9e94] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#11241c]">Nenhum artigo encontrado</h3>
            <p className="text-xs text-[#617469] mt-1">
              Tente buscar com outros termos ou selecione outra categoria acima.
            </p>
          </div>
        ) : (
          filteredArticles.map((article) => {
            const Icon = article.icon;
            const isExpanded = expandedArticleId === article.id;

            return (
              <div
                key={article.id}
                className="bg-white rounded-2xl border border-[#e5ebe7] overflow-hidden shadow-2xs transition-all hover:border-[#d3ded8]"
              >
                <button
                  type="button"
                  onClick={() => setExpandedArticleId(isExpanded ? null : article.id)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-[#fafcfb] transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    <div className="w-9 h-9 rounded-xl bg-[#f0f7f3] text-[#109353] flex items-center justify-center shrink-0">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-[#11241c]">
                          {article.title}
                        </h3>
                        {article.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#e8f6ee] text-[#109353]">
                            {article.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#617469] mt-0.5 line-clamp-1">
                        {article.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-[#8c9e94] shrink-0">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-[#f0f4f1] animate-in fade-in duration-150">
                    {article.content}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Support Footer Callout Card */}
      <div className="bg-[#f2f8f4] border border-[#d6ebe0] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-[#109353] text-white flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare size={24} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#11241c]">
              Não encontrou o que precisava?
            </h3>
            <p className="text-xs sm:text-sm text-[#5b6e63] mt-0.5">
              Nossa equipe de suporte técnico está pronta para te atender em tempo real.
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenSupportModal && onOpenSupportModal()}
          className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#109353] hover:bg-[#0c7a44] active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Send size={16} />
          <span>Falar com Atendimento</span>
        </button>
      </div>
    </div>
  );
};
