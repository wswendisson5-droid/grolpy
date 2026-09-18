import { AgendaItem, DivulgacaoCard, ClientGroup, ClientPlanUsage } from '../types';

export const INITIAL_AGENDA_ITEMS: AgendaItem[] = [];

export const INITIAL_DIVULGACOES: DivulgacaoCard[] = [];

export const INITIAL_CLIENT_GROUPS: ClientGroup[] = [];

export const SAMPLE_CLIENT_GROUPS: ClientGroup[] = [];

export const INITIAL_PLAN_USAGE: ClientPlanUsage = {
  planName: 'Plano Pro',
  validUntil: '20/10/2026',
  usedMessages: 0,
  totalMessages: 5000,
  percentage: 0,
  pendingMessages: 0,
  failedMessages: 0,
};

