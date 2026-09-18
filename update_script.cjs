const fs = require('fs');
const content = fs.readFileSync('src/services/clientService.ts', 'utf8');

const newFunc = `  async getWhatsAppStatus(instance: string = this.defaultInstance): Promise<{
    isConnected: boolean;
    state: string;
    profile: {
      name?: string;
      number?: string;
      pictureUrl?: string;
      instanceName?: string;
    } | null;
  }> {
    let cachedProfile = null;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('groply_whatsapp_profile');
        if (saved) {
          cachedProfile = JSON.parse(saved);
        }
      } catch {}
    }

    try {
      const res = await fetch(\`/api/evolution/status?instance=\${safeEncodeURIComponent(instance)}\`);
      const data = await res.json();
      
      const isConn = data.state === 'connected' || data.state === 'open' || data.status === 'CONNECTED';
      const profile = data.connectedProfile || cachedProfile || { instanceName: instance };
      
      if (isConn && data.connectedProfile && typeof window !== 'undefined') {
        localStorage.setItem('groply_whatsapp_profile', JSON.stringify(data.connectedProfile));
      }
      
      return {
        isConnected: isConn,
        state: data.state || 'disconnected',
        profile,
      };
    } catch {}

    return {
      isConnected: false,
      state: 'disconnected',
      profile: cachedProfile || { instanceName: instance },
    };
  }`;

const oldFuncRegex = /async getWhatsAppStatus\([\s\S]*?return \{\s*isConnected: true,\s*state: 'connected',\s*profile: cachedProfile,\s*\};\s*\}/;

const newContent = content.replace(oldFuncRegex, newFunc);
fs.writeFileSync('src/services/clientService.ts', newContent);
