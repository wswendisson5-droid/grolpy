// Quotas do not apply to the Groply subscription.
export const UNLIMITED = Number.MAX_SAFE_INTEGER;
const truth = (v: any) => v === true || v === 1 || v === 'true' || v === '1';
const identity = (v: any) => String(v || '').split('@')[0].split(':')[0].replace(/\D/g, '');
export function isOpenJoinedGroup(group: any, owner: string): boolean {
  if (!String(group?.id || group?.jid || group?.remoteJid || '').endsWith('@g.us')) return false;
  if (['isCommunity', 'community', 'isCommunityAnnounce', 'isCommunityAnnouncement', 'announce', 'restrictSend', 'left', 'isLeft'].some(k => truth(group[k]))) return false;
  if (group.leftAt || group.leaveTimestamp || group.membership === 'left' || group.participation === 'left' || group.canSend === false || group.sendMessages === false) return false;
  const participants = Array.isArray(group.participants) ? group.participants : [];
  const own = participants.find((p: any) => truth(p.isMe) || truth(p.me) || truth(p.isSelf) ||
    (identity(owner) && [p.id, p.jid, p.phoneNumber, p.phone, p.pn].some(v => identity(v) === identity(owner))));
  return Boolean(own && !truth(own.left) && !truth(own.removed) && own.membership !== 'left');
}
export function nextRecurringSlot(camp: any, date: string, time: string, day: string): string | undefined {
  if (camp.scheduleDate && date < String(camp.scheduleDate).slice(0, 10)) return;
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const days = normalize(String(camp.scheduleDays || 'Todos os dias'));
  if (days !== 'todos os dias' && !days.split(/[,;\s]+/).includes(normalize(day))) return;
  const slots = [...new Set<string>((camp.scheduleTimes?.length ? camp.scheduleTimes : [camp.scheduleTime || '00:00']).map((t: any) => String(t).slice(0, 5)))].sort();
  const created = camp.createdAt ? new Date(camp.createdAt) : null;
  const createdDate = created && !isNaN(created.getTime()) ? created.toLocaleDateString('en-CA', {timeZone:'America/Sao_Paulo'}) : '';
  const createdTime = createdDate === date ? created!.toLocaleTimeString('pt-BR', {timeZone:'America/Sao_Paulo', hour:'2-digit', minute:'2-digit', hour12:false}) : '';
  const completed: string[] = Array.isArray(camp.completedSlots) ? camp.completedSlots : [];
  return slots.filter(t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t) && t <= time && (!createdTime || t >= createdTime))
    .map(t => `${date}_${t}`).find(key => !completed.includes(key));
}
export function isScheduledDue(camp: any, date: string, time: string): boolean {
  if (camp.executed || !['agendada', 'ativa'].includes(camp.status)) return false;
  const startDate = String(camp.scheduleDate || date).slice(0, 10);
  const startTime = String(camp.scheduleTime || '00:00').slice(0, 5);
  return startDate < date || (startDate === date && startTime <= time);
}
