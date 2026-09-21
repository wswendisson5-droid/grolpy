import assert from 'node:assert/strict';
import { cleanAssistantReply, confirmDeclaredName, isDirectPricingRequest, isSimpleGreeting, looksLikeBusinessAutoReply, normalizeConversationText } from './conversationPolicy';

const cases: Array<[string, () => void]> = [
  ['saudação simples', () => assert.equal(isSimpleGreeting('Bom dia'), true)],
  ['resposta curta sim', () => assert.equal(isSimpleGreeting('sim'), true)],
  ['preço imediato', () => assert.equal(isDirectPricingRequest('quais os planos e valores?'), true)],
  ['pedido tabela', () => assert.equal(isDirectPricingRequest('me manda a tabela de preços'), true)],
  ['comparação não força tabela', () => assert.equal(isDirectPricingRequest('o Pro é o mais completo?'), false)],
  ['recusa não força tabela', () => assert.equal(isDirectPricingRequest('não quero tabela'), false)],
  ['autoresposta com valores não pede nossa tabela', () => assert.equal(isDirectPricingRequest('Obrigado pelo contato! Quer saber valores ou fazer seu pedido? Fale com nosso gestor: https://wa.me/5532999999999'), false)],
  ['detecta autoresposta comercial longa', () => assert.equal(looksLikeBusinessAutoReply('Obrigado pelo contato! Atendimento de segunda a domingo. Quer saber valores ou fazer seu pedido? Fale diretamente com nosso gestor: https://wa.me/5532999999999'), true)],
  ['resposta humana curta não vira autoresposta', () => assert.equal(looksLikeBusinessAutoReply('Sim, pode falar'), false)],
  ['limpa risada automática', () => assert.equal(cleanAssistantReply('Ah kkk entendi'), 'Ah entendi')],
  ['normaliza acento', () => assert.equal(normalizeConversationText('DIVULGAÇÃO'), 'divulgacao')],
  ['não inventa nome de terceiro', () => assert.equal(confirmDeclaredName('Maria', 'a mulher Maria', 'a mulher Maria', false), '')],
  ['aceita nome declarado', () => assert.equal(confirmDeclaredName('Maria', 'me chamo Maria', 'Me chamo Maria', false), 'Maria')],
  ['aceita nome isolado após pergunta', () => assert.equal(confirmDeclaredName('João', 'João', 'João', true), 'João')],
  ['rejeita sim como nome', () => assert.equal(confirmDeclaredName('sim', 'sim', 'sim', true), '')],
];

for (const [name, test] of cases) {
  test();
  console.log('ok -', name);
}
console.log(`${cases.length} testes de política conversacional passaram.`);
