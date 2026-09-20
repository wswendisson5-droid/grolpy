export const representativeService = {
  async track(slug:string){ const r=await fetch('/api/referral/visit/'+encodeURIComponent(slug),{method:'POST'}); if(!r.ok) throw new Error('Link de representante inválido'); },
  async dashboard(){ const r=await fetch('/api/representative/dashboard'); if(!r.ok) throw new Error('Falha ao carregar painel'); return (await r.json()).data; },
  async list(){ const r=await fetch('/api/admin/representatives'); if(!r.ok) throw new Error('Falha ao carregar representantes'); return (await r.json()).representatives||[]; },
  async create(data:any){ const r=await fetch('/api/admin/representatives',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||'Falha ao criar representante'); return j; },
  async update(id:number,data:any){ const r=await fetch('/api/admin/representatives/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); if(!r.ok) throw new Error('Falha ao atualizar representante'); }
};