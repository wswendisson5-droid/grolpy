/**
 * Utilitários de normalização e comparação estrita de telefones de contatos
 * Garante que variações (com/sem 55, com/sem o nono dígito, máscaras e JIDs)
 * sejam detectadas como o MESMO contato, impedindo duplicações.
 */

export function cleanPhoneDigits(raw: string | null | undefined): string {
  if (!raw) return '';
  // Trata JIDs com sufixo de device (ex: 558198901234:12@s.whatsapp.net ou 558198901234:0@c.us)
  const base = String(raw).split('@')[0].split(':')[0];
  return base.replace(/\D/g, '');
}

/**
 * Retorna os últimos 8 dígitos significativos do telefone (número base sem o nono dígito)
 */
export function getPhoneCore(raw: string | null | undefined): string {
  const digits = cleanPhoneDigits(raw);
  if (digits.length < 8) return digits;
  return digits.slice(-8);
}

/**
 * Retorna o DDD do telefone brasileiro (se presente)
 */
export function getPhoneDdd(raw: string | null | undefined): string {
  const digits = cleanPhoneDigits(raw);
  // Se começa com 55 e tem pelo menos 12 dígitos: 55 + DDD (2) + 8/9
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits.slice(2, 4);
  }
  // Se tem 10 ou 11 dígitos: DDD (2) + 8/9
  if (digits.length === 10 || digits.length === 11) {
    return digits.slice(0, 2);
  }
  return '';
}

/**
 * Compara dois números ou JIDs e diz se são rigorosamente a mesma pessoa/telefone
 */
export function arePhonesEquivalent(phoneA: string | null | undefined, phoneB: string | null | undefined): boolean {
  if (!phoneA || !phoneB) return false;

  const dA = cleanPhoneDigits(phoneA);
  const dB = cleanPhoneDigits(phoneB);

  if (!dA || !dB) return false;
  if (dA === dB) return true;

  // Checagem se um contém o outro exatamente
  if (dA.endsWith(dB) || dB.endsWith(dA)) {
    const shorter = dA.length < dB.length ? dA : dB;
    const longer = dA.length < dB.length ? dB : dA;
    // Se o prefixo extra for '55' (DDI Brasil)
    if (longer === `55${shorter}` || longer.endsWith(shorter)) {
      if (shorter.length >= 10) return true;
    }
  }

  // Comparação considerando variação do nono dígito brasileiro (8 vs 9 dígitos)
  const coreA = getPhoneCore(dA);
  const coreB = getPhoneCore(dB);

  if (coreA.length === 8 && coreB.length === 8 && coreA === coreB) {
    const dddA = getPhoneDdd(dA);
    const dddB = getPhoneDdd(dB);

    // Se ambos tiverem DDD identificado, devem ser iguais
    if (dddA && dddB) {
      return dddA === dddB;
    }
    // Se um dos dois não tiver DDD explícito, mas o núcleo de 8 dígitos bate
    return true;
  }

  return false;
}
