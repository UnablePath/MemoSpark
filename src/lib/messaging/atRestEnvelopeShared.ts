/** Safe on client & server: detect MemoSpark at-rest ciphertext without importing crypto. */
export const AT_REST_ENVELOPE_PREFIX = 'ms1:';

export function isLikelyAtRestCiphertext(content: string | null | undefined): boolean {
  return typeof content === 'string' && content.startsWith(AT_REST_ENVELOPE_PREFIX);
}
