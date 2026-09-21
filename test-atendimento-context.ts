import 'dotenv/config';
import assert from 'node:assert/strict';
import { AtendimentoEngine } from './server/atendimentoEngine';
const engine: any = new AtendimentoEngine();
clearInterval(engine.workerTimer);
engine.config.enabled = true; engine.config.mode = 'auto';
function fixture() {
  return { id: 'test', contactJid: 'test-only', contactPhone: '', contactName: 'Cliente',
    conversationStep: 'in_dialogue', aiActiveForContact: true, status: 'ia_em_atendimento',
    collectedInfo: {}, notes: [], messages: [], groupName: 'Grupo', originalMessage: '',
    demandSummary: '', recommendedService: '' };
}
const lead = fixture(); engine.atendimentos = [lead];
let generations = 0;
const generate = engine.generateContextualAiReply.bind(engine);
engine.generateContextualAiReply = async () => { generations++; };
await Promise.all([
 engine.handleIncomingClientMessage('test-only', 'Dormi mn', 'batch-1'),
 engine.handleIncomingClientMessage('test-only', 'O celular descarregou', 'batch-2'),
 engine.handleIncomingClientMessage('test-only', 'O celular descarregou', 'batch-2'),
 engine.handleIncomingClientMessage('test-only', 'O celular descarregou', 'batch-other-id')
]);
assert.equal(generations, 1); assert.equal(lead.messages.length, 2);
console.log('PASS: mensagens próximas e evento duplicado geram uma resposta');
engine.generateContextualAiReply = generate;
const sends: Array<{text: string; media?: string}> = [];
engine.setEvolutionSender(async (_jid: string, text: string, _kind: string, media?: string) => {
 sends.push({ text, media }); return true;
});

const live = process.argv.includes('--live');
let mockReply = ''; let mockMedia = false; let beforeReturn = () => {};
if (!live) {
 process.env.AI_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'test-only-no-network';
 globalThis.fetch = (async (_url: any, init: any) => {
  const request = JSON.parse(init.body);
  assert.ok(request.input.includes('HIST'));
  assert.equal(request.text.format.schema.properties.sendPricingTable.type, 'boolean');
  beforeReturn();
  return new Response(JSON.stringify({ output_text: JSON.stringify({
   replyText: mockReply, sendPricingTable: mockMedia, detectedName: '', memories: [],
   outcome: 'continue', nextStep: 'in_dialogue', pipelineStage: 'em_atendimento'
  }) }), { status: 200 });
 }) as typeof fetch;
}
const { getAiRuntimeInfo } = await import('./server/openaiClient');
assert.ok(getAiRuntimeInfo().configured, 'Modo --live exige chave configurada; nenhum WhatsApp será enviado.');
const cases = [
 { message: 'Mas tinha terminado de descarregar', prior: 'O celular estava na minha mão', media: false, reject: /pro|plano|69|retoma|demonstra/i },
 { message: 'Posso enviar pra quantos grupos?', prior: 'No Pro são 3 envios por dia por grupo e 4.050 por mês.', media: false, accept: /45/, reject: /4[.,]050|3 envios/ },
 { message: 'O Pro é o plano mais completo?', prior: 'O Pro permite 45 grupos.', media: false, accept: /max/i },
 { message: 'Me manda a tabela de preços', prior: 'Você pode escolher conforme seu uso.', media: true },
 { message: 'O Pro', prior: 'Essa é a nossa tabela de preços 👆', media: false },
];
for (const c of cases) {
 const l: any = fixture();
 l.messages = [
  { id: 'a', sender: 'ai', text: c.prior, timestamp: 1 },
  { id: 'b', sender: 'client', text: c.message, timestamp: 2 }
 ];
 const before = sends.length;
 mockReply = c.accept?.source.includes('45') ? 'Até 45 grupos no Pro.' : c.accept ? 'O mais completo é o Max.' : 'Entendi.';
 mockMedia = c.media;
 await generate(l, c.message);
 if (sends.length === before) console.log('Diagnóstico:', l.notes, l.status);
 assert.equal(sends.length, before + 1, 'Sem resposta válida: ' + c.message);
 const result = sends.at(-1)!;
 assert.equal(Boolean(result.media), c.media, c.message);
 if (c.accept) assert.match(result.text, c.accept);
 if (c.reject) assert.doesNotMatch(result.text, c.reject);
 assert.ok(result.text.length < 450, 'Resposta longa para dúvida simples');
 console.log('PASS:', c.message, '=>', result.text, result.media || '');
}
if (!live) {
 const count = sends.length; const l: any = fixture();
 mockReply = 'Resposta antiga'; mockMedia = false; let current = true;
 beforeReturn = () => { current = false; };
 await generate(l, 'Mensagem antiga', () => current);
 assert.equal(sends.length, count); assert.equal(l.messages.length, 0);
 beforeReturn = () => { l.status = 'humano_assumiu'; l.aiActiveForContact = false; };
 await generate(l, 'Nova pergunta');
 assert.equal(sends.length, count); assert.equal(l.messages.length, 0);
 console.log('PASS: resposta desatualizada e intervenção humana bloqueiam envio');
}
console.log(live ? 'PASS: provedor real; envio WhatsApp simulado' : 'PASS: integração com provedor e WhatsApp simulados; qualidade do modelo não avaliada');
process.exit(0);
