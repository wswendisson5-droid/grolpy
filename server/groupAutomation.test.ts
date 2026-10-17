import test from 'node:test';
import assert from 'node:assert/strict';
import { GroupAutomationEngine, GROUP_AUTOMATION_CAMPAIGN, groupEligibility, inviteCode, permitsAdvertising, groupList } from './groupAutomation';
const GROUP_AUTOMATION_PHONE = '5527000006930';
const GROUP_AUTOMATION_EMAIL = 'owner@example.test';
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const group = (n: number, extra = {}) => ({ id: `${n}@g.us`, subject: `Divulgação ${n}`, desc: 'Divulgue seus produtos e serviços.', size: 150, announce: false, participants: [{ id: `${GROUP_AUTOMATION_PHONE}@s.whatsapp.net` }], ...extra });
const code = (n: number) => 'A'.repeat(20) + String(n).padStart(2, '0');
function harness() {
  let now = Date.parse('2026-10-16T19:45:00Z');
  const states = new Map<string, any>();
  const h: any = { live: [group(1)], catalog: [], calls: [], syncError: false, rateLimited: false, joinError: false, locked: false,
    record: { instance_name: 'tenant-7', owner_phone: GROUP_AUTOMATION_PHONE },
    user: { id: 7, email: GROUP_AUTOMATION_EMAIL, role: 'client' },
    campaign: { id: GROUP_AUTOMATION_CAMPAIGN, title: 'Oferta', previewText: 'Anúncio existente', imageUrl: '/uploads/existing.jpg', active: true, status: 'ativa', scheduleTimes: ['06:00'], selectedGroupJids: ['1@g.us'], completedSlots: [], totalSent: 18 },
    sub: { status: 'active' }, busy: false,
  };
  h.db = {
    findGroupAutomationUser: async () => clone(h.user),
    getUserInstance: async () => clone(h.record), getSubscriptionForUser: async () => h.sub,
    acquireGroupAutomationLock: async () => h.locked ? null : async () => {},
    getAdminState: async (key: string) => states.has(key) ? clone(states.get(key)) : null,
    setAdminState: async (key: string, state: any) => { states.set(key, clone(state)); },
    listCampaignsForUser: async () => [clone(h.campaign)],
    saveCampaignForUser: async (_id: number, camp: any) => { h.campaign = clone(camp); },
  };
  h.deps = {
    database: async () => h.db, now: () => now, busy: () => h.busy,
    joined: async () => { if (h.syncError) throw new Error('rate-overlimit'); return clone(h.live); },
    catalog: async () => ({ groups: clone(h.catalog), hasMore: false, limit: 25 }),
    evolution: async (endpoint: string, options?: { method?: string }) => {
      h.calls.push(endpoint);
      if (h.rateLimited) return { ok: false, status: 429, data: {} };
      if (endpoint.startsWith('/instance/')) return { ok: true, status: 200, data: { instance: { state: 'open' } } };
      const url = new URL(`https://example.test${endpoint}`);
      const info = h.catalog.find((g: any) => g.whatsappLink.endsWith(url.searchParams.get('inviteCode')))?.metadata;
      if (endpoint.includes('/inviteInfo/')) return info ? { ok: true, status: 200, data: clone(info) } : { ok: false, status: 404, data: {} };
      if (endpoint.includes('/acceptInviteCode/')) {
        if (h.joinError) return { ok: false, status: 408, data: {} };
        h.live.push(clone(info));
        return { ok: true, status: 200, data: { accepted: true, groupJid: info.id } };
      }
      if (endpoint.includes('/leaveGroup/')) {
        assert.equal(options?.method, 'DELETE');
        h.live = h.live.filter((g: any) => g.id !== url.searchParams.get('groupJid'));
        return { ok: true, status: 200, data: { success: true } };
      }
      if (endpoint.includes('/findGroupInfos/')) {
        const g = h.live.find((g: any) => g.id === url.searchParams.get('groupJid'));
        return { ok: !!g, status: g ? 200 : 404, data: g ? { ...clone(g), ...(h.postJoinClosed ? { announce: true } : {}) } : {} };
      }
      throw new Error('Unexpected call');
    },
  };
  h.engine = new GroupAutomationEngine(h.deps);
  h.advance = () => { now += 2 * 60 * 60_000; };
  h.state = () => clone(states.get('group-automation:7'));
  h.seed = (v: any) => { states.set('group-automation:7', clone(v)); };
  h.candidate = (n: number, extra = {}) => ({ name: `Divulgação ${n}`, memberCount: 150, description: 'Anúncios permitidos', whatsappLink: `https://chat.whatsapp.com/${code(n)}`, metadata: group(n, extra) });
  return h;
}

test('strict link parser rejects wrong origins, partial codes, credentials and arbitrary paths', () => {
  assert.equal(inviteCode(`https://chat.whatsapp.com/${code(2)}`), code(2));
  for (const s of ['http://chat.whatsapp.com/' + code(2), 'https://chat.whatsapp.com.evil/' + code(2), `https://secret@chat.whatsapp.com/${code(2)}`, `https://chat.whatsapp.com/x/${code(2)}`, 'https://chat.whatsapp.com/short']) assert.equal(inviteCode(s), undefined);
});
test('eligibility enforces open conversation, at least 100 members, advertising and membership', () => {
  assert.equal(groupEligibility(group(1, { size: 100 }), true, GROUP_AUTOMATION_PHONE), null);
  for (const extra of [{ size: 99 }, { size: 0 }, { announce: true }, { announce: undefined }, { participants: [] }, { isCommunity: true }, { desc: 'Proibido vendas' }, { desc: 'É proibida a divulgação' }, { desc: 'Apenas uma mensagem por dia' }, { desc: 'Não é permitido anúncios' }, { desc: 'Vendas proibidas' }]) assert.ok(groupEligibility(group(1, extra), true, GROUP_AUTOMATION_PHONE));
  assert.equal(permitsAdvertising({ name: 'Moradores do bairro' }), false);
  assert.equal(permitsAdvertising({ name: 'Bairro', desc: 'Anuncie seus serviços' }), true);
});
test('invalid successful upstream bodies never become empty membership snapshots', () => {
  assert.throws(() => groupList({ error: 'Unavailable' }));
  assert.deepEqual(groupList({ groups: [] }), []);
});
test('initialization restricts account, preserves content, filters existing groups and sets only future slots', async () => {
  const h = harness(); h.live = [group(1), group(2, { size: 99 }), group(3, { announce: true })];
  await h.engine.tick();
  assert.equal(h.state().groups.length, 1);
  assert.deepEqual(h.campaign.selectedGroupJids, ['1@g.us']);
  assert.deepEqual(h.campaign.scheduleTimes, ['07:00', '15:00', '21:00']);
  assert.equal(h.campaign.previewText, 'Anúncio existente'); assert.equal(h.campaign.imageUrl, '/uploads/existing.jpg');
  assert.ok(h.campaign.completedSlots.includes('2026-10-16_07:00')); assert.ok(h.campaign.completedSlots.includes('2026-10-16_15:00'));
  assert.ok(!h.campaign.completedSlots.includes('2026-10-16_21:00'));
  assert.equal((await h.engine.status({ id: 8, email: 'other@example.test' }, h.db)).available, false);
  await assert.rejects(h.engine.setEnabled({ id: 8, email: 'other@example.test' }, h.db, true));
});
test('real invitation accepted and membership rechecked before counting or selecting', async () => {
  const h = harness(); h.catalog = [h.candidate(2)]; await h.engine.tick();
  assert.equal(h.state().groups.length, 2);
  assert.deepEqual(h.campaign.selectedGroupJids, ['1@g.us', '2@g.us']);
  assert.equal(h.state().attempts[code(2)].status, 'participando');
  assert.equal(h.calls.filter((s: string) => s.includes('acceptInviteCode')).length, 1);
});
test('confirmed removal replaces with another group and does not rejoin same JID via a new link', async () => {
  const h = harness(); await h.engine.tick();
  h.advance(); h.live = []; h.catalog = [h.candidate(2)]; await h.engine.tick();
  assert.deepEqual(h.state().groups.map((g: any) => g.jid), ['2@g.us']); assert.ok(h.state().excludedJids.includes('1@g.us'));
  h.advance(); h.catalog = [{ ...h.candidate(1), whatsappLink: `https://chat.whatsapp.com/${code(44)}` }]; await h.engine.tick();
  assert.equal(h.calls.filter((s: string) => s.includes('acceptInviteCode')).length, 1);
});
test('unavailable snapshot preserves membership and makes no join attempt', async () => {
  const h = harness(); await h.engine.tick(); const before = h.state();
  h.advance(); h.syncError = true; h.catalog = [h.candidate(2)]; await h.engine.tick();
  assert.deepEqual(h.state().groups, before.groups); assert.deepEqual(h.state().excludedJids, []);
  assert.equal(h.calls.filter((s: string) => s.includes('acceptInviteCode')).length, 0);
  assert.equal(h.state().status, 'aguardando_nova_tentativa');
});
test('backoff persists across engine restarts and prevents repeated rate-limited calls', async () => {
  const h = harness(); h.rateLimited = true; await h.engine.tick(); const count = h.calls.length;
  h.engine = new GroupAutomationEngine(h.deps);
  await h.engine.tick(); assert.equal(h.calls.length, count); assert.ok(h.state().nextRunAt > h.state().updatedAt);
});
test('unknown join outcome is durable and not counted or retried', async () => {
  const h = harness(); h.catalog = [h.candidate(2)]; h.joinError = true; await h.engine.tick();
  assert.equal(h.state().groups.length, 1); assert.equal(h.state().attempts[code(2)].status, 'confirmando');
  h.advance(); await h.engine.tick();
  assert.equal(h.calls.filter((s: string) => s.includes('acceptInviteCode')).length, 1);
});
test('closed, undersized, prohibited, invalid and approval-required invitations are not joined', async () => {
  for (const extra of [{ announce: true }, { size: 99 }, { desc: 'Proibido vendas' }, { joinApprovalMode: true }, { announce: undefined }]) {
    const h = harness(); h.catalog = [h.candidate(2, extra)]; await h.engine.tick();
    assert.equal(h.calls.filter((s: string) => s.includes('acceptInviteCode')).length, 0);
  }
});
test('100 eligible memberships stop joins, and target list never exceeds 100', async () => {
  const h = harness(); h.live = Array.from({ length: 105 }, (_, i) => group(i + 1)); h.catalog = [h.candidate(200)]; await h.engine.tick();
  assert.equal(h.state().groups.length, 100); assert.equal(h.campaign.selectedGroupJids.length, 100); assert.equal(h.state().status, 'meta_atingida');
  assert.equal(h.calls.filter((s: string) => s.includes('acceptInviteCode')).length, 0);
});
test('worker lock, different phone, inactive plan and running campaign prevent mutations', async () => {
  for (const mode of ['locked', 'phone', 'plan', 'busy']) {
    const h = harness(); h.catalog = [h.candidate(2)];
    if (mode === 'locked') h.locked = true;
    if (mode === 'phone') h.record.owner_phone = '5511999999999';
    if (mode === 'plan') h.sub.status = 'inactive';
    if (mode === 'busy') h.busy = true;
    await h.engine.tick(); assert.equal(h.calls.length, 0);
    assert.equal(h.campaign.managedGroupAutomation, undefined);
  }
});
test('pause disables campaign and maintenance; resume requests a new verification', async () => {
  const h = harness(); await h.engine.tick(); await h.engine.setEnabled(h.user, h.db, false);
  const count = h.calls.length; h.advance(); await h.engine.tick(); assert.equal(h.calls.length, count);
  assert.equal(h.campaign.active, false); assert.equal(h.state().enabled, false);
  await h.engine.setEnabled(h.user, h.db, true); assert.equal(h.state().nextRunAt, h.deps.now());
});
test('delivery check refuses closed groups, removals, number changes and paused state', async () => {
  const h = harness(); await h.engine.tick();
  assert.equal(await h.engine.canSend(7, 'tenant-7', '1@g.us', h.db), true);
  h.live[0].announce = true; assert.equal(await h.engine.canSend(7, 'tenant-7', '1@g.us', h.db), false);
  h.live = []; assert.equal(await h.engine.canSend(7, 'tenant-7', '1@g.us', h.db), false);
  assert.equal(await h.engine.canSend(7, 'other-tenant', '1@g.us', h.db), false);
  h.record.owner_phone = '5511000000000'; assert.equal(await h.engine.canSend(7, 'tenant-7', '1@g.us', h.db), false);
});

test('closed membership already owned is never accepted again or left', async () => {
  const h = harness(); h.live = [group(1), group(2, { announce: true })];
  h.catalog = [h.candidate(2)]; await h.engine.tick();
  assert.equal(h.state().groups.length, 1);
  assert.ok(h.state().observedJids.includes('2@g.us'));
  assert.equal(h.calls.filter((s: string) => s.includes('acceptInviteCode') || s.includes('leaveGroup')).length, 0);
});
test('new membership whose live metadata forbids speaking is left and never selected', async () => {
  const h = harness(); h.catalog = [h.candidate(2)]; h.postJoinClosed = true;
  await h.engine.tick();
  assert.deepEqual(h.campaign.selectedGroupJids, ['1@g.us']);
  assert.equal(h.live.some((g: any) => g.id === '2@g.us'), false);
  assert.ok(h.state().excludedJids.includes('2@g.us'));
  assert.equal(h.calls.filter((s: string) => s.includes('leaveGroup')).length, 1);
});
test('several unsuitable candidates can be skipped within one pass without multiple joins', async () => {
  const h = harness(); h.catalog = [2, 3, 4, 5].map(n => h.candidate(n, { announce: true })); h.catalog.push(h.candidate(6));
  await h.engine.tick();
  assert.equal(h.calls.filter((s: string) => s.includes('inviteInfo')).length, 5);
  assert.equal(h.calls.filter((s: string) => s.includes('acceptInviteCode')).length, 1);
  assert.deepEqual(h.campaign.selectedGroupJids, ['1@g.us', '6@g.us']);
});
test('legacy pending closed membership is classified without claiming an eligible entry or leaving an old group', async () => {
  const h = harness(); await h.engine.tick(); const state = h.state();
  state.attempts[code(2)] = { jid: '2@g.us', status: 'confirmando', at: 1 };
  h.seed(state); h.live.push(group(2, { announce: true })); h.advance(); await h.engine.tick();
  assert.equal(h.state().groups.length, 1);
  assert.equal(h.state().attempts[code(2)].status, 'Participação existente, mas grupo não elegível');
  assert.equal(h.calls.filter((s: string) => s.includes('leaveGroup')).length, 0);
});

test('successful inventory survives restarts without repeating the bulk query on every pass', async () => {
  const h = harness(); let inventories = 0;
  const original = h.deps.joined;
  h.deps.joined = async (...args: any[]) => { inventories++; return original(...args); };
  await h.engine.tick();
  const state = h.state(); state.nextRunAt = 0; h.seed(state);
  h.engine = new GroupAutomationEngine(h.deps);
  h.catalog = [h.candidate(2)];
  // Make a new catalog page available without changing the inventory age.
  state.catalogNextAt = 0; h.seed(state);
  await h.engine.tick();
  assert.equal(inventories, 1);
  assert.equal(h.state().groups.length, 2);
  assert.equal((await h.engine.status(h.user, h.db)).membershipSnapshot, undefined);
  h.advance(); await h.engine.tick(); assert.equal(inventories, 2);
});

test('pending entries are never declared absent using a cached inventory', async () => {
  const h = harness(); await h.engine.tick(); const state = h.state();
  state.attempts[code(2)] = { jid: '2@g.us', status: 'confirmando', at: 1 };
  state.nextRunAt = 0; h.seed(state); await h.engine.tick();
  assert.equal(h.state().attempts[code(2)].status, 'confirmando');
});

test('upstream cooldown and failed operation are preserved without an early retry', async () => {
  const h = harness();
  const retryAt = h.deps.now() + 45 * 60_000;
  h.deps.joined = async () => { throw Object.assign(new Error('limited'), { rateLimited: true, retryAt }); };
  await h.engine.tick();
  assert.equal(h.state().nextRunAt, retryAt);
  assert.match(h.state().lastError, /consultando participações/);
  assert.equal(h.state().syncAt, 0);
  assert.equal(h.state().membershipSnapshot, undefined);
});


test('pause and resume cannot clear a rate-limit cooldown', async () => {
  const h = harness(); h.rateLimited = true; await h.engine.tick();
  const due = h.state().nextRunAt;
  await h.engine.setEnabled(h.user, h.db, false);
  await h.engine.setEnabled(h.user, h.db, true);
  assert.equal(h.state().nextRunAt, due);
  const count = h.calls.length;
  await h.engine.tick(); assert.equal(h.calls.length, count);
});

test('community aliases and child groups are rejected before invitation acceptance', async () => {
  for (const extra of [{ community: true }, { community: '1' }, { community: '999@g.us' }, { isCommunityAnnouncement: true }, { linkedParent: '999@g.us', isCommunity: false }, { communityJid: '999@g.us' }, { parentCommunityJid: '999@g.us' }]) {
    assert.ok(groupEligibility(group(2, extra)));
    const h = harness(); h.catalog = [h.candidate(2, extra)]; await h.engine.tick();
    assert.equal(h.calls.filter((s: string) => s.includes('acceptInviteCode')).length, 0);
    assert.equal(h.campaign.selectedGroupJids.includes('2@g.us'), false);
  }
});

test('twenty-group request is scoped, durable, idempotent and preserves cooldown', async () => {
  const h = harness(); await h.engine.tick(); const state = h.state();
  state.nextRunAt = h.deps.now() + 60 * 60_000; h.seed(state);
  await assert.rejects(h.engine.requestBatch({id:8}, h.db, 20));
  for (const n of [0, 21, '20']) await assert.rejects(h.engine.requestBatch(h.user, h.db, n));
  await h.engine.requestBatch(h.user, h.db, 20);
  assert.equal(h.state().nextRunAt, state.nextRunAt);
  assert.equal(h.state().requestedBatch.requested, 20);
  assert.deepEqual(h.state().requestedBatch.confirmedJids, []);
  const events = h.state().events.length;
  await h.engine.requestBatch(h.user, h.db, 20); assert.equal(h.state().events.length, events);
  await assert.rejects(h.engine.requestBatch(h.user, h.db, 10));
});

test('batch progress counts new live-verified independent groups only', async () => {
  const h = harness(); await h.engine.tick();
  await h.engine.requestBatch(h.user, h.db, 20);
  h.advance(); h.catalog = [h.candidate(2)]; await h.engine.tick();
  assert.deepEqual(h.state().requestedBatch.confirmedJids, ['2@g.us']);
  h.advance(); h.catalog = [h.candidate(3)]; h.postJoinClosed = true; await h.engine.tick();
  assert.deepEqual(h.state().requestedBatch.confirmedJids, ['2@g.us']);
});

test('old snapshots are refreshed to recover community linkage fields', async () => {
  const h = harness(); await h.engine.tick(); const state = h.state();
  delete state.membershipSnapshotVersion; state.nextRunAt = 0; h.seed(state);
  h.live = [group(1, { linkedParent: '999@g.us' })];
  await h.engine.tick(); assert.equal(h.state().groups.length, 0);
  assert.equal(h.state().membershipSnapshotVersion, 2);
});

test('integration failures do not falsely declare the WhatsApp session disconnected', async () => {
  for (const status of [401, 404, 408, 500, 502]) {
    const h = harness(); h.catalog = [h.candidate(2)];
    h.deps.evolution = async () => ({ ok: false, status, data: { error: 'Private upstream body must not be displayed' } });
    await h.engine.tick();
    assert.equal(h.state().status, 'aguardando_nova_tentativa');
    assert.match(h.state().lastError, new RegExp(`HTTP ${status}`));
    assert.ok(!h.state().lastError.includes('Private upstream'));
    assert.equal(h.state().groups.length, 0);
  }
});

test('connected aliases are accepted and unknown successful responses stop joins', async () => {
  for (const data of [{ instance: { connectionStatus: 'open' } }, { state: 'connected' }, { connectionStatus: 'OPEN' }, { instance: { status: 'connected' } }]) {
    const h = harness(); const original = h.deps.evolution;
    h.deps.evolution = async (endpoint: string, options?: any) => endpoint.startsWith('/instance/') ? {ok:true,status:200,data} : original(endpoint, options);
    h.catalog = [h.candidate(2)]; await h.engine.tick(); assert.equal(h.state().groups.length, 2);
  }
  const h = harness(); h.catalog = [h.candidate(2)];
  h.deps.evolution = async () => ({ok:true,status:200,data:{}});
  await h.engine.tick(); assert.equal(h.state().status, 'aguardando_nova_tentativa');
  assert.match(h.state().lastError, /estado de conexão reconhecido/);
});
