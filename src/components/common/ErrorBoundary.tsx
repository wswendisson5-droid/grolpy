import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
  errorInfo: any;
}

export class ErrorBoundary extends (React.Component as any) {
  public state: State;
  public props: Props;
  public setState: (state: Partial<State> | ((prev: State) => Partial<State>)) => void;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: any): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: any, errorInfo: any) {
    console.error('[Grolpy ErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem('groply_token');
      localStorage.removeItem('groply_user');
      localStorage.removeItem('groply_whatsapp_profile');
      localStorage.removeItem('groply_cached_groups');
      localStorage.removeItem('groply_preferred_panel');
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#f8faf9] flex flex-col items-center justify-center p-4 text-[#142d23] font-sans antialiased">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-[#e1eae4] shadow-lg text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
              <AlertTriangle size={28} />
            </div>

            <h1 className="text-xl font-black text-[#0e261f] tracking-tight mb-2">
              Ocorreu um imprevisto ao carregar
            </h1>

            <p className="text-sm text-[#556b5f] leading-relaxed mb-6">
              Não se preocupe, seus dados estão seguros. Você pode tentar recarregar a página ou redefinir a sessão local.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full h-11 rounded-xl bg-[#00c968] text-[#0a2318] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#00df73] transition-all cursor-pointer shadow-md shadow-[#00c968]/20"
              >
                <RefreshCw size={16} />
                <span>Recarregar página</span>
              </button>

              <button
                onClick={this.handleResetSession}
                className="w-full h-11 rounded-xl bg-[#f0f5f2] text-[#3d5347] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#e4ede7] transition-all cursor-pointer"
              >
                <LogOut size={16} />
                <span>Limpar cache e entrar novamente</span>
              </button>
            </div>

            {this.state.error && (
              <div className="mt-6 text-left">
                <details className="text-[11px] text-[#82968b] bg-[#f8faf9] p-3 rounded-xl border border-[#e2ece6] overflow-x-auto">
                  <summary className="font-bold cursor-pointer text-[#506659]">Detalhes do erro técnico</summary>
                  <p className="font-mono mt-2 text-red-600">{String(this.state.error?.message || this.state.error)}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-1 font-mono whitespace-pre-wrap text-[10px]">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </details>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
