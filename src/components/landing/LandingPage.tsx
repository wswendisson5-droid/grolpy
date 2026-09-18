import React, { useState } from 'react';
import {
  ArrowRight,
  Play,
  CheckCircle2,
  ShieldCheck,
  Users,
  BarChart3,
  TrendingUp,
  Clock,
  QrCode,
  MessageSquare,
  Calendar,
  Zap,
  Lock,
  ChevronLeft,
  ChevronRight,
  Star,
  Instagram,
  Youtube,
  Linkedin,
  Send,
  Sliders,
  Check,
  Menu,
  X,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted?: () => void;
  onLogin?: () => void;
  onNavigateToPlans?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  onNavigateToPlans,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);

  const testimonials = [
    {
      name: 'Carla Mendes',
      role: 'Loja Online',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
      text: '“O Gruply facilitou muito nossa comunicação. Consigo enviar promoções para vários grupos em minutos!”',
      stars: 5,
    },
    {
      name: 'Rafael Lima',
      role: 'Comunidade Fitness',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
      text: '“Ferramenta simples e poderosa. Meus eventos agora têm muito mais alcance e engajamento.”',
      stars: 5,
    },
    {
      name: 'Juliana Costa',
      role: 'Consultora de Vendas',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
      text: '“Adorei os relatórios e a facilidade de uso. O Gruply realmente entrega o que promete.”',
      stars: 5,
    },
  ];

  const handleNextTestimonial = () => {
    setActiveTestimonialIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrevTestimonial = () => {
    setActiveTestimonialIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#142d23] font-sans antialiased selection:bg-[#00c968] selection:text-white overflow-x-hidden">
      {/* =========================================================================
          1. HEADER / NAVBAR
         ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#f8faf9]/90 backdrop-blur-md border-b border-[#e5ece8]/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            {/* Gruply Green Logo Icon */}
            <div className="w-10 h-10 rounded-2xl bg-[#00c968] flex items-center justify-center text-white shadow-[0_4px_14px_rgba(0,201,104,0.35)] shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 3C6.477 3 2 6.94 2 11.8c0 2.22.92 4.25 2.45 5.82L3.3 21l4.03-1.34c1.43.6 3.01.94 4.67.94 5.523 0 10-3.94 10-8.8S17.523 3 12 3z"
                  fill="white"
                />
                <circle cx="8" cy="11.5" r="1.5" fill="#00c968" />
                <circle cx="12" cy="11.5" r="1.5" fill="#00c968" />
                <circle cx="16" cy="11.5" r="1.5" fill="#00c968" />
              </svg>
            </div>
            <span className="text-2xl font-black tracking-tight text-[#0e261f]">gruply</span>
          </div>

          {/* Center Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-[#52665a]">
            <a href="#inicio" className="text-[#0e261f] font-semibold hover:text-[#00c968] transition-colors">
              Início
            </a>
            <a href="#recursos" className="hover:text-[#00c968] transition-colors">
              Recursos
            </a>
            <a
              href="#planos"
              onClick={(e) => {
                if (onNavigateToPlans) {
                  e.preventDefault();
                  onNavigateToPlans();
                }
              }}
              className="hover:text-[#00c968] transition-colors"
            >
              Planos
            </a>
            <a href="#depoimentos" className="hover:text-[#00c968] transition-colors">
              Depoimentos
            </a>
            <a href="#faq" className="hover:text-[#00c968] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onLogin || onGetStarted}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-[#0e261f] bg-white border border-[#d6e0da] hover:border-[#0e261f] hover:bg-[#f2f6f4] transition-all shadow-xs cursor-pointer"
            >
              Entrar
            </button>
            <button
              onClick={onGetStarted}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-[#0e261f] hover:bg-[#15382e] transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              Criar conta
            </button>
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={onGetStarted}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-[#0e261f]"
            >
              Criar conta
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#0e261f] hover:bg-black/5 rounded-xl transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#e5ece8] px-5 py-4 flex flex-col gap-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <a
              href="#inicio"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-semibold text-[#0e261f] border-b border-[#f0f4f1]"
            >
              Início
            </a>
            <a
              href="#recursos"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-[#52665a] border-b border-[#f0f4f1]"
            >
              Recursos
            </a>
            <a
              href="#planos"
              onClick={(e) => {
                setMobileMenuOpen(false);
                if (onNavigateToPlans) {
                  e.preventDefault();
                  onNavigateToPlans();
                }
              }}
              className="py-2 text-sm font-medium text-[#52665a] border-b border-[#f0f4f1]"
            >
              Planos
            </a>
            <a
              href="#depoimentos"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-[#52665a] border-b border-[#f0f4f1]"
            >
              Depoimentos
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-[#52665a] border-b border-[#f0f4f1]"
            >
              FAQ
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onLogin) onLogin();
                  else if (onGetStarted) onGetStarted();
                }}
                className="w-full py-2.5 rounded-full text-sm font-semibold text-[#0e261f] bg-[#f2f6f4] border border-[#d6e0da]"
              >
                Entrar
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onGetStarted) onGetStarted();
                }}
                className="w-full py-2.5 rounded-full text-sm font-semibold text-white bg-[#0e261f]"
              >
                Criar conta
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HERO SECTION
         ========================================================================= */}
      <section id="inicio" className="relative pt-10 pb-16 md:pt-16 md:pb-24 overflow-hidden">
        {/* Background glow behind phone */}
        <div className="absolute top-1/2 right-4 md:right-16 -translate-y-1/2 w-[340px] md:w-[620px] h-[340px] md:h-[620px] rounded-full bg-gradient-to-br from-[#8ff0c2]/60 via-[#4be39c]/40 to-[#10b981]/15 blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 flex flex-col gap-6 text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-extrabold text-[#0e261f] leading-[1.12] tracking-tight">
                Mais conexões <br />
                para o seu <br />
                <span className="text-[#00c968]">negócio.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#55695e] leading-relaxed max-w-xl">
                Automatize o envio de mensagens em grupos do WhatsApp de forma simples, segura e eficiente.
                Com o Gruply, você alcança mais pessoas, fortalece sua comunidade e gera resultados reais.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-base font-bold text-white bg-[#0e261f] hover:bg-[#163a2f] transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group"
                >
                  <span>Comece agora grátis</span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById('como-funciona');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-3 px-5 py-3.5 rounded-full text-sm sm:text-base font-bold text-[#0e261f] hover:bg-black/5 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0e261f] text-white flex items-center justify-center shadow-xs">
                    <Play size={13} className="fill-white translate-x-0.5" />
                  </div>
                  <span>Ver como funciona</span>
                </button>
              </div>
            </div>

            {/* Right: Realistic Phone Mockup (Exactly like in the reference image) */}
            <div className="lg:col-span-6 flex items-center justify-center relative">
              {/* Organic light green blob behind the phone */}
              <div className="absolute w-[300px] sm:w-[420px] h-[480px] sm:h-[580px] bg-[#6ee7b7]/30 rounded-[60px] rotate-3 blur-xl -z-10" />

              {/* Smartphone Frame */}
              <div className="w-[300px] sm:w-[350px] bg-[#0c1a14] p-3.5 sm:p-4 rounded-[48px] shadow-[0_25px_60px_-15px_rgba(14,38,31,0.35)] border-[5px] border-[#22392f] relative select-none">
                {/* Speaker & camera notch */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-[#0c1a14] rounded-full z-20 flex items-center justify-center">
                  <div className="w-10 h-1.5 bg-[#22392f] rounded-full" />
                </div>

                {/* Inner Screen Content */}
                <div className="bg-white rounded-[36px] overflow-hidden text-[#0e261f] flex flex-col pt-6 pb-4 px-4.5 min-h-[560px] sm:min-h-[610px] justify-between shadow-inner">
                  {/* Top Phone Header */}
                  <div className="flex items-center justify-between pt-3 pb-3 border-b border-[#f0f4f1]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-[#00c968] flex items-center justify-center text-white">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 3C6.477 3 2 6.94 2 11.8c0 2.22.92 4.25 2.45 5.82L3.3 21l4.03-1.34c1.43.6 3.01.94 4.67.94 5.523 0 10-3.94 10-8.8S17.523 3 12 3z"
                            fill="white"
                          />
                        </svg>
                      </div>
                      <span className="text-base font-extrabold text-[#0e261f] tracking-tight">gruply</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#f0f5f2] flex items-center justify-center text-[#55695e]">
                      <Sliders size={12} />
                    </div>
                  </div>

                  {/* Greeting Box */}
                  <div className="py-2.5">
                    <p className="text-xs font-bold text-[#0e261f]">Olá, tudo certo? 👋</p>
                    <p className="text-[11px] text-[#6b7d73]">Vamos impulsionar suas conexões hoje?</p>
                  </div>

                  {/* Big Action Button (Enviar para grupos) */}
                  <div className="bg-[#00c968] rounded-2xl p-4 text-white flex items-center justify-between shadow-[0_8px_20px_rgba(0,201,104,0.3)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                        <Send size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-tight">Enviar para grupos</p>
                        <p className="text-[10px] text-white/80 leading-none mt-0.5">Alcance mais pessoas</p>
                      </div>
                    </div>
                  </div>

                  {/* 4 Feature Action Tiles in 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-2.5 my-3">
                    <div className="bg-[#f7faf8] border border-[#e8efe9] rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs">
                      <div className="w-8 h-8 rounded-full bg-[#e5f8ee] flex items-center justify-center text-[#00c968]">
                        <Clock size={16} />
                      </div>
                      <span className="text-[11px] font-bold text-[#0e261f] leading-tight">Agendar envios</span>
                    </div>

                    <div className="bg-[#f7faf8] border border-[#e8efe9] rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs">
                      <div className="w-8 h-8 rounded-full bg-[#e8f1fd] flex items-center justify-center text-[#2563eb]">
                        <Users size={16} />
                      </div>
                      <span className="text-[11px] font-bold text-[#0e261f] leading-tight">Meus grupos</span>
                    </div>

                    <div className="bg-[#f7faf8] border border-[#e8efe9] rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs">
                      <div className="w-8 h-8 rounded-full bg-[#f3edf9] flex items-center justify-center text-[#8b5cf6]">
                        <BarChart3 size={16} />
                      </div>
                      <span className="text-[11px] font-bold text-[#0e261f] leading-tight">Relatórios</span>
                    </div>

                    <div className="bg-[#f7faf8] border border-[#e8efe9] rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs">
                      <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#55695e]">
                        <Sliders size={16} />
                      </div>
                      <span className="text-[11px] font-bold text-[#0e261f] leading-tight">Configurações</span>
                    </div>
                  </div>

                  {/* Phone Bottom Navigation */}
                  <div className="border-t border-[#f0f4f1] pt-2 px-1 flex items-center justify-between text-[9px] text-[#6b7d73]">
                    <div className="flex flex-col items-center text-[#00c968] font-bold">
                      <div className="w-4 h-4 mb-0.5 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                        </svg>
                      </div>
                      <span>Início</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 mb-0.5 flex items-center justify-center">
                        <Send size={12} />
                      </div>
                      <span>Campanhas</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 mb-0.5 flex items-center justify-center">
                        <Users size={12} />
                      </div>
                      <span>Grupos</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 mb-0.5 flex items-center justify-center">
                        <span className="font-bold text-xs tracking-tighter">•••</span>
                      </div>
                      <span>Mais</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. FEATURE ICONS ROW (5 items exactly matching the image)
         ========================================================================= */}
      <section className="py-10 border-y border-[#e6ece8] bg-white/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 sm:gap-8 items-start text-center">
            {/* 1 */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f9ef] text-[#00c968] flex items-center justify-center shadow-xs">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-xs sm:text-[13px] font-bold text-[#0e261f] leading-snug">
                Envio em grupos <br />
                com agendamento
              </p>
            </div>

            {/* 2 */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f9ef] text-[#00c968] flex items-center justify-center shadow-xs">
                <Users size={24} />
              </div>
              <p className="text-xs sm:text-[13px] font-bold text-[#0e261f] leading-snug">
                Gerencie vários <br />
                grupos
              </p>
            </div>

            {/* 3 */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f9ef] text-[#00c968] flex items-center justify-center shadow-xs">
                <TrendingUp size={24} />
              </div>
              <p className="text-xs sm:text-[13px] font-bold text-[#0e261f] leading-snug">
                Relatórios em <br />
                tempo real
              </p>
            </div>

            {/* 4 */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f9ef] text-[#00c968] flex items-center justify-center shadow-xs">
                <ShieldCheck size={24} />
              </div>
              <p className="text-xs sm:text-[13px] font-bold text-[#0e261f] leading-snug">
                Seguro e <br />
                confiável
              </p>
            </div>

            {/* 5 */}
            <div className="col-span-2 sm:col-span-1 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f9ef] text-[#00c968] flex items-center justify-center shadow-xs">
                <BarChart3 size={24} />
              </div>
              <p className="text-xs sm:text-[13px] font-bold text-[#0e261f] leading-snug">
                Interface simples <br />
                e moderna
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. "COMO FUNCIONA" (How it Works) SECTION
         ========================================================================= */}
      <section id="como-funciona" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column */}
            <div className="lg:col-span-5 flex flex-col gap-5 text-left">
              <div className="flex items-center gap-2">
                <span className="w-4 h-[2px] bg-[#00c968]" />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#00c968]">
                  COMO FUNCIONA
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#0e261f] leading-[1.18] tracking-tight">
                Em poucos passos, <br />
                suas mensagens em <br />
                diversos grupos.
              </h2>

              <p className="text-sm sm:text-base text-[#55695e] leading-relaxed">
                O Gruply foi feito para ser simples. Conecte, escolha, programe e pronto. Sua mensagem chega aos
                grupos certos, na hora certa.
              </p>

              <div className="pt-2">
                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-bold text-white bg-[#0e261f] hover:bg-[#15382e] transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  <span>Criar minha conta grátis</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Right Column: 4 Step Cards */}
            <div className="lg:col-span-7 flex flex-col gap-3.5">
              {/* Step 1 */}
              <div className="bg-white border border-[#e5ebe7] rounded-2xl p-5 sm:p-6 flex items-center justify-between gap-4 shadow-xs hover:border-[#00c968]/50 hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0e261f] text-white font-black text-sm flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0e261f] leading-tight">Conecte seu número</h3>
                    <p className="text-xs sm:text-sm text-[#6a7d73] mt-1 leading-snug">
                      Leia o QR Code e conecte seu WhatsApp com segurança via Evolution.
                    </p>
                  </div>
                </div>
                <div className="text-[#0e261f] opacity-80 shrink-0 hidden sm:block">
                  <QrCode size={28} />
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white border border-[#e5ebe7] rounded-2xl p-5 sm:p-6 flex items-center justify-between gap-4 shadow-xs hover:border-[#00c968]/50 hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0e261f] text-white font-black text-sm flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0e261f] leading-tight">Selecione os grupos</h3>
                    <p className="text-xs sm:text-sm text-[#6a7d73] mt-1 leading-snug">
                      Escolha os grupos que deseja enviar a mensagem.
                    </p>
                  </div>
                </div>
                <div className="text-[#0e261f] opacity-80 shrink-0 hidden sm:block">
                  <Users size={28} />
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white border border-[#e5ebe7] rounded-2xl p-5 sm:p-6 flex items-center justify-between gap-4 shadow-xs hover:border-[#00c968]/50 hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0e261f] text-white font-black text-sm flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0e261f] leading-tight">Crie sua mensagem</h3>
                    <p className="text-xs sm:text-sm text-[#6a7d73] mt-1 leading-snug">
                      Digite o texto, adicione mídias e personalize do seu jeito.
                    </p>
                  </div>
                </div>
                <div className="text-[#0e261f] opacity-80 shrink-0 hidden sm:block">
                  <MessageSquare size={28} />
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-white border border-[#e5ebe7] rounded-2xl p-5 sm:p-6 flex items-center justify-between gap-4 shadow-xs hover:border-[#00c968]/50 hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0e261f] text-white font-black text-sm flex items-center justify-center shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0e261f] leading-tight">Agende o envio</h3>
                    <p className="text-xs sm:text-sm text-[#6a7d73] mt-1 leading-snug">
                      Defina a data e horário. O Gruply faz o resto.
                    </p>
                  </div>
                </div>
                <div className="text-[#0e261f] opacity-80 shrink-0 hidden sm:block">
                  <Calendar size={28} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. DASHBOARD VISUAL SIMULATION (Exactly like in the reference image)
         ========================================================================= */}
      <section id="recursos" className="py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Large Dashboard Card Frame */}
          <div className="bg-white border border-[#dce5df] rounded-3xl shadow-[0_20px_50px_-15px_rgba(14,38,31,0.1)] overflow-hidden flex flex-col md:flex-row select-none">
            {/* Left Dashboard Sidebar */}
            <div className="w-full md:w-56 bg-[#081a14] text-white p-5 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#15342a] shrink-0">
              <div className="flex flex-col gap-6">
                {/* Logo */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00c968] flex items-center justify-center text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 3C6.477 3 2 6.94 2 11.8c0 2.22.92 4.25 2.45 5.82L3.3 21l4.03-1.34c1.43.6 3.01.94 4.67.94 5.523 0 10-3.94 10-8.8S17.523 3 12 3z"
                        fill="white"
                      />
                    </svg>
                  </div>
                  <span className="text-lg font-black tracking-tight text-white">gruply</span>
                </div>

                {/* Sidebar Navigation */}
                <nav className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#00c968]/20 text-[#00c968] font-bold">
                    <BarChart3 size={15} />
                    <span>Dashboard</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#8fa89b] hover:text-white transition-colors">
                    <Send size={15} />
                    <span>Campanhas</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#8fa89b] hover:text-white transition-colors">
                    <Users size={15} />
                    <span>Grupos</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#8fa89b] hover:text-white transition-colors">
                    <MessageSquare size={15} />
                    <span>Mensagens</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#8fa89b] hover:text-white transition-colors">
                    <TrendingUp size={15} />
                    <span>Relatórios</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#8fa89b] hover:text-white transition-colors">
                    <Sliders size={15} />
                    <span>Configurações</span>
                  </div>
                </nav>
              </div>

              {/* User Profile at bottom */}
              <div className="pt-6 border-t border-[#15342a] flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80"
                  alt="Wendisson"
                  className="w-8 h-8 rounded-full object-cover border border-[#00c968]/40"
                />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-white leading-tight">Wendisson</span>
                  <span className="text-[10px] text-[#8fa89b] leading-none">Administrador</span>
                </div>
              </div>
            </div>

            {/* Main Dashboard Canvas */}
            <div className="flex-1 p-5 sm:p-7 bg-[#fbfdfc] flex flex-col gap-6">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#0e261f]">Bom dia, Wendisson! 👋</h3>
                  <p className="text-xs text-[#6a7d73]">Aqui está um resumo das suas campanhas.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0e261f] text-white text-xs font-bold shadow-xs">
                    <span>+ Nova campanha</span>
                  </button>
                </div>
              </div>

              {/* 4 Metric Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Metric 1 */}
                <div className="bg-white border border-[#e5ebe7] rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-[#e6f9ef] text-[#00c968] flex items-center justify-center shrink-0">
                    <Send size={18} />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-[#0e261f] leading-tight block">12</span>
                    <span className="text-[11px] text-[#6a7d73] leading-none">Grupos conectados</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white border border-[#e5ebe7] rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-[#eaf3fd] text-[#2563eb] flex items-center justify-center shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-[#0e261f] leading-tight block">5</span>
                    <span className="text-[11px] text-[#6a7d73] leading-none">Campanhas ativas</span>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white border border-[#e5ebe7] rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-[#f4eefb] text-[#8b5cf6] flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-[#0e261f] leading-tight block">2.548</span>
                    <span className="text-[11px] text-[#6a7d73] leading-none">Pessoas alcançadas</span>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="bg-white border border-[#e5ebe7] rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-[#e6f9ef] text-[#00c968] flex items-center justify-center shrink-0">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-[#0e261f] leading-tight block">98%</span>
                    <span className="text-[11px] text-[#6a7d73] leading-none">Taxa de entrega</span>
                  </div>
                </div>
              </div>

              {/* Bottom Split: Chart & Latest Campaigns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left: 7-Day Chart Simulation */}
                <div className="lg:col-span-7 bg-white border border-[#e5ebe7] rounded-2xl p-4.5 flex flex-col justify-between gap-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0e261f]">Resultados dos últimos 7 dias</span>
                  </div>

                  {/* Visual Bar Graph */}
                  <div className="relative pt-6 pb-2">
                    {/* Floating highlight tooltip on Friday */}
                    <div className="absolute top-0 left-[62%] -translate-x-1/2 bg-white border border-[#d6e2db] rounded-lg px-2 py-1 shadow-md text-center z-10">
                      <span className="text-xs font-extrabold text-[#0e261f] block leading-tight">1.248</span>
                      <span className="text-[9px] text-[#6a7d73] leading-none">envios realizados</span>
                    </div>

                    {/* Chart Columns */}
                    <div className="flex items-end justify-between gap-2 h-36 border-b border-[#eef3f0] pb-2 px-2">
                      <div className="flex flex-col items-center gap-1.5 flex-1">
                        <div className="w-full max-w-[20px] bg-[#00c968] rounded-t-md h-[40%]" />
                        <span className="text-[10px] text-[#8ca094]">Seg</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 flex-1">
                        <div className="w-full max-w-[20px] bg-[#00c968] rounded-t-md h-[55%]" />
                        <span className="text-[10px] text-[#8ca094]">Ter</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 flex-1">
                        <div className="w-full max-w-[20px] bg-[#00c968] rounded-t-md h-[65%]" />
                        <span className="text-[10px] text-[#8ca094]">Qua</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 flex-1">
                        <div className="w-full max-w-[20px] bg-[#00c968] rounded-t-md h-[75%]" />
                        <span className="text-[10px] text-[#8ca094]">Qui</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 flex-1">
                        <div className="w-full max-w-[20px] bg-[#00c968] rounded-t-md h-[95%]" />
                        <span className="text-[10px] font-bold text-[#0e261f]">Sex</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 flex-1">
                        <div className="w-full max-w-[20px] bg-[#00c968] rounded-t-md h-[80%]" />
                        <span className="text-[10px] text-[#8ca094]">Sáb</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 flex-1">
                        <div className="w-full max-w-[20px] bg-[#00c968] rounded-t-md h-[90%]" />
                        <span className="text-[10px] text-[#8ca094]">Dom</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Latest Campaigns List */}
                <div className="lg:col-span-5 bg-white border border-[#e5ebe7] rounded-2xl p-4.5 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0e261f]">Últimas campanhas</span>
                    <span className="text-[11px] text-[#6a7d73] hover:underline cursor-pointer">Ver todas</span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {/* Item 1 */}
                    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f6faf7] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#0e261f] text-[#00c968] flex items-center justify-center shrink-0">
                          <MessageSquare size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0e261f] leading-tight">Promoção da semana</p>
                          <p className="text-[10px] text-[#6a7d73] leading-none mt-0.5">Enviado hoje às 12:00</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f9ef] text-[#00c968]">
                        Concluída
                      </span>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f6faf7] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#0e261f] text-[#00c968] flex items-center justify-center shrink-0">
                          <MessageSquare size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0e261f] leading-tight">Novos produtos</p>
                          <p className="text-[10px] text-[#6a7d73] leading-none mt-0.5">Enviado em 28/08/2026</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f9ef] text-[#00c968]">
                        Concluída
                      </span>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f6faf7] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#0e261f] text-[#00c968] flex items-center justify-center shrink-0">
                          <MessageSquare size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0e261f] leading-tight">Evento especial</p>
                          <p className="text-[10px] text-[#6a7d73] leading-none mt-0.5">Enviado em 25/08/2026</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f9ef] text-[#00c968]">
                        Concluída
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. "POR QUE ESCOLHER O GRUPLY?" SECTION
         ========================================================================= */}
      <section className="py-20 md:py-28 bg-[#f5f8f6]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column */}
            <div className="lg:col-span-5 flex flex-col gap-5 text-left">
              <div className="flex items-center gap-2">
                <span className="w-4 h-[2px] bg-[#00c968]" />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#00c968]">
                  POR QUE ESCOLHER O GRUPLY?
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#0e261f] leading-[1.18] tracking-tight">
                Mais resultados <br />
                com menos esforço.
              </h2>

              <p className="text-sm sm:text-base text-[#55695e] leading-relaxed">
                Tudo o que você precisa para se comunicar melhor, aumentar seu alcance e fortalecer sua
                comunidade.
              </p>

              <div className="pt-2">
                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-bold text-white bg-[#0e261f] hover:bg-[#15382e] transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  <span>Ver todos os recursos</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Right Column (2x2 Feature Grid) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="bg-white border border-[#e5ebe7] rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-6 shadow-xs hover:shadow-md hover:border-[#00c968]/50 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#e6f9ef] text-[#00c968] flex items-center justify-center">
                    <Zap size={20} />
                  </div>
                  <ArrowRight size={18} className="text-[#9bb2a5] group-hover:text-[#00c968] group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0e261f] leading-tight">Automação inteligente</h3>
                  <p className="text-xs sm:text-sm text-[#6a7d73] mt-1.5 leading-snug">
                    Programe suas campanhas e economize tempo.
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-white border border-[#e5ebe7] rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-6 shadow-xs hover:shadow-md hover:border-[#2563eb]/50 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#eaf3fd] text-[#2563eb] flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <ArrowRight size={18} className="text-[#9bb2a5] group-hover:text-[#2563eb] group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0e261f] leading-tight">Mais engajamento</h3>
                  <p className="text-xs sm:text-sm text-[#6a7d73] mt-1.5 leading-snug">
                    Leve suas mensagens para mais pessoas.
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-white border border-[#e5ebe7] rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-6 shadow-xs hover:shadow-md hover:border-[#8b5cf6]/50 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#f4eefb] text-[#8b5cf6] flex items-center justify-center">
                    <BarChart3 size={20} />
                  </div>
                  <ArrowRight size={18} className="text-[#9bb2a5] group-hover:text-[#8b5cf6] group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0e261f] leading-tight">Relatórios completos</h3>
                  <p className="text-xs sm:text-sm text-[#6a7d73] mt-1.5 leading-snug">
                    Acompanhe entregas e resultados em tempo real.
                  </p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-white border border-[#e5ebe7] rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-6 shadow-xs hover:shadow-md hover:border-[#00c968]/50 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#e6f9ef] text-[#00c968] flex items-center justify-center">
                    <Lock size={20} />
                  </div>
                  <ArrowRight size={18} className="text-[#9bb2a5] group-hover:text-[#00c968] group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0e261f] leading-tight">Segurança e privacidade</h3>
                  <p className="text-xs sm:text-sm text-[#6a7d73] mt-1.5 leading-snug">
                    Seus dados protegidos sempre.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. "RESULTADOS REAIS" STATS BANNER (Dark Green Gradient Card)
         ========================================================================= */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[36px] bg-gradient-to-r from-[#041a12] via-[#08291e] to-[#041a12] text-white p-8 sm:p-12 lg:p-16 overflow-hidden shadow-2xl border border-[#164332]">
            {/* Glowing background circles */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#00c968]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#00c968]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
              {/* Left Column */}
              <div className="lg:col-span-5 flex flex-col gap-4 text-left">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#00c968]" />
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#00c968]">
                    RESULTADOS REAIS
                  </span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
                  Negócios de todos os tamanhos já confiam no <span className="text-[#00c968]">Gruply.</span>
                </h2>

                <p className="text-sm sm:text-base text-[#9eb5a9] leading-relaxed">
                  De pequenas comunidades a grandes empresas, mais pessoas estão se conectando e crescendo com
                  a gente.
                </p>
              </div>

              {/* Right Column: 3 Metric Badges */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 text-center">
                {/* Metric 1 */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#0e3b2b] text-[#00c968] flex items-center justify-center border border-[#1b5e45] shadow-inner">
                    <Users size={26} />
                  </div>
                  <div>
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight block">+3.000</span>
                    <span className="text-xs text-[#a3b9ad] mt-1 block">usuários ativos</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#0e3b2b] text-[#00c968] flex items-center justify-center border border-[#1b5e45] shadow-inner">
                    <MessageSquare size={26} />
                  </div>
                  <div>
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight block">+150 mil</span>
                    <span className="text-xs text-[#a3b9ad] mt-1 block">mensagens enviadas por mês</span>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#0e3b2b] text-[#00c968] flex items-center justify-center border border-[#1b5e45] shadow-inner">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight block">98%</span>
                    <span className="text-xs text-[#a3b9ad] mt-1 block">de taxa de entrega</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. "DEPOIMENTOS" (Testimonials) SECTION
         ========================================================================= */}
      <section id="depoimentos" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-12">
            <div className="flex flex-col gap-2 text-left">
              <div className="flex items-center gap-2">
                <span className="w-4 h-[2px] bg-[#00c968]" />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#00c968]">
                  DEPOIMENTOS
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0e261f] tracking-tight">
                O que nossos usuários dizem
              </h2>
              <p className="text-sm sm:text-base text-[#55695e]">
                Resultados reais de quem já usa o Gruply no dia a dia.
              </p>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handlePrevTestimonial}
                className="w-10 h-10 rounded-full border border-[#d6e0da] bg-white flex items-center justify-center text-[#0e261f] hover:bg-[#0e261f] hover:text-white hover:border-[#0e261f] transition-all cursor-pointer shadow-2xs"
                aria-label="Anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNextTestimonial}
                className="w-10 h-10 rounded-full border border-[#d6e0da] bg-white flex items-center justify-center text-[#0e261f] hover:bg-[#0e261f] hover:text-white hover:border-[#0e261f] transition-all cursor-pointer shadow-2xs"
                aria-label="Próximo"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* 3 Testimonial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#e5ebe7] rounded-2xl p-6 flex flex-col justify-between gap-5 shadow-xs hover:shadow-md hover:border-[#00c968]/50 transition-all"
              >
                {/* Author Info */}
                <div className="flex items-center gap-3.5">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#e6f9ef]"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-[#0e261f] leading-tight">{t.name}</h3>
                    <p className="text-xs text-[#6a7d73] mt-0.5">{t.role}</p>
                  </div>
                </div>

                {/* Quote */}
                <p className="text-xs sm:text-sm text-[#41554a] leading-relaxed italic">
                  {t.text}
                </p>

                {/* Stars */}
                <div className="flex items-center gap-1 text-[#00c968]">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} size={15} className="fill-[#00c968]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. BOTTOM CTA BANNER
         ========================================================================= */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[32px] bg-[#e9f8f0] border border-[#c4e8d3] p-8 sm:p-12 lg:p-14 overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 shadow-sm">
            {/* Organic green shapes in the corners */}
            <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-[#00c968]/20 blur-2xl pointer-events-none" />
            <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-[#00c968]/25 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-2 text-left max-w-xl">
              <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-[#0e261f] leading-tight tracking-tight">
                Pronto para levar suas mensagens mais longe?
              </h2>
              <p className="text-sm sm:text-base text-[#55695e]">
                Crie sua conta agora e comece a usar o Gruply gratuitamente.
              </p>
            </div>

            <div className="relative z-10 flex flex-col items-center lg:items-end gap-2.5 shrink-0">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full text-base font-bold text-white bg-[#0e261f] hover:bg-[#163a2f] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Começar agora grátis</span>
                <ArrowRight size={18} />
              </button>

              <p className="text-xs text-[#55695e]">
                Já tem uma conta?{' '}
                <button
                  onClick={onLogin || onGetStarted}
                  className="font-bold text-[#00c968] hover:underline cursor-pointer"
                >
                  Entrar
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. FOOTER
         ========================================================================= */}
      <footer className="bg-white border-t border-[#e5ebe7] pt-14 pb-10 text-[#55695e] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#eef2ef]">
            {/* Brand column */}
            <div className="md:col-span-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00c968] flex items-center justify-center text-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3C6.477 3 2 6.94 2 11.8c0 2.22.92 4.25 2.45 5.82L3.3 21l4.03-1.34c1.43.6 3.01.94 4.67.94 5.523 0 10-3.94 10-8.8S17.523 3 12 3z"
                      fill="white"
                    />
                    <circle cx="8" cy="11.5" r="1.5" fill="#00c968" />
                    <circle cx="12" cy="11.5" r="1.5" fill="#00c968" />
                    <circle cx="16" cy="11.5" r="1.5" fill="#00c968" />
                  </svg>
                </div>
                <span className="text-xl font-black text-[#0e261f] tracking-tight">gruply</span>
              </div>
              <p className="text-xs text-[#6a7d73]">Grupos que geram resultados.</p>
            </div>

            {/* Produto */}
            <div className="md:col-span-2 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-[#0e261f] uppercase tracking-wider">Produto</span>
              <a href="#recursos" className="hover:text-[#00c968] transition-colors">
                Recursos
              </a>
              <a
                href="#planos"
                onClick={(e) => {
                  if (onNavigateToPlans) {
                    e.preventDefault();
                    onNavigateToPlans();
                  }
                }}
                className="hover:text-[#00c968] transition-colors"
              >
                Planos
              </a>
              <a href="#recursos" className="hover:text-[#00c968] transition-colors">
                Segurança
              </a>
              <a href="#recursos" className="hover:text-[#00c968] transition-colors">
                Integrações
              </a>
            </div>

            {/* Empresa */}
            <div className="md:col-span-3 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-[#0e261f] uppercase tracking-wider">Empresa</span>
              <a href="#" className="hover:text-[#00c968] transition-colors">
                Sobre
              </a>
              <a href="#" className="hover:text-[#00c968] transition-colors">
                Blog
              </a>
              <a href="#" className="hover:text-[#00c968] transition-colors">
                Contato
              </a>
              <a href="#" className="hover:text-[#00c968] transition-colors">
                Termos de uso
              </a>
              <a href="#" className="hover:text-[#00c968] transition-colors">
                Política de privacidade
              </a>
            </div>

            {/* Siga a gente */}
            <div className="md:col-span-3 flex flex-col gap-3">
              <span className="text-xs font-bold text-[#0e261f] uppercase tracking-wider">Siga a gente</span>
              <div className="flex items-center gap-2.5 text-[#0e261f]">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full border border-[#d6e0da] flex items-center justify-center hover:bg-[#00c968] hover:text-white hover:border-[#00c968] transition-all"
                  aria-label="Instagram"
                >
                  <Instagram size={16} />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full border border-[#d6e0da] flex items-center justify-center hover:bg-[#00c968] hover:text-white hover:border-[#00c968] transition-all"
                  aria-label="YouTube"
                >
                  <Youtube size={16} />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full border border-[#d6e0da] flex items-center justify-center hover:bg-[#00c968] hover:text-white hover:border-[#00c968] transition-all"
                  aria-label="LinkedIn"
                >
                  <Linkedin size={16} />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Made with love */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#7a8d83]">
            <span>© 2026 Gruply. Todos os direitos reservados.</span>
            <span>Feito com 💙 para conectar pessoas.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
