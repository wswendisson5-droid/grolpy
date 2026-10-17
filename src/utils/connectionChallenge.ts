// Evolution 2.3.7 rotates QR events every 45s. Renew conservatively before that.
// This is a renewal window, not a guarantee of WhatsApp's authentication validity.
export const CHALLENGE_REFRESH_MS = 40_000;
export const CONNECTION_REQUEST_MS = 35_000;

export function evolutionSessionState(data: any): 'connected' | 'disconnected' | 'connecting' | 'unknown' {
  const value = String(data?.instance?.state || data?.state || data?.instance?.connectionStatus ||
    data?.connectionStatus || data?.instance?.status || data?.status || '').trim().toLowerCase();
  if (['open', 'connected'].includes(value)) return 'connected';
  if (['close', 'closed', 'disconnected'].includes(value)) return 'disconnected';
  if (['connecting', 'connection', 'waiting_qr'].includes(value)) return 'connecting';
  return 'unknown';
}

export function connectionCheckIndeterminate(result: { ok: boolean; status: number; data: any }): boolean {
  return result.ok ? evolutionSessionState(result.data) === 'unknown' : result.status !== 404;
}

export function challengeRequestPending(status: number, data: any): boolean {
  if (status === 409) return true;
  const challenge = data?.qrCode || data?.qrcode || data;
  const hasChallenge = challenge?.base64 || challenge?.code || challenge?.pairingCode || challenge?.PairingCode;
  return status >= 200 && status < 300 && data?.pending === true && !hasChallenge;
}

export function pairingCodeFrom(data: any): string | undefined {
  const q = data?.qrcode || data?.qrCode || data?.data || data;
  const candidate = q?.pairingCode || q?.PairingCode || q?.code;
  if (typeof candidate !== 'string' || !/^[a-z0-9]{4}-?[a-z0-9]{4}$/i.test(candidate.trim())) return;
  return candidate.trim().replace('-', '').toUpperCase();
}

interface ChallengeSnapshot { code?: string; base64?: string; pairingCode?: string; updatedAt: number; refreshAt?: number }
export function preserveChallengeTime<T extends ChallengeSnapshot>(next: T, previous?: ChallengeSnapshot): T & { refreshAt: number } {
  const identity = (q: ChallengeSnapshot) => q.code || q.base64 || q.pairingCode;
  const same = previous && identity(previous) === identity(next) && previous.pairingCode === next.pairingCode;
  const updatedAt = same ? previous.updatedAt : next.updatedAt;
  return { ...next, updatedAt, refreshAt: updatedAt + CHALLENGE_REFRESH_MS };
}

export async function connectionFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECTION_REQUEST_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('A conexão demorou mais que o esperado. Tente novamente ou use o QR Code.');
    throw error;
  } finally { clearTimeout(timeout); }
}
