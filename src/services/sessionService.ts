let currentUser: any = null;
let preferredPanel: 'client' | 'admin' = 'client';

export const sessionService = {
  getUser: () => currentUser,
  setUser: (user: any) => { currentUser = user || null; },
  clear: () => { currentUser = null; preferredPanel = 'client'; },
  getPreferredPanel: () => preferredPanel,
  setPreferredPanel: (mode: 'client' | 'admin') => { preferredPanel = mode; },
  async status() {
    const response = await fetch('/api/account/status');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || 'SessÃ£o invÃ¡lida.'), { status: response.status });
    currentUser = data.user || null;
    return data;
  },
  async logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } finally { this.clear(); }
  },
};

