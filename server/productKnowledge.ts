export const PRODUCT_KNOWLEDGE_VERSION = 'groply-product-v1';

export const PRODUCT_KNOWLEDGE = {
  name: 'Groply',
  accessUrl: 'https://grolpy.minhabagg.com.br',
  behavior: {
    connectedWhatsApps: 1,
    intervalSeconds: [30, 60, 120, 180, 300, 600],
    capabilities: [
      'conectar o próprio WhatsApp',
      'selecionar grupos',
      'programar horários e frequência',
      'configurar intervalo entre envios',
      'pausar e retomar divulgações',
      'sincronizar grupos',
    ],
  },
  plans: {
    Start: { priceBRL: '39,90', groups: 20, sendsPerDayPerGroup: 2, monthlySends: 1200, activeCampaigns: 2, historyDays: 7 },
    Pro: { priceBRL: '69,90', groups: 45, sendsPerDayPerGroup: 3, monthlySends: 4050, activeCampaigns: 5, historyDays: 30, reports: true, retryFailures: true },
    Max: { priceBRL: '119,90', groups: 90, sendsPerDayPerGroup: 15, monthlySends: 40500, activeCampaigns: 10, historyDays: 90, reports: true, retryFailures: true, prioritySupport: true },
  },
} as const;

export const PRODUCT_KNOWLEDGE_TEXT = `
FONTE OFICIAL DO PRODUTO (versão ${PRODUCT_KNOWLEDGE_VERSION}):
Groply é uma plataforma em que o cliente conecta o próprio WhatsApp, escolhe grupos, programa horários/frequência e configura o intervalo entre envios.
Intervalos disponíveis: 30 segundos, 1, 2, 3, 5 e 10 minutos.
Start: R$39,90/mês, 20 grupos, 2 envios/dia/grupo, 1.200/mês, 2 divulgações ativas, histórico 7 dias.
Pro: R$69,90/mês, 45 grupos, 3 envios/dia/grupo, 4.050/mês, 5 divulgações ativas, histórico 30 dias, relatórios completos e reenvio de falhas.
Max: R$119,90/mês, 90 grupos, 15 envios/dia/grupo, 40.500/mês, 10 divulgações ativas, histórico 90 dias, relatórios completos, reenvio de falhas e prioridade no suporte.
Todos: 1 WhatsApp, agendamento, seleção de grupos, intervalo entre grupos, pausa/retomada e sincronização.
BLOQUEIO/BANIMENTO: quando o lead levantar essa objeção, não assuste nem responda como aviso jurídico. Posicione o Groply com confiança: ele foi pensado para divulgação em grupos e permite controlar intervalos entre os envios para evitar disparos todos de uma vez. Diga que adotamos medidas operacionais para reduzir o risco. Não prometa risco zero, imunidade ou garantia absoluta, mas também não repita espontaneamente que "pode bloquear" depois de já explicar a prevenção.
`.trim();
