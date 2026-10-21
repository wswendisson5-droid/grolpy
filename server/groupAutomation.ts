import { isCommunityRelated, isConfirmedGroupMember, isOpenJoinedGroup } from './campaignRules';

// This rollout is explicitly restricted to the account and phone requested by its owner.
export const GROUP_AUTOMATION_CAMPAIGN = 'div-1791448389589';
export const GROUP_AUTOMATION_TARGET = 100;
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
  if (/aqueci(?:mento|[a-z]*)[^\n]{0,30}chips?|aquecer[^\n]{0,30}chips?|troca[^\n]{0,20}(?:mensagens|engajamento)/.test(text)) return false;
  if (/(?:proibid[oa]s?|nao (?:(?:e|sao) )?permitid[oa]s?|nao pode|sem)[\s:*-]+(?:(?:a|o|as|os|qualquer|tipo|de)\s+){0,4}(?:vendas?|anuncios?|divulgac\w*|propagandas?|links?)/.test(text) ||
      /nao\s+(?:divulgu\w*|anunci\w*|publique\w*)/.test(text) ||
      /(?:vendas?|anuncios?|divulgac\w*|propagandas?)\s+(?:sao?\s+)?proibid/.test(text) ||
      /(?:somente|apenas|exclusiv[oa])\s+(?:para\s+)?(?:vagas|empregos|doac)/.test(text) ||
      /(?:uma|1)\s+(?:vez|postagem|publicacao|divulgacao|propaganda|mensagem)\s+(?:por|ao|a cada)|a cada\s+24\s*(?:h|horas)/.test(text)) return false;
  return /divulg(?:ac|ue|ar)|anuncie|classificados|comercio|comercial|compra\s*(?:e|&)\s*venda|vendas|negocios|olx|feira|empreendedores/.test(text);
}

export function groupEligibility(group: any, joined = false, owner = ''): string | null {
  if (!String(group?.id || group?.jid || '').endsWith('@g.us')) return 'Identificador inválido';
  if (isCommunityRelated(group) || ['left', 'isLeft'].some(k => truth(group[k]))) return 'Comunidade, grupo vinculado a comunidade ou participação encerrada';
  if (!explicitFalse(group.announce) || truth(group.restrictSend) || explicitFalse(group.canSend) || explicitFalse(group.sendMessages)) return 'Conversa fechada ou não confirmada';
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
  target: number; minMembers: 100; times: string[]; timezone: string;
  groups: Entry[]; observedJids: string[]; excludedJids: string[];
  attempts: Record<string, { jid: string; status: string; at: number; retryAt?: number }>;
  candidates: any[]; offset: number; catalogNextAt: number; syncAt: number; nextRunAt: number;
  failures: number; status: string; lastError?: string; updatedAt: number;
  lastOperation?: string;
  membershipSnapshot?: any[];
  membershipSnapshotVersion?: 2;
  initialTargetReachedAt?: number;
  catalogVersion?: 2;
  prioritySeededAt?: number;
  lastCandidate?: { name: string; members?: number; memberSource: string; reason: string; checkedAt: number; fields: string[] };
  catalogVisited?: number;
  catalogTotal?: number;
  catalogPasses?: number;
  catalogPassComplete?: boolean;
  catalogLastCompletedAt?: number;
  requestedBatch?: { requested: number; requestedAt: number; confirmedJids: string[] };
  events: { at: number; text: string }[];
}
type EvolutionResult = { ok: boolean; status: number; data: any };
export interface GroupAutomationDeps {
  database(): Promise<any>;
  evolution(endpoint: string, options?: { method?: string }): Promise<EvolutionResult>;
  joined(instance: string, userId: number, db: any): Promise<any[]>;
  catalog(offset: number): Promise<{ groups: any[]; hasMore: boolean; limit: number; totalCount?: number }>;
  priorityCatalog?(): Promise<any[]>;
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
    if (!state) return { available: true, catalogEngineVersion: 2, dispatchRequiresFullTarget: true, status: 'preparando', target: GROUP_AUTOMATION_TARGET, count: 0, times: GROUP_AUTOMATION_TIMES };
    const { attempts, candidates, observedJids, excludedJids, membershipSnapshot, ...visible } = state;
    const reasons: Record<string, number> = {};
    for (const a of Object.values(attempts)) reasons[a.status] = (reasons[a.status] || 0) + 1;
    return { available: true, catalogEngineVersion: 2, dispatchRequiresFullTarget: true, ...visible, target: GROUP_AUTOMATION_TARGET, count: Math.min(GROUP_AUTOMATION_TARGET, state.groups.length), excluded: excludedJids.length,
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
      state.enabled = enabled; state.nextRunAt = Math.max(state.nextRunAt, this.now()); state.updatedAt = this.now();
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
  async requestBatch(user: any, db: any, count: number) {
    if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error('Solicite entre 1 e 20 grupos por vez.');
    if ((await db.findGroupAutomationUser(GROUP_AUTOMATION_CAMPAIGN))?.id !== user.id) throw new Error('Automação indisponível para esta conta.');
    const release = await db.acquireGroupAutomationLock(user.id);
    if (!release) throw new Error('Uma verificação está em andamento. Tente novamente em instantes.');
    try {
      const state = await this.state(db, user.id);
      if (!state?.enabled) throw new Error('Ative a automação antes de solicitar novos grupos.');
      const record = await db.getUserInstance(user.id);
      if (record?.instance_name !== state.instance || digits(record.owner_phone) !== state.ownerPhone) throw new Error('O número da instância não corresponde ao número autorizado.');
      if (state.requestedBatch && state.requestedBatch.confirmedJids.length < state.requestedBatch.requested) {
        if (state.requestedBatch.requested === count) return; // Retried POST is idempotent.
        throw new Error('Já existe uma solicitação de grupos em andamento.');
      }
      state.requestedBatch = { requested: count, requestedAt: this.now(), confirmedJids: [] };
      this.note(state, `Solicitada busca de mais ${count} grupos independentes, sem comunidades. Entradas ainda não confirmadas.`);
      // Never clear the cooldown, binding or the last known connection state.
      await db.setAdminState(this.key(user.id), state);
    } finally { await release(); }
  }
  private async request(endpoint: string, options?: { method?: string }) {
    const r = await this.deps.evolution(endpoint, options);
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
          campaignId: campaign.id, target: GROUP_AUTOMATION_TARGET, minMembers: 100, times: [...GROUP_AUTOMATION_TIMES], timezone: 'America/Sao_Paulo',
          groups: [], observedJids: [], excludedJids: [], attempts: {}, candidates: [], offset: 0,
          catalogNextAt: 0, syncAt: 0, nextRunAt: 0, failures: 0, status: 'verificando', updatedAt: this.now(), events: [] };
        this.note(state, 'Automação preparada exclusivamente para esta conta e este número.');
      }
      state.nextRunAt = this.now() + 120_000;
      state.updatedAt = this.now();
      if (state.instance !== record.instance_name || digits(record.owner_phone) !== state.ownerPhone) {
        state.status = 'numero_divergente'; state.lastError = 'O número da instância não corresponde ao número autorizado.'; return;
      }
      if (state.catalogVersion !== 2) {
        // The previous scan trusted stale catalog counts/text and never checked
        // many valid invitations. Revisit the catalog, preserving verified attempts,
        // account binding, exclusions and the upstream cooldown.
        state.catalogVersion = 2; state.offset = 0; state.candidates = [];
        state.catalogNextAt = 0; state.catalogVisited = 0; state.catalogPassComplete = false;
        this.note(state, 'Busca ampliada: os critérios serão conferidos no convite atualizado, sem descartar pelos dados antigos do catálogo.');
      }
      state.target = GROUP_AUTOMATION_TARGET;
      state.groups = state.groups.slice(0, state.target);
      const sub = await db.getSubscriptionForUser(user.id);
      if (!['admin', 'manager'].includes(user.role) && normalize(sub?.status) !== 'active') {
        state.status = 'plano_inativo'; return;
      }
      if (!campaign.managedGroupAutomation) await this.updateCampaign(db, user.id, state, campaign);
      state.lastOperation = 'verificando conexão';
      const connected = await this.request(`/instance/connectionState/${encodeURIComponent(state.instance)}`);
      if (!connected.ok) throw Object.assign(new Error('Consulta da integração indisponível.'), {
        safeMessage: `Não foi possível consultar a conexão na integração (HTTP ${Number(connected.status)}). Isso não confirma que o WhatsApp foi desconectado.`,
      });
      const connection = normalize(connected.data?.instance?.state || connected.data?.state ||
        connected.data?.instance?.connectionStatus || connected.data?.connectionStatus ||
        connected.data?.instance?.status || connected.data?.status).trim();
      if (['close', 'closed', 'disconnected', 'connecting', 'connection', 'waiting_qr'].includes(connection)) {
        state.status = 'desconectada'; state.lastError = 'Aguardando reconexão do WhatsApp.'; return;
      }
      if (!['open', 'connected'].includes(connection)) throw Object.assign(new Error('Estado da conexão não confirmado.'), {
        safeMessage: 'A integração não retornou um estado de conexão reconhecido. Nenhuma nova entrada foi realizada.',
      });
      // A complete inventory is expensive. Reuse its last successful snapshot for
      // 30 minutes; individual entries and every delivery still require live metadata.
      // Failed snapshots never replace it or establish a removal.
      state.lastOperation = 'consultando participações';
      const freshInventory = !state.membershipSnapshot || state.membershipSnapshotVersion !== 2 || this.now() - state.syncAt >= 30 * 60_000;
      const live = freshInventory ? await this.deps.joined(state.instance, user.id, db) : state.membershipSnapshot!;
      const observed = new Set<string>(live.map(g => String(g.jid || g.id)));
      for (const jid of state.observedJids) if (!observed.has(jid) && !state.excludedJids.includes(jid)) {
        state.excludedJids.push(jid); this.note(state, `Grupo indisponível: ${jid}. Será procurado outro grupo.`);
      }
      state.observedJids = [...observed];
      state.groups = live.filter(g => !state!.excludedJids.includes(g.jid || g.id) && !groupEligibility(g, true, state!.ownerPhone))
        .slice(0, state.target).map(g => ({ jid: g.jid || g.id, name: g.name || g.subject,
          membersCount: Number(g.membersCount ?? g.size), checkedAt: freshInventory ? this.now() : state!.syncAt }));
      if (freshInventory) { state.syncAt = this.now(); state.membershipSnapshot = live; state.membershipSnapshotVersion = 2; }
      for (const a of Object.values(state.attempts)) {
        const existing = live.find(g => String(g.jid || g.id) === a.jid);
        if (existing) a.status = groupEligibility(existing, true, state.ownerPhone) ? 'Participação existente, mas grupo não elegível' : 'participando';
        else if (freshInventory && a.status === 'confirmando' && this.now() - a.at > 10 * 60_000) {
          a.status = 'Entrada não localizada na lista atual de participações';
          a.retryAt = this.now() + 24 * 60 * 60_000;
        }
      }
      await this.updateCampaign(db, user.id, state, campaign);
      state.status = state.groups.length >= state.target ? 'meta_atingida' : 'completando_grupos';
      state.lastError = undefined;
      if (state.groups.length >= state.target) { state.failures = 0; return; }
      const pending = Object.values(state.attempts).filter(a => a.status === 'confirmando' && !observed.has(a.jid) && !state!.excludedJids.includes(a.jid)).length;
      if (state.groups.length + pending >= state.target) { state.status = 'aguardando_confirmacoes'; return; }

      // Prioritize recent classifieds without excluding the rest of the catalog.
      // This changes discovery order only; live membership/admission rules stay strict.
      if (this.deps.priorityCatalog && (!state.prioritySeededAt || this.now() - state.prioritySeededAt >= 6 * 60 * 60_000)) {
        state.lastOperation = 'buscando classificados recentes';
        try {
          const priority = await this.deps.priorityCatalog();
          const queued = new Set(state.candidates.map(g => inviteCode(g.whatsappLink)));
          const additions = priority.filter(g => {
            const code = inviteCode(g.whatsappLink);
            if (!code || queued.has(code)) return false;
            const attempt = state!.attempts[code];
            if (attempt && (!attempt.retryAt || attempt.retryAt > this.now())) return false;
            queued.add(code); return true;
          }).sort((a, b) => Number(permitsAdvertising(b)) - Number(permitsAdvertising(a)))
            .map(g => ({ name: g.name, description: g.description, whatsappLink: g.whatsappLink }));
          state.candidates = [...additions, ...state.candidates];
          state.prioritySeededAt = this.now();
          this.note(state, `Classificados recentes: ${additions.length} candidatos novos priorizados para validação.`);
        } catch {
          // A priority listing failure must not block the ordinary paginated scan.
          state.prioritySeededAt = this.now() - 5 * 60 * 60_000;
        }
      }
      // Scan several rejected/known candidates per pass, while accepting at most one new invitation.
      let pagesRead = 0;
      for (let checked = 0; checked < 5; checked++) {
      if (!state.candidates.length && this.now() >= state.catalogNextAt) {
        if (pagesRead >= 2) break;
        state.lastOperation = 'consultando catálogo WAZZO';
        const page = await this.deps.catalog(state.offset);
        pagesRead++;
        if (state.offset === 0) { state.catalogVisited = 0; state.catalogPassComplete = false; }
        state.catalogVisited = state.offset + page.groups.length;
        if (Number.isFinite(page.totalCount)) state.catalogTotal = page.totalCount;
        // Discovery is read-only: stored text/counts can be stale or absent.
        // The unchanged live eligibility checks below authorize every actual join.
        state.candidates = page.groups.filter(g => {
          const code = inviteCode(g.whatsappLink);
          if (!code) return false;
          const attempt = state!.attempts[code];
          return !attempt || Boolean(attempt.retryAt && attempt.retryAt <= this.now());
        }).map(g => ({ name: g.name, description: g.description, whatsappLink: g.whatsappLink }));
        if (!page.hasMore) {
          state.catalogPassComplete = true; state.catalogLastCompletedAt = this.now();
          state.catalogPasses = (state.catalogPasses || 0) + 1;
        }
        state.offset = page.hasMore ? state.offset + page.limit : 0;
        state.catalogNextAt = page.hasMore ? this.now() : this.now() + 30 * 60_000;
      }
      const candidate = state.candidates.shift();
      if (!candidate) { state.status = state.catalogPassComplete ? 'catalogo_percorrido' : 'buscando_candidatos'; state.failures = 0; continue; }
      const code = inviteCode(candidate.whatsappLink)!;
      const attempt = state.attempts[code];
      if (attempt && (!attempt.retryAt || attempt.retryAt > this.now())) continue;
      state.lastOperation = 'validando convite';
      const infoResponse = await this.request(`/group/inviteInfo/${encodeURIComponent(state.instance)}?inviteCode=${encodeURIComponent(code)}`);
      if (!infoResponse.ok) {
        if (infoResponse.status !== 404 && infoResponse.status !== 400) throw new Error('Não foi possível validar o convite agora.');
        state.attempts[code] = { jid: '', status: 'convite_invalido', at: this.now(), retryAt: this.now() + 24 * 60 * 60_000 }; continue;
      }
      const info = infoResponse.data?.data || infoResponse.data;
      const jid = String(info?.id || info?.jid || info?.groupJid || '');
      const reason = groupEligibility(info);
      const source = ['size', 'membersCount', 'memberCount'].find(k => info?.[k] !== undefined && info?.[k] !== null);
      const members = Number(source ? info[source] : info?.participants?.length);
      state.lastCandidate = {
        name: String(info?.subject || info?.name || candidate.name || 'Grupo'),
        members: Number.isFinite(members) ? members : undefined,
        memberSource: source || (Array.isArray(info?.participants) ? 'participants' : 'unknown'),
        reason: reason || (truth(info?.joinApprovalMode) ? 'Exige aprovação' : observed.has(jid) ? 'Já participa' : state.excludedJids.includes(jid) ? 'Excluído anteriormente' : 'Elegível; solicitando entrada'),
        checkedAt: this.now(), fields: Object.keys(info || {}).slice(0, 25),
      };
      if (reason || truth(info?.joinApprovalMode) || observed.has(jid) || state.excludedJids.includes(jid)) {
        state.attempts[code] = { jid, status: reason || 'Já participa, removido anteriormente ou exige aprovação', at: this.now(), retryAt: this.now() + 24 * 60 * 60_000 }; continue;
      }
      // Durable intent BEFORE the network mutation: a timeout/process death cannot cause a second join.
      state.attempts[code] = { jid, status: 'confirmando', at: this.now() };
      await db.setAdminState(this.key(user.id), state);
      state.lastOperation = 'solicitando entrada';
      const accepted = await this.request(`/group/acceptInviteCode/${encodeURIComponent(state.instance)}?inviteCode=${encodeURIComponent(code)}`);
      if (!accepted.ok || accepted.data?.accepted !== true || accepted.data?.groupJid !== jid) {
        this.note(state, `Entrada aguardando confirmação: ${info.subject || info.name || jid}.`); return;
      }
      // Count only membership verified by real metadata, never just accepted:true.
      state.lastOperation = 'confirmando permissão de envio';
      const verification = await this.request(`/group/findGroupInfos/${encodeURIComponent(state.instance)}?groupJid=${encodeURIComponent(jid)}`);
      const metadata = verification.data?.data || verification.data;
      const postJoinReason = verification.ok ? groupEligibility(metadata, true, state.ownerPhone) : `Consulta indisponível (HTTP ${verification.status})`;
      if (verification.ok && !postJoinReason) {
        state.attempts[code].status = 'participando';
        if (!state.groups.some(g => g.jid === jid)) state.groups.push({ jid, name: metadata.subject || metadata.name,
          membersCount: Number(metadata.size ?? metadata.participants?.length), checkedAt: this.now() });
        if (!state.observedJids.includes(jid)) state.observedJids.push(jid);
        if (!state.membershipSnapshot!.some(g => (g.jid || g.id) === jid)) state.membershipSnapshot!.push({
          id: jid, jid, name: metadata.subject || metadata.name, description: metadata.desc || metadata.description,
          announce: metadata.announce, membersCount: Number(metadata.size ?? metadata.participants?.length),
          isCommunity: metadata.isCommunity, community: metadata.community, isCommunityAnnounce: metadata.isCommunityAnnounce,
          isCommunityAnnouncement: metadata.isCommunityAnnouncement, linkedParent: metadata.linkedParent,
          communityJid: metadata.communityJid, parentCommunityJid: metadata.parentCommunityJid,
          membershipConfirmed: true,
        });
        const batch = state.requestedBatch;
        if (batch && batch.confirmedJids.length < batch.requested && !batch.confirmedJids.includes(jid)) {
          batch.confirmedJids.push(jid);
          this.note(state, `Solicitação de novos grupos: ${batch.confirmedJids.length}/${batch.requested} entradas confirmadas.`);
        }
        this.note(state, `Entrada confirmada: ${metadata.subject || jid} (${state.groups.length}/${state.target}).`);
        await this.updateCampaign(db, user.id, state, campaign);
      } else {
        this.note(state, `Entrada não validada: ${info.subject || jid}. ${postJoinReason}.`);
        // Only undo a NEW, confirmed membership that fails the post-join checks.
        // Pre-existing memberships are present in observed and never reach this branch.
        if (verification.ok && isConfirmedGroupMember(metadata, state.ownerPhone)) {
          const left = await this.request(`/group/leaveGroup/${encodeURIComponent(state.instance)}?groupJid=${encodeURIComponent(jid)}`, { method: 'DELETE' });
          if (left.ok) {
            state.attempts[code].status = 'Descartado após confirmar que o grupo não permite divulgação';
            state.excludedJids.push(jid);
            this.note(state, `Saída do grupo recém-adicionado: ${info.subject || jid}. ${postJoinReason}.`);
          }
        }
      }
      break;
      }
      if (!state.candidates.length && state.catalogPassComplete && state.catalogNextAt > this.now() && state.groups.length < state.target) {
        state.status = 'catalogo_percorrido';
        state.lastOperation = 'aguardando novos candidatos elegíveis no catálogo';
      }
      state.failures = 0;
    } catch (e: any) {
      if (state) {
        state.failures = Math.min(state.failures + 1, 7);
        state.nextRunAt = this.now() + Math.min(60 * 60_000, 60_000 * 2 ** state.failures);
        state.status = 'aguardando_nova_tentativa';
        // Never persist upstream response bodies, invite codes, keys, or credentials in logs/UI.
        const limited = e?.rateLimited || /limitou|rate.overlimit|rate limit/.test(normalize(e?.message));
        if (limited) state.nextRunAt = Math.max(state.nextRunAt, Number(e?.retryAt) || this.now() + 30 * 60_000);
        state.lastError = limited ? `WhatsApp limitou a operação: ${state.lastOperation || 'verificar grupos'}. Aguardando o intervalo de consulta.` : e?.safeMessage || `Falha ao ${state.lastOperation || 'verificar grupos'}. Os envios exigem nova confirmação ao vivo.`;
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
    if (!state.initialTargetReachedAt && state.groups.length >= state.target) {
      state.initialTargetReachedAt = this.now();
      // Readiness releases only FUTURE slots; never send missed rounds at night.
      this.skipElapsedSlots(campaign, state);
      this.note(state, `Meta inicial de ${state.target} grupos atingida; primeiro envio no próximo horário programado.`);
    }
    Object.assign(campaign, { groupAutomationReady: Boolean(state.initialTargetReachedAt) && state.groups.length >= state.target, groupAutomationTarget: state.target,
      selectedGroupJids: state.groups.map(g => g.jid), groupsCount: state.groups.length,
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
  async readyForDispatch(userId: number, instance: string, db: any): Promise<boolean> {
    const state = await this.state(db, userId);
    if (!state?.enabled || !state.initialTargetReachedAt || state.groups.length < GROUP_AUTOMATION_TARGET || state.instance !== instance) return false;
    const record = await db.getUserInstance(userId);
    return record?.instance_name === instance && digits(record.owner_phone) === state.ownerPhone;
  }
  async reconcileForDispatch(userId: number, instance: string, memberships: any[], db: any): Promise<string[]> {
    const release = await db.acquireGroupAutomationLock(userId);
    if (!release) throw new Error('Verificação dos grupos em andamento; envio aguarda nova tentativa.');
    try {
      const state = await this.state(db, userId);
      const record = await db.getUserInstance(userId);
      if (!state?.enabled || !state.initialTargetReachedAt || state.instance !== instance ||
          record?.instance_name !== instance || digits(record.owner_phone) !== state.ownerPhone) {
        throw new Error('Aguardando completar a meta inicial de grupos na instância autorizada.');
      }
      const observed = new Set<string>(memberships.map(g => String(g.jid || g.id)));
      const eligible = memberships.filter(g => !state.excludedJids.includes(g.jid || g.id) && !groupEligibility(g, true, state.ownerPhone));
      const allowed = new Set<string>(eligible.map(g => String(g.jid || g.id)));
      for (const previous of state.groups) {
        if (!allowed.has(previous.jid) && !state.excludedJids.includes(previous.jid)) {
          state.excludedJids.push(previous.jid);
          this.note(state, 'Conferência do disparo: grupo indisponível retirado; vaga liberada para reposição.');
        }
      }
      state.target = GROUP_AUTOMATION_TARGET;
      state.groups = eligible.slice(0, state.target).map(g => ({ jid: g.jid || g.id, name: g.name || g.subject,
        membersCount: Number(g.membersCount ?? g.size), checkedAt: this.now() }));
      state.observedJids = [...observed];
      state.membershipSnapshot = memberships;
      state.membershipSnapshotVersion = 2;
      state.syncAt = this.now(); state.updatedAt = this.now();
      state.status = state.groups.length >= state.target ? 'meta_atingida' : 'completando_grupos';
      this.note(state, `Conferência do disparo concluída: ${state.groups.length}/${state.target} grupos elegíveis.`);
      await db.setAdminState(this.key(userId), state);
      if (state.groups.length < state.target) {
        throw Object.assign(new Error(`Envio aguardando reposição: ${state.groups.length}/${state.target} grupos elegíveis.`), { awaitingGroupRefill: true });
      }
      return state.groups.map(g => g.jid);
    } finally { await release(); }
  }
  async canSend(userId: number, instance: string, jid: string, db: any): Promise<boolean> {
    const state = await this.state(db, userId);
    if (!state?.enabled || state.instance !== instance || !state.groups.some(g => g.jid === jid) || state.excludedJids.includes(jid)) return false;
    const record = await db.getUserInstance(userId);
    if (record?.instance_name !== instance || digits(record.owner_phone) !== state.ownerPhone) return false;
    const result = await this.request(`/group/findGroupInfos/${encodeURIComponent(instance)}?groupJid=${encodeURIComponent(jid)}`);
    if (!result.ok) return false;
    const metadata = result.data?.data || result.data;
    if (String(metadata?.id || metadata?.jid || '') !== jid) return false;
    const reason = groupEligibility(metadata, true, state.ownerPhone);
    if (!reason) return true;
    // A successful but incomplete payload is not evidence of removal/closure.
    const size = Number(metadata.size ?? metadata.membersCount ?? metadata.participants?.length);
    const confirmedIneligible = isCommunityRelated(metadata) || truth(metadata.announce) ||
      truth(metadata.restrictSend) || explicitFalse(metadata.canSend) || explicitFalse(metadata.sendMessages) ||
      (Number.isFinite(size) && size < state.minMembers) ||
      (Array.isArray(metadata.participants) && !isConfirmedGroupMember(metadata, state.ownerPhone)) ||
      (Boolean(metadata.subject || metadata.name || metadata.desc || metadata.description) && !permitsAdvertising(metadata));
    if (!confirmedIneligible) return false;
    const release = await db.acquireGroupAutomationLock(userId);
    if (!release) return false;
    try {
      // Another worker may have updated/paused the binding during the API read.
      const current = await this.state(db, userId);
      const binding = await db.getUserInstance(userId);
      if (!current?.enabled || current.instance !== instance || binding?.instance_name !== instance ||
          digits(binding.owner_phone) !== current.ownerPhone || !current.groups.some(g => g.jid === jid)) return false;
      current.groups = current.groups.filter(g => g.jid !== jid);
      current.membershipSnapshot = current.membershipSnapshot?.filter(g => (g.jid || g.id) !== jid);
      if (!current.excludedJids.includes(jid)) current.excludedJids.push(jid);
      current.updatedAt = this.now();
      current.status = 'completando_grupos';
      // Keep any upstream cooldown: the normal worker will refill the freed slot.
      this.note(current, `Grupo retirado dos destinos; será buscado outro. ${reason}.`);
      await db.setAdminState(this.key(userId), current);
      const campaign = (await db.listCampaignsForUser(userId)).find((c: any) => c.id === current.campaignId);
      if (campaign) await this.updateCampaign(db, userId, current, campaign);
    } finally { await release(); }
    return false;
  }
}
