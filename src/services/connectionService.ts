import QRCode from 'qrcode';
import { ConnectionInfo, ConnectionStatus, QrCodeData } from '../types/connection';
import { safeEncodeURIComponent } from '../utils/safeUri';

class ConnectionService {
  private currentSelectedInstance: string = '';

  private authHeaders(extra: Record<string,string> = {}) {
    const token = typeof window !== 'undefined' ? '' : '';
    return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }

  /**
   * Get the locally selected instance name
   */
  getSelectedInstance(): string {
    return this.currentSelectedInstance;
  }

  /**
   * Fetch current instance connection status and profile from the backend
   */
  async getStatus(instanceName?: string): Promise<ConnectionInfo> {
    const url=instanceName?`/api/evolution/status?instance=${safeEncodeURIComponent(instanceName)}`:'/api/evolution/status';
    const res=await fetch(url,{headers:this.authHeaders()}); if(!res.ok) throw new Error(`Erro na resposta do servidor (${res.status})`);
    const data=await res.json(); let qrCode=data.qrCode;
    if(qrCode?.code&&!qrCode?.base64){try{qrCode.base64=await QRCode.toDataURL(qrCode.code,{margin:2,width:320,color:{dark:'#12382c',light:'#ffffff'}})}catch{}}
    return {instanceName:data.instanceName||instanceName||'',platform:data.platform||'Evolution API',status:data.state||data.status||'disconnected',webhookStatus:data.webhook?.status||'waiting',qrCode,profile:data.connectedProfile,apiStatus:'online',messagesToday:0,lastActivity:data.lastUpdated||''} as ConnectionInfo;
  }

  async requestNewQrCode(instanceName?: string, force = false): Promise<{ success: boolean; qrCode?: QrCodeData; instanceName?: string; pending?: boolean; error?: string }> {
    try {
      const base = instanceName ? `/api/evolution/qrcode?instance=${safeEncodeURIComponent(instanceName)}` : '/api/evolution/qrcode';
      const url = force ? `${base}${base.includes('?') ? '&' : '?'}force=true` : base;
      const res = await fetch(url, { headers: this.authHeaders() });
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: 'O servidor retornou uma resposta invÃ¡lida. Tente novamente.' }; }
      if (!res.ok && res.status !== 502) return { success: false, error: data.error || `Falha ao gerar QR Code (${res.status}).` };
      
      let qrCode = data.qrCode;
      if (qrCode?.code && !qrCode?.base64) {
        try {
          qrCode.base64 = await QRCode.toDataURL(qrCode.code, { margin: 2, width: 320, color: { dark: '#12382c', light: '#ffffff' } });
        } catch {}
      }
      return { success: true, qrCode, instanceName: data.instanceName, pending: Boolean(data.pending) };
    } catch (err: any) {
      return { success: false, error: err.message || 'NÃ£o foi possÃ­vel gerar o QR Code.' };
    }
  }

  /**
   * Create instance on Evolution if it does not exist yet
   */
  async createInstance(instanceName?: string): Promise<{ success: boolean; qrCode?: QrCodeData; error?: string }> {
    try {
      const res = await fetch('/api/evolution/create-instance', {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ instanceName }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao criar instÃ¢ncia' };
      }

      let qrCode = data.qrCode;
      if (qrCode?.code && !qrCode?.base64) {
        try {
          qrCode.base64 = await QRCode.toDataURL(qrCode.code, {
            margin: 2,
            width: 320,
            color: {
              dark: '#12382c',
              light: '#ffffff',
            },
          });
        } catch (e) {
          console.error('Failed to convert code to QR image:', e);
        }
      }

      return { success: true, qrCode };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Restart / Reconnect instance
   */
  async restartInstance(instanceName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/evolution/restart', {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ instanceName }),
      });
      const data = await res.json();
      return { success: res.ok, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Logout / Disconnect instance
   */
  async disconnectInstance(instanceName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/evolution/logout', {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ instanceName }),
      });
      const data = await res.json();
      return { success: res.ok, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Setup Webhook in Evolution API
   */
  async setupWebhook(instanceName?: string): Promise<{ success: boolean; webhookUrl?: string; error?: string }> {
    try {
      const res = await fetch('/api/evolution/set-webhook', {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ instanceName }),
      });
      const data = await res.json();
      return { success: res.ok, webhookUrl: data.webhookUrl, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch all Evolution instances available on the server
   */
  async getInstances(): Promise<{
    success: boolean;
    currentInstance: string;
    instances: Array<{
      id: string;
      name: string;
      connectionStatus: string;
      ownerJid?: string;
      ownerPhone?: string;
      profileName?: string;
      profilePicUrl?: string;
      messageCount: number;
      contactCount: number;
      chatCount: number;
      isCurrent: boolean;
    }>;
  }> {
    try {
      const res = await fetch('/api/evolution/instances',{headers:this.authHeaders()});
      const data = await res.json();
      return data;
    } catch {
      return { success: false, currentInstance: '', instances: [] };
    }
  }

  /**
   * Select active instance on the backend
   */
  async selectInstance(instanceName: string): Promise<boolean> {
    this.currentSelectedInstance = instanceName;
    try {
      const res = await fetch('/api/evolution/select-instance', {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ instanceName }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Reset instance cleanly: deletes Baileys session and recreates with fresh count: 1 QR
   */
  async resetInstance(instanceName?: string): Promise<{ success: boolean; qrCode?: QrCodeData; error?: string }> {
    try {
      const res = await fetch('/api/evolution/reset-instance', {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ instanceName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao reiniciar sessÃ£o.');
      }
      return {
        success: true,
        qrCode: data.qrCode,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Save dynamic credentials to server memory
   */
  async saveCredentials(config: { apiUrl: string; apiKey: string; instanceName: string }): Promise<boolean> {
    try {
      const res = await fetch('/api/evolution/credentials', {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(config),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const connectionService = new ConnectionService();
