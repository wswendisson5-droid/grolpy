let currentUser: any = null;
let preferredPanel: 'client' | 'admin' = 'client';

export const sessionService = {
  getUser: () => currentUser,
  setUser: (user: any) => { currentUser = user || null; },
  clear: () => { currentUser = null; preferredPanel = 'client'; },
  getPreferredPanel: () => preferredPanel,
  setPreferredPanel: (mode: 'client' | 'admin') => { preferredPanel = mode; },
  async status() {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4500);
    let response: Response;
    try { response = await fetch('/api/account/status', { signal: controller.signal }); }
    catch (error: any) { throw Object.assign(new Error(error?.name === 'AbortError' ? 'Tempo limite ao carregar a sessão.' : 'Falha ao carregar a sessão.'), { status: 503 }); }
    finally { window.clearTimeout(timer); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || 'Sessão inválida.'), { status: response.status });
    currentUser = data.user || null;
    return data;
  },
  async logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } finally { this.clear(); }
  },
};

