import { isOpenJoinedGroup } from './campaignRules';

// This rollout is explicitly restricted to the account and phone requested by its owner.
export const GROUP_AUTOMATION_CAMPAIGN = 'div-1791448389589';
export const GROUP_AUTOMATION_TIMES = ['07:00', '15:00', '21:00'];
const normalize = (s: unknown) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const digits = (s: unknown) => String(s || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const truth = (v: unknown) => [true, 1, 'true', '1'].includes(v as any);
const explicitFalse = (v: unknown) => [false, 0, 'false', '0'].includes(v as any);

export function inviteCode(link: unknown): string | undefined {
  try {
    const u = new URL(String(link));
    if (u.protocol !== 'https:' || u.hostname !== 'chat.whatsapp.com' || u.username || u.password || u.port) return;
    return u.pathname.match(/^\/(?:invite\/)?([A-Za-z0-9]{20,32})\/?$/)?.[1];
  } catch { return; }
}

export function permitsAdvertising(group: any): boolean {
  const text = normalize(`${group.subject || group.name || ''}\n${group.desc || group.description || ''}`);
  if (/(?:proibid[oa]s?|nao (?:(?:e|sao) )?permitid[oa]s?|nao pode|sem)[\s:*-]+(?:(?:a|o|as|os|qualquer|tipo|de)\s+){0,4}(?:vendas?|anuncios?|divulgac\w*|propagandas?|links?)/.test(text) ||
      /nao\s+(?:divulgu\w*|anunci\w*|publique\w*)/.test(text) ||
      /(?:vendas?|anuncios?|divulgac\w*|propagandas?)\s+(?:sao?\s+)?proibid/.test(text) ||
      /(?:somente|apenas|exclusiv[oa])\s+(?:para\s+)?(?:vagas|empregos|doac)/.test(text) ||
      /(?:uma|1)\s+(?:vez|postagem|publicacao|divulgacao|propaganda|mensagem)\s+(?:por|ao|a cada)|a cada\s+24\s*(?:h|horas)/.test(text)) return false;
  return /divulgac|anuncie|classificados|comercio|comercial|compra\s*(?:e|&)\s*venda|vendas|olx|feira|empreendedores/.test(text);
}

export function groupEligibility(group: any, joined = false, owner = ''): string | null {
  if (!String(group?.id || group?.jid || '').endsWith('@g.us')) return 'Identificador inválido';
  if (['isCommunity', 'isCommunityAnnounce', 'isCommunityAnnouncement', 'left', 'isLeft'].some(k => truth(group[k]))) return 'Comunidade ou participação encerrada';
  if (!explicitFalse(group.announce) || truth(group.restrictSend) || group.canSend === false) return 'Conversa fechada ou não confirmada';
  const size = Number(group.size ?? group.membersCount ?? group.memberCount ?? group.participants?.length);
  if (!Number.isFinite(size) || size < 100) return 'Menos de 100 participantes ou quantidade desconhecida';
  if (!permitsAdvertising(group)) return 'Divulgação não permitida ou finalidade incompatível';
  if (joined && !(group.membershipConfirmed === true || isOpenJoinedGroup(group, owner))) return 'Participação não confirmada';
  return null;
}

export function groupList(data: any): any[] {
  if (Array.isArray(data)) return data;
  for (const list of [data?.groups, data?.data, data?.response, data?.result]) if (Array.isArray(list)) return list;
  throw new Error('Resposta de grupos inválida; participação não alterada.');
}

type Entry = { jid: string; name: string; membersCount: number; checkedAt: number };
export interface GroupAutomationState {
  version: 1; enabled: boolean; instance: string; ownerPhone: string; campaignId: string;
  target: 100; minMembers: 100; times: string[]; timezone: string;
  groups: Entry[]; observedJids: string[]; excludedJids: string[];
  attempts: Record<string, { jid: string; status: string; at: number; retryAt?: number }>;
  candidates: any[]; offset: number; catalogNextAt: number; syncAt: number; nextRunAt: number;
  failures: number; status: string; lastError?: string; updatedAt: number;
  events: { at: number; text: string }[];
}
type EvolutionResult = { ok: boolean; status: number; data: any };
export interface GroupAutomationDeps {
  database(): Promise<any>;
  evolution(endpoint: string): Promise<EvolutionResult>;
  joined(instance: string, userId: number, db: any): Promise<any[]>;
  catalog(offset: number): Promise<{ groups: any[]; hasMore: boolean; limit: number }>;
  busy(campaign: string): boolean;
  now?(): number;
}
export class GroupAutomationEngine {
  private running = false;
  constructor(private deps: GroupAutomationDeps) {}
  private now() { return this.deps.now?.() ?? Date.now(); }
  private key(id: number) { return `group-automation:${id}`; }
  private note(s: GroupAutomationState, text: string) {
    s.events = [{ at: this.now(), text }, ...s.events].slice(0, 40);
  }
  private async state(db: any, userId: number): Promise<GroupAutomationState | null> { return db.getAdminState(this.key(userId)); }
  async status(user: any, db: any) {
    if ((await db.findGroupAutomationUser(GROUP_AUTOMATION_CAMPAIGN))?.id !== user.id) return { available: false };
    const state = await this.state(db, user.id);
    if (!state) return { available: true, status: 'preparando', target: 100, count: 0, times: GROUP_AUTOMATION_TIMES };
    const { attempts, candidates, observedJids, excludedJids, ...visible } = state;
    const reasons: Record<string, number> = {};
    for (const a of Object.values(attempts)) reasons[a.status] = (reasons[a.status] || 0) + 1;
    return { available: true, ...visible, count: state.groups.length, excluded: excludedJids.length,
      diagnostics: { catalogOffset: state.offset, queuedCandidates: candidates.length, attempts: Object.keys(attempts).length, reasons },
      awaitingConfirmation: Object.values(attempts).filter(a => a.status === 'confirmando').length };
  }
  async setEnabled(user: any, db: any, enabled: boolean) {
    if ((await db.findGroupAutomationUser(GROUP_AUTOMATION_CAMPAIGN))?.id !== user.id) throw new Error('Automação indisponível para esta conta.');
    const release = await db.acquireGroupAutomationLock(user.id);
    if (!release) throw new Error('Uma verificação está em andamento. Tente novamente em instantes.');
    try {
      const state = await this.state(db, user.id);
      if (!state) throw new Error('Aguarde a preparação inicial da automação.');
      state.enabled = enabled; state.nextRunAt = 0; state.updatedAt = this.now();
      state.status = enabled ? 'aguardando_verificacao' : 'pausada';
      const camp = (await db.listCampaignsForUser(user.id)).find((c: any) => c.id === state.campaignId);
      if (camp?.status === 'enviando' || this.deps.busy(state.campaignId)) throw new Error('Aguarde a rodada de envio terminar para alterar a automação.');
      // Persist the pause first: delivery checks also read this switch before each recipient.
      await db.setAdminState(this.key(user.id), state);
      if (camp) {
        if (!enabled) { camp.active = false; camp.status = 'pausada'; }
        else this.skipElapsedSlots(camp, state);
        await db.saveCampaignForUser(user.id, camp);
      }
    } finally { await release(); }
  }
  private async request(endpoint: string) {
    const r = await this.deps.evolution(endpoint);
    const text = normalize(JSON.stringify(r.data));
    if (r.status === 429 || /rate.overlimit|rate limit/.test(text)) throw Object.assign(new Error('WhatsApp limitou as consultas; próxima tentativa com intervalo maior.'), { rateLimited: true });
    return r;
  }
  async tick() {
    if (this.running) return;
    this.running = true;
    let release: (() => Promise<void>) | null = null;
    let db: any, user: any, state: GroupAutomationState | null = null;
    try {
      db = await this.deps.database();
      user = await db.findGroupAutomationUser(GROUP_AUTOMATION_CAMPAIGN);
      if (!user) return;
      release = await db.acquireGroupAutomationLock(user.id);
      if (!release) return;
      const record = await db.getUserInstance(user.id);
      if (!record) return;
      // Initial binding uses the existing campaign's own instance; subsequent changes halt maintenance.
      state = await this.state(db, user.id);
      if (!state && !digits(record.owner_phone).endsWith('6930')) return;
      if (state && (!state.enabled || state.nextRunAt > this.now())) return;
      const campaigns = await db.listCampaignsForUser(user.id);
      const campaign = campaigns.find((c: any) => c.id === (state?.campaignId || GROUP_AUTOMATION_CAMPAIGN));
      if (!campaign || !String(campaign.previewText || '').trim()) return;
      if (!state && campaign.instanceName && campaign.instanceName !== record.instance_name) return;
      if (this.deps.busy(campaign.id) || campaign.status === 'enviando') return;
      if (!state) {
        state = { version: 1, enabled: true, instance: record.instance_name, ownerPhone: digits(record.owner_phone),
          campaignId: campaign.id, target: 100, minMembers: 100, times: [...GROUP_AUTOMATION_TIMES], timezone: 'America/Sao_Paulo',
          groups: [], observedJids: [], excludedJids: [], attempts: {}, candidates: [], offset: 0,
          catalogNextAt: 0, syncAt: 0, nextRunAt: 0, failures: 0, status: 'verificando', updatedAt: this.now(), events: [] };
        this.note(state, 'Automação preparada exclusivamente para esta conta e este número.');
      }
      state.nextRunAt = this.now() + 120_000;
      state.updatedAt = this.now();
      if (state.instance !== record.instance_name || digits(record.owner_phone) !== state.ownerPhone) {
        state.status = 'numero_divergente'; state.lastError = 'O número da instância não corresponde ao número autorizado.'; return;
      }
      const sub = await db.getSubscriptionForUser(user.id);
      if (!['admin', 'manager'].includes(user.role) && normalize(sub?.status) !== 'active') {
        state.status = 'plano_inativo'; return;
      }
      if (!campaign.managedGroupAutomation) await this.updateCampaign(db, user.id, state, campaign);
      const connected = await this.request(`/instance/connectionState/${encodeURIComponent(state.instance)}`);
      if (!connected.ok || (connected.data?.instance?.state || connected.data?.state) !== 'open') {
        state.status = 'desconectada'; state.lastError = 'Aguardando reconexão do WhatsApp.'; return;
      }
      // A failed/limited snapshot must throw. Never infer removals from an unavailable list.
      const live = await this.deps.joined(state.instance, user.id, db);
      const observed = new Set<string>(live.map(g => String(g.jid || g.id)));
      for (const jid of state.observedJids) if (!observed.has(jid) && !state.excludedJids.includes(jid)) {
        state.excludedJids.push(jid); this.note(state, `Grupo indisponível: ${jid}. Será procurado outro grupo.`);
      }
      state.observedJids = [...observed];
      state.groups = live.filter(g => !state!.excludedJids.includes(g.jid || g.id) && !groupEligibility(g, true, state!.ownerPhone))
        .slice(0, state.target).map(g => ({ jid: g.jid || g.id, name: g.name || g.subject,
          membersCount: Number(g.membersCount ?? g.size), checkedAt: this.now() }));
      state.syncAt = this.now();
      for (const a of Object.values(state.attempts)) if (observed.has(a.jid)) a.status = 'participando';
      await this.updateCampaign(db, user.id, state, campaign);
      state.status = state.groups.length >= state.target ? 'meta_atingida' : 'completando_grupos';
      state.lastError = undefined;
      if (state.groups.length >= state.target) { state.failures = 0; return; }
      const pending = Object.values(state.attempts).filter(a => a.status === 'confirmando' && !observed.has(a.jid) && !state!.excludedJids.includes(a.jid)).length;
      if (state.groups.length + pending >= state.target) { state.status = 'aguardando_confirmacoes'; return; }

      // Bound work per tick: at most one new invitation; pending/ambiguous joins are not retried.
      if (!state.candidates.length && this.now() >= state.catalogNextAt) {
        const page = await this.deps.catalog(state.offset);
        state.candidates = page.groups.filter(g => inviteCode(g.whatsappLink) && Number(g.memberCount) >= 100 && permitsAdvertising(g))
          .map(g => ({ name: g.name, description: g.description, whatsappLink: g.whatsappLink }));
        state.offset = page.hasMore ? state.offset + page.limit : 0;
        state.catalogNextAt = page.hasMore ? this.now() : this.now() + 30 * 60_000;
      }
      const candidate = state.candidates.shift();
      if (!candidate) { state.status = 'buscando_candidatos'; state.failures = 0; return; }
      const code = inviteCode(candidate.whatsappLink)!;
      const attempt = state.attempts[code];
      if (attempt && (!attempt.retryAt || attempt.retryAt > this.now())) return;
      const infoResponse = await this.request(`/group/inviteInfo/${encodeURIComponent(state.instance)}?inviteCode=${encodeURIComponent(code)}`);
      if (!infoResponse.ok) {
        if (infoResponse.status !== 404 && infoResponse.status !== 400) throw new Error('Não foi possível validar o convite agora.');
        state.attempts[code] = { jid: '', status: 'convite_invalido', at: this.now(), retryAt: this.now() + 24 * 60 * 60_000 }; return;
      }
      const info = infoResponse.data?.data || infoResponse.data;
      const jid = String(info?.id || info?.jid || info?.groupJid || '');
      const reason = groupEligibility(info);
      if (reason || truth(info?.joinApprovalMode) || observed.has(jid) || state.excludedJids.includes(jid)) {
        state.attempts[code] = { jid, status: reason || 'Já participa, removido anteriormente ou exige aprovação', at: this.now(), retryAt: this.now() + 24 * 60 * 60_000 }; return;
      }
      // Durable intent BEFORE the network mutation: a timeout/process death cannot cause a second join.
      state.attempts[code] = { jid, status: 'confirmando', at: this.now() };
      await db.setAdminState(this.key(user.id), state);
      const accepted = await this.request(`/group/acceptInviteCode/${encodeURIComponent(state.instance)}?inviteCode=${encodeURIComponent(code)}`);
      if (!accepted.ok || accepted.data?.accepted !== true || accepted.data?.groupJid !== jid) {
        this.note(state, `Entrada aguardando confirmação: ${info.subject || info.name || jid}.`); return;
      }
      // Count only membership verified by real metadata, never just accepted:true.
      const verification = await this.request(`/group/findGroupInfos/${encodeURIComponent(state.instance)}?groupJid=${encodeURIComponent(jid)}`);
      const metadata = verification.data?.data || verification.data;
      if (verification.ok && !groupEligibility(metadata, true, state.ownerPhone)) {
        state.attempts[code].status = 'participando';
        if (!state.groups.some(g => g.jid === jid)) state.groups.push({ jid, name: metadata.subject || metadata.name,
          membersCount: Number(metadata.size ?? metadata.participants?.length), checkedAt: this.now() });
        if (!state.observedJids.includes(jid)) state.observedJids.push(jid);
        this.note(state, `Entrada confirmada: ${metadata.subject || jid} (${state.groups.length}/100).`);
        await this.updateCampaign(db, user.id, state, campaign);
      }
      state.failures = 0;
    } catch (e: any) {
      if (state) {
        state.failures = Math.min(state.failures + 1, 7);
        state.nextRunAt = this.now() + Math.min(60 * 60_000, 60_000 * 2 ** state.failures);
        state.status = 'aguardando_nova_tentativa';
        // Never persist upstream response bodies, invite codes, keys, or credentials in logs/UI.
        state.lastError = e?.rateLimited ? 'WhatsApp limitou as consultas. Aguardando nova tentativa.' : 'Verificação temporariamente indisponível. Os envios exigem nova confirmação ao vivo.';
      }
    } finally {
      try { if (db && user && state && release) await db.setAdminState(this.key(user.id), state); }
      finally { if (release) await release(); this.running = false; }
    }
  }
  private async updateCampaign(db: any, userId: number, state: GroupAutomationState, campaign: any) {
    if (this.deps.busy(campaign.id) || campaign.status === 'enviando') return;
    if (!campaign.managedGroupAutomation) {
      // Starting at 16:00 must not trigger today's 07:00/15:00 slots as catch-up sends.
      this.skipElapsedSlots(campaign, state);
      campaign.managedGroupAutomation = true;
    }
    Object.assign(campaign, { selectedGroupJids: state.groups.map(g => g.jid), groupsCount: state.groups.length,
      totalTarget: state.groups.length, scheduleMode: 'recorrente', scheduleDays: 'Todos os dias',
      scheduleTimes: [...state.times], scheduleTime: state.times[0], active: true, status: 'ativa',
      instanceName: state.instance });
    await db.saveCampaignForUser(userId, campaign);
  }
  private skipElapsedSlots(campaign: any, state: GroupAutomationState) {
    const date = new Date(this.now());
    const localDate = date.toLocaleDateString('en-CA', { timeZone: state.timezone });
    const localTime = date.toLocaleTimeString('pt-BR', { timeZone: state.timezone, hour: '2-digit', minute: '2-digit', hour12: false });
    campaign.completedSlots = [...new Set([...(campaign.completedSlots || []), ...state.times.filter(t => t <= localTime).map(t => `${localDate}_${t}`)])];
    campaign.pendingRunKey = undefined;
    campaign.lastExecutedSlot = undefined;
    campaign.executed = false;
  }
  async canSend(userId: number, instance: string, jid: string, db: any): Promise<boolean> {
    const state = await this.state(db, userId);
    if (!state?.enabled || state.instance !== instance || !state.groups.some(g => g.jid === jid) || state.excludedJids.includes(jid)) return false;
    const record = await db.getUserInstance(userId);
    if (record?.instance_name !== instance || digits(record.owner_phone) !== state.ownerPhone) return false;
    const result = await this.request(`/group/findGroupInfos/${encodeURIComponent(instance)}?groupJid=${encodeURIComponent(jid)}`);
    return result.ok && !groupEligibility(result.data?.data || result.data, true, state.ownerPhone);
  }
}
