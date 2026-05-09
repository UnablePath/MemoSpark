/**
 * Stable display helpers for connection / chat avatars when photos are missing.
 */

export function connectionDisplayInitials(
  name: string | null | undefined,
): string {
  const n = (name ?? "").trim();
  if (!n) return "??";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? "";
    const b = parts[parts.length - 1]?.[0] ?? "";
    return (a + b).toUpperCase();
  }
  if (n.length >= 2) return n.slice(0, 2).toUpperCase();
  return (n[0] ?? "?").toUpperCase() + "?";
}

/** Deterministic hue 0–359 from an id (Clerk user id, message sender id, etc.). */
export function connectionAvatarHue(id: string | null | undefined): number {
  if (!id) return 142;
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/**
 * Short deterministic tag from a sender id so two people with the same initials
 * stay identifiable next to their bubbles (e.g. last 4 alnum chars).
 */
export function connectionSenderTail(
  senderId: string | null | undefined,
): string {
  if (!senderId) return '';
  const compact = senderId.replace(/[^a-zA-Z0-9]/g, '');
  if (compact.length >= 4) return compact.slice(-4).toUpperCase();
  if (senderId.length >= 4) return senderId.slice(-4).toUpperCase();
  return senderId.slice(-Math.min(4, senderId.length)).toUpperCase();
}
