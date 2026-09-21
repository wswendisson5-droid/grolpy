import assert from 'node:assert/strict';
import { createConversationMemory, decideConversation, detectIntent, fallbackForDecision, isDuplicateInboundMessage, updateMemoryFromTurn, validateCommercialReply } from './conversationIntelligence';

function test(name: string, fn: () => void) {
  fn();
  console.log('ok -', name);
}

test('primeira resposta cria contexto em vez de pitch', () => {
  const m = { ...createConversationMemory(), stage: 'WAITING_FIRST_REPLY' as const };
  const d = decideConversation(m, 'Bom dia, quem é?', 1);
  assert.equal(d.stage, 'CONVERSATION_STARTED');
  assert.equal(d.reasonCode, 'first_reply');
});

test('sim qualifica volume sem vender', () => {
  const m = { ...createConversationMemory(), stage: 'CONVERSATION_STARTED' as const };
  const d = decideConversation(m, 'sim', 2);
  assert.equal(d.stage, 'QUALIFICATION');
  assert.equal(fallbackForDecision(d), 'Você costuma divulgar em quantos grupos mais ou menos?');
});

test('volume informado apos manual encerra interrogatorio e apresenta solucao', () => {
  const m = { ...createConversationMemory(), stage: 'QUALIFICATION' as const, confirmedFacts: { manual: 'sim' } };
  const d = decideConversation(m, '50 grupos', 3);
  assert.equal(d.stage, 'SOLUTION_INTRODUCTION');
  assert.equal(d.reasonCode, 'present_solution_after_volume');
});

test('numero puro em qualificacao vira quantidade de grupos na memoria', () => {
  const m = { ...createConversationMemory(), stage: 'QUALIFICATION' as const, confirmedFacts: { manual: 'sim' } };
  const d = decideConversation(m, '50', 3);
  const next = updateMemoryFromTurn(m, '50', d);
  assert.equal(next.confirmedFacts.group_count, '50');
});

test('preço imediato sai do fluxo sem bloquear resposta', () => {
  const d = decideConversation(createConversationMemory(), 'quanto custa?', 1);
  assert.equal(d.intent, 'pricing');
  assert.equal(d.stage, 'PRICING');
});

test('mensagem ambígua pode aguardar complemento', () => {
  const m = { ...createConversationMemory(), stage: 'QUALIFICATION' as const };
  const d = decideConversation(m, 'a mulher dos móveis', 3);
  assert.equal(d.intent, 'ambiguous');
  assert.equal(d.shouldRespond, false);
});

test('opt-out encerra automação comercial', () => {
  const d = decideConversation(createConversationMemory(), 'não me mande mais mensagem', 2);
  assert.equal(d.stage, 'DO_NOT_CONTACT');
  assert.equal(d.reasonCode, 'opt_out');
});

test('não interessado encerra sem insistência', () => {
  const d = decideConversation(createConversationMemory(), 'não tenho interesse', 2);
  assert.equal(d.stage, 'NOT_INTERESTED');
});

test('como funciona entra na introdução da solução', () => {
  const d = decideConversation(createConversationMemory(), 'como funciona?', 2);
  assert.equal(d.stage, 'SOLUTION_INTRODUCTION');
});

test('objeção de bloqueio é reconhecida', () => {
  assert.equal(detectIntent('tem risco de bloquear?'), 'objection');
});

test('memória separa fato confirmado de hipótese', () => {
  const m = createConversationMemory();
  const d = decideConversation({ ...m, stage: 'CONVERSATION_STARTED' }, 'sim', 2);
  const next = updateMemoryFromTurn(m, 'sim', d);
  assert.equal(next.confirmedFacts.manual, 'sim');
  assert.deepEqual(next.hypotheses, {});
});

test('memória extrai quantidade de grupos informada', () => {
  const m = createConversationMemory();
  const d = decideConversation({ ...m, stage: 'QUALIFICATION' }, 'uns 40 grupos', 3);
  const next = updateMemoryFromTurn(m, 'uns 40 grupos', d);
  assert.equal(next.confirmedFacts.group_count, '40');
});

test('validador bloqueia textão', () => {
  const d = decideConversation({ ...createConversationMemory(), stage: 'QUALIFICATION' }, 'sim', 2);
  const v = validateCommercialReply('x'.repeat(500), d, []);
  assert.equal(v.ok, false);
  assert(v.reasons.includes('too_long'));
});

test('validador bloqueia duas perguntas', () => {
  const d = decideConversation(createConversationMemory(), 'oi', 1);
  const v = validateCommercialReply('Tudo bem? Você divulga manualmente?', d, []);
  assert(v.reasons.includes('too_many_questions'));
});

test('validador bloqueia venda precoce na qualificação', () => {
  const d = decideConversation({ ...createConversationMemory(), stage: 'CONVERSATION_STARTED' }, 'sim', 2);
  const v = validateCommercialReply('O plano Pro custa R$ 69,90. Quer assinar?', d, []);
  assert(v.reasons.includes('selling_too_early'));
});

test('validador bloqueia resposta duplicada', () => {
  const d = decideConversation(createConversationMemory(), 'oi', 1);
  const v = validateCommercialReply('Vi sua divulgação.', d, ['Vi sua divulgação.']);
  assert(v.reasons.includes('duplicate_reply'));
});

test('informação nova substitui fato antigo confirmado', () => {
  const m = createConversationMemory();
  m.confirmedFacts.group_count = '20';
  const d = decideConversation({ ...m, stage: 'QUALIFICATION' }, 'na verdade são 35 grupos', 5);
  const next = updateMemoryFromTurn(m, 'na verdade são 35 grupos', d);
  assert.equal(next.confirmedFacts.group_count, '35');
});

test('webhook duplicado pelo mesmo message id é idempotente', () => {
  const now = Date.now();
  const messages = [{ id: 'msg-client-ABC', sender: 'client', text: 'sim', timestamp: now }];
  assert.equal(isDuplicateInboundMessage(messages, 'sim', 'ABC', now + 100), true);
});

test('evento equivalente com id diferente e mesmo conteúdo em 5s é deduplicado', () => {
  const now = Date.now();
  const messages = [{ id: 'msg-client-ABC', sender: 'client', text: 'sim', timestamp: now }];
  assert.equal(isDuplicateInboundMessage(messages, 'sim', 'XYZ', now + 1000), true);
});

test('mensagens diferentes em sequência não são confundidas com duplicata', () => {
  const now = Date.now();
  const messages = [{ id: 'msg-client-1', sender: 'client', text: 'sim', timestamp: now }];
  assert.equal(isDuplicateInboundMessage(messages, 'faço manual', '2', now + 500), false);
});

test('três complementos preservam fatos acumulados na memória', () => {
  let m = { ...createConversationMemory(), stage: 'CONVERSATION_STARTED' as const };
  let d = decideConversation(m, 'sim', 2);
  m = updateMemoryFromTurn(m, 'sim', d) as typeof m;
  d = decideConversation(m, 'faço manual', 3);
  m = updateMemoryFromTurn(m, 'faço manual', d) as typeof m;
  d = decideConversation(m, 'mas são uns 12 grupos', 4);
  m = updateMemoryFromTurn(m, 'mas são uns 12 grupos', d) as typeof m;
  assert.equal(m.confirmedFacts.manual, 'sim');
  assert.equal(m.confirmedFacts.group_count, '12');
});

test('retomada posterior mantém estágio persistido', () => {
  const m = { ...createConversationMemory(), stage: 'PAIN_DISCOVERY' as const, lastInteractionAt: Date.now() - 86400000 };
  const d = decideConversation(m, 'como funciona?', 8);
  assert.equal(d.stage, 'SOLUTION_INTRODUCTION');
  assert.equal(d.intent, 'how_it_works');
});

test('interesse explícito pede nome quando ainda não foi confirmado', () => {
  const m = { ...createConversationMemory(), stage: 'SOLUTION_INTRODUCTION' as const };
  const d = decideConversation(m, 'quero saber mais', 4);
  assert.equal(d.stage, 'INTEREST');
  assert.equal(d.reasonCode, 'ask_confirmed_name');
  assert.match(fallbackForDecision(d), /nome/i);
});

test('nome confirmado evita perguntar o nome novamente', () => {
  const m = { ...createConversationMemory(), stage: 'INTEREST' as const };
  m.confirmedFacts.name = 'Rian';
  const d = decideConversation(m, 'pode me mostrar', 5);
  assert.equal(d.reasonCode, 'advance_interest');
});

test('barreira sobre motivo da abordagem interrompe interrogatório', () => {
  const m = { ...createConversationMemory(), stage: 'QUALIFICATION' as const };
  const d = decideConversation(m, 'Afinal o que deseja? Não te conheço', 4);
  assert.equal(d.stage, 'OBJECTION');
  assert.equal(d.reasonCode, 'clarify_contact_reason');
  assert.match(fallbackForDecision(d), /ferramenta/i);
});

test('objeção de custo vira conversa de valor sem desistir pelo lead', () => {
  const m = { ...createConversationMemory(), stage: 'SOLUTION_INTRODUCTION' as const };
  const d = decideConversation(m, 'não sei se é um gasto que para mim compense', 5);
  assert.equal(d.reasonCode, 'value_objection');
  assert.doesNotMatch(fallbackForDecision(d), /não seja uma prioridade/i);
});

test('barreira de banimento recebe resposta específica de intervalo', () => {
  const m = { ...createConversationMemory(), stage: 'QUALIFICATION' as const };
  const d = decideConversation(m, 'parei de usar robô para evitar banimento', 4);
  assert.equal(d.reasonCode, 'blocking_risk');
  assert.match(fallbackForDecision(d), /30 segundos/i);
});

test('já tenho robô posiciona diferencial sem interrogatório', () => {
  const m = { ...createConversationMemory(), stage: 'QUALIFICATION' as const };
  const d = decideConversation(m, 'Não. Tenho robô.', 3);
  assert.equal(d.stage, 'OBJECTION');
  assert.equal(d.reasonCode, 'already_uses_tool');
  assert.match(fallbackForDecision(d), /própria para divulgação em grupos/i);
  assert.doesNotMatch(fallbackForDecision(d), /seu robô|comando manual/i);
});

console.log('26 testes de inteligência conversacional passaram.');
