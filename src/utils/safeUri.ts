/**
 * Safe URI encoding, decoding and string handling utilities.
 * Prevents Uncaught URIError: URI malformed caused by lone surrogates,
 * unescaped percent signs, or truncated Unicode emoji sequences.
 */

export function safeEncodeURIComponent(val: unknown): string {
  try {
    const str = String(val ?? '');
    const wellFormed =
      typeof (str as any).toWellFormed === 'function'
        ? (str as any).toWellFormed()
        : str.replace(
            /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
            ''
          );
    return encodeURIComponent(wellFormed);
  } catch {
    try {
      const sanitized = String(val ?? '').replace(/[\uD800-\uDFFF]/g, '');
      return encodeURIComponent(sanitized);
    } catch {
      return '';
    }
  }
}

export function safeDecodeURI(uri: string): string {
  try {
    return decodeURI(uri);
  } catch {
    try {
      // Escape raw % signs not part of a valid hex sequence
      const sanitized = String(uri).replace(/%(?![0-9a-fA-F]{2})/g, '%25');
      return decodeURI(sanitized);
    } catch {
      return String(uri);
    }
  }
}

export function safeDecodeURIComponent(val: string): string {
  try {
    return decodeURIComponent(val);
  } catch {
    try {
      const sanitized = String(val).replace(/%(?![0-9a-fA-F]{2})/g, '%25');
      return decodeURIComponent(sanitized);
    } catch {
      return String(val);
    }
  }
}

export function safeTruncate(str: string, maxLen: number): string {
  if (!str) return '';
  const wellFormed =
    typeof (str as any).toWellFormed === 'function'
      ? (str as any).toWellFormed()
      : str.replace(
          /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
          ''
        );
  // Array.from preserves multi-byte code points (emojis, flags, etc.) without cutting surrogates
  const chars = Array.from(wellFormed);
  if (chars.length <= maxLen) return chars.join('');
  return chars.slice(0, Math.max(0, maxLen - 3)).join('') + '...';
}
