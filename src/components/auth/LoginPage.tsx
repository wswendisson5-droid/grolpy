import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, CheckCircle2, ShieldCheck, Zap, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onNavigateRegister: () => void;
  onNavigateHome?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateRegister,
  onNavigateHome,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível entrar.');
      localStorage.setItem('groply_token', data.token);
      localStorage.setItem('groply_user', JSON.stringify(data.user));
      onLoginSuccess();
    } catch (err:any) { setErrorMessage(err.message || 'Não foi possível entrar.'); }
    finally { setIsLoading(false); }
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between text-[#142d23] font-sans antialiased selection:bg-[#00c968] selection:text-white">
      {/* Top Bar for Mobile navigation */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 cursor-pointer text-left group"
        >
          <img
            src="https://i.imgur.com/HqvEmQF.png"
            alt="Groply"
            referrerPolicy="no-referrer"
            className="h-10 w-auto object-contain max-w-[170px]"
          />
        </button>

        {/* Top Right Switch to Register Link */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <span className="text-[#596f63] hidden sm:inline">Ainda não tem conta?</span>
          <button
            onClick={onNavigateRegister}
            className="font-bold text-[#00c968] hover:text-[#00a855] hover:underline transition-all cursor-pointer"
          >
            Criar conta
          </button>
        </div>
      </div>

      {/* Main Split Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* Left Hero / Brand Column (Responsive Typography & Value Props, No heavy photos on desktop) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center pr-4">
            <div className="w-12 h-1.5 bg-[#00c968] rounded-full mb-6" />

            <h1 className="text-4xl xl:text-5xl font-black text-[#0e261f] tracking-tight leading-[1.12] mb-5">
              Mais <br />
              conexões <br />
              para o seu <br />
              <span className="text-[#00c968]">negócio.</span>
            </h1>

            <p className="text-base xl:text-lg text-[#556b5f] font-normal leading-relaxed max-w-lg mb-8">
              Automatize o envio de mensagens em grupos do WhatsApp de forma simples, segura e eficiente.
            </p>

            {/* Value Props Badges */}
            <div className="space-y-3.5 max-w-md">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 border border-[#e1eae4] shadow-2xs backdrop-blur-xs">
                <div className="w-8 h-8 rounded-xl bg-[#e8f7ee] text-[#00c968] flex items-center justify-center shrink-0">
                  <Zap size={17} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0e261f]">Disparos Rápidos e Automatizados</p>
                  <p className="text-[11px] text-[#697e72]">Divulgue em dezenas de grupos simultaneamente</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 border border-[#e1eae4] shadow-2xs backdrop-blur-xs">
                <div className="w-8 h-8 rounded-xl bg-[#e8f7ee] text-[#00c968] flex items-center justify-center shrink-0">
                  <ShieldCheck size={17} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0e261f]">Intervalos Inteligentes Anti-Bloqueio</p>
                  <p className="text-[11px] text-[#697e72]">Envios humanizados que protegem seu WhatsApp</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 border border-[#e1eae4] shadow-2xs backdrop-blur-xs">
                <div className="w-8 h-8 rounded-xl bg-[#e8f7ee] text-[#00c968] flex items-center justify-center shrink-0">
                  <Sparkles size={17} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0e261f]">Sincronização Direta de Grupos</p>
                  <p className="text-[11px] text-[#697e72]">Seus grupos reais sempre atualizados no painel</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="w-full lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-9 border border-[#e2eae5] shadow-[0_12px_40px_rgba(14,38,31,0.06)]">
              
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-[#0e261f] tracking-tight">
                  Bem-vindo de volta
                </h2>
                <p className="text-xs sm:text-sm text-[#61766b] mt-1.5">
                  Acesse sua conta e continue gerando resultados com o Gruply.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* E-mail */}
                <div>
                  <label className="block text-xs font-bold text-[#23382d] mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full px-4 py-3 bg-[#f8faf9] hover:bg-white focus:bg-white text-sm text-[#0e261f] placeholder-[#8ca094] rounded-xl border border-[#dce5e0] focus:border-[#00c968] focus:ring-2 focus:ring-[#00c968]/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-xs font-bold text-[#23382d] mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      required
                      className="w-full pl-4 pr-11 py-3 bg-[#f8faf9] hover:bg-white focus:bg-white text-sm text-[#0e261f] placeholder-[#8ca094] rounded-xl border border-[#dce5e0] focus:border-[#00c968] focus:ring-2 focus:ring-[#00c968]/20 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#768b80] hover:text-[#0e261f] transition-colors p-1"
                      aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Esqueceu sua senha */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => alert('Instruções de recuperação foram enviadas para seu e-mail cadastrado.')}
                    className="text-xs font-bold text-[#00c968] hover:text-[#00a855] hover:underline transition-colors cursor-pointer"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>

                {/* Entrar Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#00c968] hover:bg-[#00b55c] active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-[0_4px_14px_rgba(0,201,104,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Entrar</span>
                  )}
                </button>
              </form>

              {/* Separator */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e2eae5]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-[#879b90] font-medium">ou</span>
                </div>
              </div>

              {/* Continuar com o Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white hover:bg-[#f8faf9] text-[#243a2f] text-xs sm:text-sm font-bold rounded-xl border border-[#d6e0da] shadow-2xs hover:border-[#b4c8bc] transition-all cursor-pointer flex items-center justify-center gap-3"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Entrar com o Google</span>
              </button>

              <div className="mt-6 text-center lg:hidden">
                <span className="text-xs text-[#596f63]">Ainda não tem uma conta? </span>
                <button
                  onClick={onNavigateRegister}
                  className="text-xs font-bold text-[#00c968] hover:underline"
                >
                  Criar conta
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Bottom Footer brand line */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 border-t border-[#e5ebe7] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#71867b]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#142d23] uppercase tracking-wider text-[10px]">GRUPLY</span>
          <span>•</span>
          <span>Grupos que geram resultados.</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="hover:text-[#142d23] cursor-pointer">Termos de uso</span>
          <span className="hover:text-[#142d23] cursor-pointer">Política de privacidade</span>
          <span className="hover:text-[#142d23] cursor-pointer">Suporte</span>
        </div>
      </div>
    </div>
  );
};
