export interface ResolvedWhatsAppSender {
  jid: string;
  phone: string;
  source: string;
  lidOnly: boolean;
}

const MESSAGE_WRAPPERS = [
  'ephemeralMessage',
  'viewOnceMessage',
  'viewOnceMessageV2',
  'viewOnceMessageV2Extension',
  'documentWithCaptionMessage',
  'editedMessage',
] as const;

export function unwrapWhatsAppMessage(rawMessage: any): any {
  let current = rawMessage && typeof rawMessage === 'object' ? rawMessage : {};
  for (let depth = 0; depth < 8; depth += 1) {
    let next: any = null;
    for (const wrapper of MESSAGE_WRAPPERS) {
      const wrapped = current?.[wrapper]?.message;
      if (wrapped && typeof wrapped === 'object') {
        next = wrapped;
        break;
      }
    }
    if (!next) break;
    current = next;
  }
  return current;
}

export function extractWhatsAppMessageText(record: any): string {
  const message = unwrapWhatsAppMessage(record?.message || record);
  const candidates = [
    message?.conversation,
    message?.extendedTextMessage?.text,
    message?.imageMessage?.caption,
    message?.videoMessage?.caption,
    message?.documentMessage?.caption,
    message?.buttonsResponseMessage?.selectedDisplayText,
    message?.templateButtonReplyMessage?.selectedDisplayText,
    message?.listResponseMessage?.title,
    message?.listResponseMessage?.description,
  ];
  return String(candidates.find((value) => typeof value === 'string' && value.trim()) || '').trim();
}

export function resolveWhatsAppGroupSender(record: any): ResolvedWhatsAppSender {
  const candidates: Array<{ value: string; source: string }> = [
    { value: record?.key?.participantAlt, source: 'key.participantAlt' },
    { value: record?.participantAlt, source: 'participantAlt' },
    { value: record?.key?.participant, source: 'key.participant' },
    { value: record?.participant, source: 'participant' },
    { value: record?.sender, source: 'sender' },
  ].filter((item) => typeof item.value === 'string' && item.value.trim())
    .map((item) => ({ ...item, value: item.value.trim() }));

  const phoneJid = candidates.find((item) => item.value.endsWith('@s.whatsapp.net'));
  const barePhone = candidates.find((item) => /^\+?\d{8,15}$/.test(item.value));
  const selected = phoneJid || barePhone;
  if (selected) {
    const phone = selected.value.split('@')[0].replace(/\D/g, '');
    return { jid: selected.value, phone, source: selected.source, lidOnly: false };
  }

  return {
    jid: '',
    phone: '',
    source: candidates.some((item) => item.value.endsWith('@lid')) ? 'lid_only' : 'missing',
    lidOnly: candidates.some((item) => item.value.endsWith('@lid')),
  };
}

export function getWhatsAppMessageTimestamp(record: any): number {
  const raw = record?.messageTimestamp ?? record?.timestamp;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw);
  if (raw && typeof raw === 'object') {
    if (typeof raw.toNumber === 'function') {
      const value = raw.toNumber();
      if (Number.isFinite(value)) return value;
    }
    if (Number.isFinite(Number(raw.low))) return Number(raw.low);
  }
  return Math.floor(Date.now() / 1000);
}

export function maskWhatsAppSender(phoneOrJid: string): string {
  const digits = String(phoneOrJid || '').replace(/\D/g, '');
  return digits ? `***${digits.slice(-4)}` : 'unresolved';
}
