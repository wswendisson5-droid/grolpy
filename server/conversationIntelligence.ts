import { normalizeConversationText } from './conversationPolicy';

export const PROMPT_VERSION = 'sales-conversation-v3';
export const MEMORY_VERSION = 1;
export const APPROACH_VERSION = 'greeting-only-v1';

export type ConversationStage =
  | 'INITIAL_CONTACT' | 'WAITING_FIRST_REPLY' | 'CONVERSATION_STARTED' | 'QUALIFICATION'
  | 'PAIN_DISCOVERY' | 'SOLUTION_INTRODUCTION' | 'INTEREST' | 'OBJECTION' | 'PRICING'
  | 'CONVERSION' | 'FOLLOW_UP' | 'NOT_INTERESTED' | 'DO_NOT_CONTACT';

export type ConversationIntent =
  | 'greeting' | 'manual_confirmation' | 'process_detail' | 'how_it_works' | 'pricing'
  | 'objection' | 'interest' | 'not_interested' | 'do_not_contact' | 'human_request' | 'ambiguous'
  | 'other';

export interface ConversationMemory {
  version: number;
  stage: ConversationStage;
  currentTopic: string;
  confirmedFacts: Record<string, string>;
  hypotheses: Record<string, string>;
  unansweredQuestions: string[];
  lastQuestionAsked: string;
  objections: string[];
  interests: string[];
  productInterest: string;
  summary: string;
  approachId: string;
  approachVersion: string;
  lastInteractionAt: number;
}

export interface ConversationDecision {
  stage: ConversationStage;
  intent: ConversationIntent;
  responseGoal: string;
  shouldRespond: boolean;
  reasonCode: string;
  promptVersion: string;
  memoryVersion: number;
  approachId: string;
}

export interface DecisionLog extends ConversationDecision {
  messageId: string;
  contactId: string;
  timestamp: number;
  validationResult?: string;
}

export interface ValidationResult {
  ok: boolean;
  reasons: string[];
}

export function createConversationMemory(now = Date.now()): ConversationMemory {
  return {
    version: MEMORY_VERSION,
    stage: 'INITIAL_CONTACT',
    currentTopic: 'abordagem comercial',
    confirmedFacts: {},
    hypotheses: {},
    unansweredQuestions: [],
    lastQuestionAsked: '',
    objections: [],
    interests: [],
    productInterest: 'unknown',
    summary: '',
    approachId: 'A',
    approachVersion: APPROACH_VERSION,
    lastInteractionAt: now,
  };
}

function isStopRequest(t: string) {
  return /\b(nao me mande|não me mande|pare de mandar|nao quero receber|não quero receber|remove meu contato|remova meu contato|nao entre em contato|não entre em contato)\b/.test(t);
}

function isNotInterested(t: string) {
  return /\b(nao tenho interesse|não tenho interesse|sem interesse|nao quero|não quero|dispenso|obrigado,? nao|obrigado,? não)\b/.test(t);
}

export function detectIntent(text: string): ConversationIntent {
  const t = normalizeConversationText(text).split('[respondendo a:')[0].trim();
  if (isStopRequest(t)) return 'do_not_contact';
  if (isNotInterested(t)) return 'not_interested';
  if (/\b(preco|precos|valor|valores|quanto custa|mensalidade|plano|planos|tabela)\b/.test(t)) return 'pricing';
  if (/\b(como funciona|como que funciona|funciona como|como usar|como usa)\b/.test(t)) return 'how_it_works';
  if (/\b(bloque\w*|ban\w*|spam|segur\w*|risco\w*)\b/.test(t)) return 'objection';
  if (/\b(por que a pergunta|porque a pergunta|pq a pergunta|por qual motivo|qual o motivo|qual (?:e|eh) seu objetivo|o que voce deseja|o que deseja|nao te conheco|nao estou te entendendo|monte de pergunta|muita pergunta)\b/.test(t)) return 'objection';
  if (/\b(gasto|compensa|compense|prioridade|caro|vale a pena|custo beneficio)\b/.test(t)) return 'objection';
  if (/\b(ja tenho (?:um )?(?:robo|bot|sistema|ferramenta)|uso (?:um )?(?:robo|bot|sistema|ferramenta)|tenho (?:um )?(?:robo|bot)\b)/.test(t)) return 'objection';
  if (/\b(quero saber mais|gostaria de saber mais|tenho interesse|me explica|pode me mostrar|quero conhecer|me mostra)\b/.test(t)) return 'interest';
  if (/\b(humano|atendente|pessoa de verdade)\b/.test(t)) return 'human_request';
  if (/^(sim|ss|s|isso|isso mesmo|faco|faço|manual|manualmente)[.! ]*$/.test(t)) return 'manual_confirmation';
  if (/\b(grupos?|vezes|dia|horas?|minutos?|manual|manualmente|grupo por grupo)\b/.test(t)) return 'process_detail';
  if (/^(oi|ola|opa|bom dia|boa tarde|boa noite|quem e|quem eh|quem fala)[!?., ]*$/.test(t)) return 'greeting';
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= 5 && /\b(ele|ela|isso|aquilo|a mulher|o homem|os moveis|a madeira|aquele|aquela)\b/.test(t)) return 'ambiguous';
  return 'other';
}

export function decideConversation(
  memory: ConversationMemory,
  latestText: string,
  clientMessageCount: number
): ConversationDecision {
  const intent = detectIntent(latestText);
  let stage = memory.stage;
  let responseGoal = 'responder naturalmente ao contexto atual';
  let shouldRespond = true;
  let reasonCode = 'continue_conversation';

  if (intent === 'do_not_contact') {
    stage = 'DO_NOT_CONTACT'; responseGoal = 'confirmar encerramento brevemente'; reasonCode = 'opt_out';
  } else if (intent === 'not_interested') {
    stage = 'NOT_INTERESTED'; responseGoal = 'encerrar educadamente sem insistir'; reasonCode = 'not_interested';
  } else if (intent === 'pricing') {
    stage = 'PRICING'; responseGoal = 'responder preço ou planos com dados oficiais'; reasonCode = 'direct_pricing';
  } else if (intent === 'how_it_works') {
    stage = 'SOLUTION_INTRODUCTION'; responseGoal = 'explicar somente como funciona, em até duas frases'; reasonCode = 'direct_product_question';
  } else if (intent === 'objection') {
    stage = 'OBJECTION';
    const normalized = normalizeConversationText(latestText);
    if (/\b(bloque\w*|ban\w*|spam|segur\w*|risco\w*)\b/.test(normalized)) {
      responseGoal = 'responder diretamente à preocupação com bloqueio/banimento: explicar que a ferramenta permite espaçar os envios com intervalos configuráveis de 30 segundos, 1, 2, 3, 5 ou 10 minutos para evitar disparos todos de uma vez, sem prometer risco zero; não transformar a resposta em propaganda';
      reasonCode = 'blocking_risk';
    } else if (/\b(por que a pergunta|porque a pergunta|pq a pergunta|por qual motivo|qual o motivo|qual (?:e|eh) seu objetivo|o que voce deseja|o que deseja|nao te conheco|nao estou te entendendo|monte de pergunta|muita pergunta)\b/.test(normalized)) {
      responseGoal = 'parar imediatamente o interrogatório e explicar o objetivo em linguagem humana: você viu a divulgação no grupo e entrou em contato porque trabalha com uma ferramenta que automatiza esse tipo de envio; dizer isso em uma ou duas frases e deixar a pessoa decidir se quer saber mais, sem fazer outra pergunta de qualificação';
      reasonCode = 'clarify_contact_reason';
    } else if (/\b(ja tenho (?:um )?(?:robo|bot|sistema|ferramenta)|uso (?:um )?(?:robo|bot|sistema|ferramenta)|tenho (?:um )?(?:robo|bot)\b)/.test(normalized)) {
      responseGoal = 'não interrogar sobre o robô atual. Reconhecer em uma frase e posicionar a diferença relevante: esta ferramenta foi pensada especificamente para divulgação em grupos, com seleção dos grupos, programação de horários e intervalos. Em seguida convidar de forma curta para conhecer como funciona. Não afirmar que não dá banimento ou qualquer garantia absoluta.';
      reasonCode = 'already_uses_tool';
    } else {
      responseGoal = 'tratar a objeção específica sem discutir com a pessoa. Se a dúvida for se o custo compensa, relacionar a ferramenta ao tempo/trabalho que ela economiza, sem dizer que talvez não seja prioridade e sem pressionar; oferecer informação objetiva de funcionamento ou preço apenas se ajudar a decisão';
      reasonCode = 'value_objection';
    }
  } else if (intent === 'interest') {
    stage = 'INTEREST';
    if (!memory.confirmedFacts.name) {
      responseGoal = 'reconhecer o interesse e perguntar o nome da pessoa de forma natural antes de aprofundar a explicação';
      reasonCode = 'ask_confirmed_name';
    } else {
      responseGoal = 'avançar a explicação comercial de forma curta usando o nome confirmado com moderação';
      reasonCode = 'advance_interest';
    }
  } else if (clientMessageCount === 1 || memory.stage === 'WAITING_FIRST_REPLY' || memory.stage === 'INITIAL_CONTACT') {
    stage = 'CONVERSATION_STARTED'; responseGoal = 'explicar em UMA frase curta por que chamou: viu a divulgação no grupo e trabalha com uma ferramenta que automatiza esse tipo de envio. Não iniciar interrogatório e não perguntar se é manual'; reasonCode = 'first_reply';
  } else if (intent === 'manual_confirmation') {
    stage = 'QUALIFICATION'; responseGoal = 'não perguntar quantidade de grupos. Fazer uma pergunta curta e variável sobre a rotina/dificuldade do envio, por exemplo se toma muito tempo ou se precisa ficar entrando grupo por grupo. Nunca repetir uma pergunta já feita'; reasonCode = 'qualify_volume';
  } else if (intent === 'process_detail') {
    const normalized = normalizeConversationText(latestText);
    const hasGroupVolume = /\b\d{1,3}\s*grupos?\b/.test(normalized) || /^(?:uns?\s*)?\d{1,3}$/.test(normalized);
    if (memory.confirmedFacts.manual === 'sim' && (hasGroupVolume || Boolean(memory.confirmedFacts.group_count))) {
      stage = 'SOLUTION_INTRODUCTION';
      responseGoal = 'já existe contexto comercial suficiente. NÃO faça outra pergunta de qualificação sobre frequência, tempo ou processo. Conecte o volume/trabalho manual ao benefício e apresente a ferramenta em uma ou duas frases curtas; depois convide a pessoa a conhecer como funciona.';
      reasonCode = 'present_solution_after_volume';
    } else {
      stage = memory.confirmedFacts.manual === 'sim' ? 'PAIN_DISCOVERY' : 'QUALIFICATION';
      responseGoal = 'use o detalhe que a pessoa acabou de dar sem repetir pergunta. Se ainda faltar volume, faça somente essa pergunta; não empilhe perguntas de qualificação.';
      reasonCode = 'discover_process';
    }
  } else if (intent === 'other' && memory.confirmedFacts.manual === 'sim' && Boolean(memory.confirmedFacts.group_count)) {
    stage = 'SOLUTION_INTRODUCTION';
    responseGoal = 'o lead já confirmou processo manual e volume. Pare de qualificar e apresente a ferramenta de forma curta, ligada ao trabalho de postar grupo por grupo. Não faça nova pergunta investigativa.';
    reasonCode = 'present_solution_after_volume';
  } else if (intent === 'other' && (memory.stage === 'CONVERSATION_STARTED' || memory.stage === 'QUALIFICATION' || memory.stage === 'PAIN_DISCOVERY')) {
    stage = memory.confirmedFacts.manual === 'sim' ? 'PAIN_DISCOVERY' : 'QUALIFICATION';
    responseGoal = 'dar continuidade comercial ao que a pessoa acabou de explicar; não travar nem reiniciar o roteiro. Aproveitar os fatos já informados e fazer no máximo uma pergunta útil que aproxime da apresentação do Groply';
    reasonCode = 'continue_qualification';
  } else if (intent === 'ambiguous') {
    responseGoal = 'não inventar contexto; aguardar complemento ou esclarecer somente se necessário';
    shouldRespond = false;
    reasonCode = 'wait_ambiguous_fragment';
  }

  return {
    stage, intent, responseGoal, shouldRespond, reasonCode,
    promptVersion: PROMPT_VERSION, memoryVersion: memory.version, approachId: memory.approachId,
  };
}

export function updateMemoryFromTurn(
  memory: ConversationMemory,
  latestText: string,
  decision: ConversationDecision,
  now = Date.now()
): ConversationMemory {
  const next: ConversationMemory = {
    ...memory,
    stage: decision.stage,
    confirmedFacts: { ...memory.confirmedFacts },
    hypotheses: { ...memory.hypotheses },
    unansweredQuestions: [...memory.unansweredQuestions],
    objections: [...memory.objections],
    interests: [...memory.interests],
    lastInteractionAt: now,
  };
  const t = normalizeConversationText(latestText);
  if (decision.intent === 'manual_confirmation') next.confirmedFacts.manual = 'sim';
  const groupMatch = t.match(/\b(?:uns?|umas?|cerca de|mais ou menos)?\s*(\d{1,3})\s*grupos?\b/);
  const bareGroupCount = /^(?:uns?\s*)?(\d{1,3})$/.exec(t);
  if (groupMatch) next.confirmedFacts.group_count = groupMatch[1];
  else if (bareGroupCount && (memory.stage === 'QUALIFICATION' || memory.stage === 'PAIN_DISCOVERY')) next.confirmedFacts.group_count = bareGroupCount[1];
  const freqMatch = t.match(/\b(\d{1,2})\s*(?:x|vez|vezes)\s*(?:por|ao)\s*dia\b/);
  if (freqMatch) next.confirmedFacts.daily_frequency = freqMatch[1];
  if (decision.intent === 'objection' && !next.objections.includes(latestText.trim())) next.objections.push(latestText.trim());
  if (decision.intent === 'pricing' || decision.intent === 'how_it_works' || decision.intent === 'interest') next.productInterest = 'explicit';
  if (decision.intent === 'do_not_contact' || decision.intent === 'not_interested') next.productInterest = 'declined';
  next.summary = Object.entries(next.confirmedFacts).map(([k,v]) => `${k}=${v}`).join('; ');
  return next;
}

export function validateCommercialReply(
  reply: string,
  decision: ConversationDecision,
  previousAiMessages: string[]
): ValidationResult {
  const text = String(reply || '').trim();
  const reasons: string[] = [];
  if (!text) reasons.push('empty');
  if (text.length > 420) reasons.push('too_long');
  const questions = (text.match(/\?/g) || []).length;
  if (questions > 1) reasons.push('too_many_questions');
  const normalized = normalizeConversationText(text);
  if (/\b(entendi perfeitamente|compreendo perfeitamente)\b/.test(normalized)) reasons.push('robotic_agreement');
  if (/\b(garantimos|garantia de nao bloquear|risco zero|100% seguro)\b/.test(normalized)) reasons.push('unsupported_guarantee');
  if (decision.stage === 'QUALIFICATION' && /\b(r\$|plano|start|pro|max|39,90|69,90|119,90)\b/.test(normalized)) reasons.push('selling_too_early');
  if (previousAiMessages.some((m) => normalizeConversationText(m) === normalized)) reasons.push('duplicate_reply');
  return { ok: reasons.length === 0, reasons };
}

export function isDuplicateInboundMessage(
  messages: Array<{ id: string; sender: string; text: string; timestamp: number }>,
  text: string,
  externalMessageId = '',
  now = Date.now()
): boolean {
  const stableId = externalMessageId ? `msg-client-${externalMessageId}` : '';
  if (stableId && messages.some((message) => message.id === stableId)) return true;
  const lastClient = [...messages].reverse().find((message) => message.sender === 'client');
  return Boolean(lastClient && lastClient.text.trim() === text.trim() && now - lastClient.timestamp < 5000);
}

export function fallbackForDecision(decision: ConversationDecision): string {
  switch (decision.reasonCode) {
    case 'qualify_volume': return 'E essa rotina de ficar fazendo os envios acaba tomando muito do seu tempo?';
    case 'first_reply': return 'Vi sua divulgação no grupo e te chamei porque trabalho com uma ferramenta que automatiza justamente esse tipo de envio.';
    case 'opt_out': return 'Tudo certo. Não vou continuar com as mensagens por aqui.';
    case 'not_interested': return 'Tranquilo, obrigado por responder.';
    case 'blocking_risk': return 'Esse cuidado faz sentido. A ferramenta permite configurar intervalos entre os envios, de 30 segundos até 10 minutos, pra não disparar tudo de uma vez. Isso ajuda a deixar o envio menos agressivo, mas não existe garantia de risco zero de bloqueio.';
    case 'clarify_contact_reason': return 'Perguntei porque vi sua divulgação no grupo e trabalho com uma ferramenta que automatiza justamente esses envios. Queria entender se faria sentido pra você, mas posso te explicar direto como funciona.';
    case 'value_objection': return 'A ideia da ferramenta é tirar o trabalho de ficar encaminhando grupo por grupo: você configura os grupos e horários e os envios ficam programados. O ponto é ver se o tempo que isso economiza faz sentido pra sua rotina.';
    case 'already_uses_tool': return 'Boa. A nossa ferramenta é própria para divulgação em grupos: você escolhe os grupos, programa os horários e controla o intervalo dos envios. Se quiser, te mostro rapidinho como funciona.';
    case 'present_solution_after_volume': return 'Esse volume já dá bastante trabalho fazendo manualmente. Tenho uma ferramenta que automatiza esses envios: você escolhe os grupos e programa os horários. Se quiser, te mostro rapidinho como funciona.';
    case 'ask_confirmed_name': return 'Claro. Antes, qual é o seu nome pra eu te chamar certinho por aqui?';
    default: return '';
  }
}
