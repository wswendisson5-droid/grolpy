import assert from 'node:assert/strict';
import { radarEngine } from './radarEngine';
import { atendimentoEngine } from './atendimentoEngine';
import { extractWhatsAppMessageText, resolveWhatsAppGroupSender } from './whatsappMessageUtils';

process.env.AI_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = '';

const groupJid = '120363000000000000@g.us';
const mateusPhone = '5527999999999';
const protectedPhone = '5527999999998';
const sent: Array<{ target: string; text: string; kind: string }> = [];

(atendimentoEngine as any).proactiveMinIntervalMs = 0;
atendimentoEngine.hydrateFromState({ config: { enabled: true, mode: 'auto' }, atendimentos: [] });
atendimentoEngine.setProactiveEligibilityChecker(async (target) => !target.includes(protectedPhone));
atendimentoEngine.setEvolutionSender(async (target, text, kind = 'proactive') => {
  sent.push({ target, text, kind });
  return true;
});

radarEngine.hydrateFromState({
  status: 'active',
  monitoredGroupJids: [groupJid],
  analyzedPhones: [],
  processedMessageIds: [],
  opportunities: [],
  activities: [],
  contactStages: [],
  contactTags: [],
});

const wrapped = {
  key: { participant: '123456789012345@lid', participantAlt: `${mateusPhone}@s.whatsapp.net` },
  message: { ephemeralMessage: { message: { extendedTextMessage: { text: 'Oferta especial por R$ 36 por mês' } } } },
};
assert.deepEqual(resolveWhatsAppGroupSender(wrapped), {
  jid: `${mateusPhone}@s.whatsapp.net`, phone: mateusPhone, source: 'key.participantAlt', lidOnly: false,
});
assert.equal(extractWhatsAppMessageText(wrapped), 'Oferta especial por R$ 36 por mês');

const irrelevant = radarEngine.handleIncomingGroupMessage({
  groupJid, senderJid: `${mateusPhone}@s.whatsapp.net`, senderPhone: mateusPhone,
  senderName: 'Mateus', messageId: 'irrelevant-1', messageText: 'Bom dia pessoal, tudo bem com vocês?',
  fromMe: false, timestamp: Math.floor(Date.now() / 1000), senderSource: 'key.participantAlt', ingestionSource: 'test',
});
assert.equal(irrelevant.accepted, false);
assert.equal(irrelevant.reason, 'social_banter_filtered');

const commercialParams = {
  groupJid, senderJid: `${mateusPhone}@s.whatsapp.net`, senderPhone: mateusPhone,
  senderName: 'Mateus', messageId: 'commercial-1',
  messageText: 'OFERTA de TV e streaming com vários canais por apenas R$ 36 por mês. Chame no WhatsApp!',
  fromMe: false, timestamp: Math.floor(Date.now() / 1000), senderSource: 'key.participantAlt', ingestionSource: 'test' as const,
};
const commercial = radarEngine.handleIncomingGroupMessage(commercialParams);
assert.equal(commercial.accepted, true);

const duplicate = radarEngine.handleIncomingGroupMessage({ ...commercialParams, ingestionSource: 'polling' });
assert.equal(duplicate.accepted, false);
assert.equal(duplicate.reason, 'duplicate_message_id');

assert.equal(await radarEngine.processNextCandidate(), true);
await new Promise((resolve) => setTimeout(resolve, 30));
assert.equal(radarEngine.opportunities.length, 1);
assert.equal(atendimentoEngine.atendimentos.length, 1);
assert.equal(sent.filter((item) => item.kind === 'proactive' && item.target.includes(mateusPhone)).length, 1);

await atendimentoEngine.handleIncomingClientMessage(`${mateusPhone}@s.whatsapp.net`, 'Tenho interesse. Como funciona?', 'private-1');
assert.equal(sent.some((item) => item.kind === 'reply' && item.target.includes(mateusPhone)), true);

const protectedCommercial = radarEngine.handleIncomingGroupMessage({
  ...commercialParams,
  senderJid: `${protectedPhone}@s.whatsapp.net`, senderPhone: protectedPhone,
  senderName: 'Número protegido', messageId: 'protected-commercial-1',
});
assert.equal(protectedCommercial.accepted, true);
assert.equal(await radarEngine.processNextCandidate(), true);
await new Promise((resolve) => setTimeout(resolve, 30));
assert.equal(radarEngine.opportunities.some((item) => item.phone.replace(/\D/g, '') === protectedPhone), true);
assert.equal(sent.some((item) => item.kind === 'proactive' && item.target.includes(protectedPhone)), false);

console.log('ok - fluxo Radar → oportunidade → CRM → saudação → resposta IA');
console.log('ok - @lid usa participantAlt telefônico; duplicação por key.id bloqueada');
console.log('ok - irrelevante não bloqueia comercial posterior do mesmo telefone');
console.log('ok - número protegido entra no Radar/CRM e não recebe prospecção');
process.exit(0);
