import { AgendaItem, DivulgacaoCard, ClientGroup, ClientPlanUsage } from '../types';

export const INITIAL_AGENDA_ITEMS: AgendaItem[] = [];

export const INITIAL_DIVULGACOES: DivulgacaoCard[] = [];

export const INITIAL_CLIENT_GROUPS: ClientGroup[] = [];

export const SAMPLE_CLIENT_GROUPS: ClientGroup[] = [];

export const INITIAL_PLAN_USAGE: ClientPlanUsage = {
  planName: 'Carregando plano...',
  validUntil: '',
  usedMessages: 0,
  totalMessages: 0,
  percentage: 0,
  pendingMessages: 0,
  failedMessages: 0,
};

