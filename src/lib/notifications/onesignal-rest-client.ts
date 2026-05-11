/**
 * OneSignal Messages REST API (Keys + Authorization: Key …).
 *
 * MemoSpark previously targeted `onesignal.com/api/v1` with `Basic`; that pairing
 * now yields 403 for current apps. Prefer `POST/DELETE …/notifications` on
 * `https://api.onesignal.com`.
 *
 * Env: ONESIGNAL_REST_API_KEY — raw REST key from the dashboard is fine (we add `Key`).
 * Optional: ONESIGNAL_API_ORIGIN override (no trailing slash).
 */

const DEFAULT_ONESIGNAL_API_ORIGIN = "https://api.onesignal.com";

export function getOneSignalApiOrigin(): string {
  const raw = process.env.ONESIGNAL_API_ORIGIN?.trim();
  const base =
    raw && raw.length > 0
      ? raw.replace(/\/+$/, "")
      : DEFAULT_ONESIGNAL_API_ORIGIN;
  return base;
}

/**
 * Stable header auth value. Accepts pasted values that already include `Key `
 * or legacy `Basic ` so mis-pasted vars still work.
 */
export function getOneSignalAuthorizationValue(): string {
  const raw = process.env.ONESIGNAL_REST_API_KEY?.trim();
  if (!raw) {
    throw new Error("[onesignal:rest] ONESIGNAL_REST_API_KEY is not set");
  }
  if (/^(Key|Basic)\s+/i.test(raw)) {
    return raw;
  }
  return `Key ${raw}`;
}

export function oneSignalNotificationsPostHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: getOneSignalAuthorizationValue(),
  };
}

/**
 * Migrates deprecated `include_player_ids` onto `include_subscription_ids`
 * after OneSignal renamed the targeting model for web/mobile subscriptions.
 */
export function normalizeOutboundPushTargeting(
  payload: Record<string, unknown>,
): void {
  type PlayerLegacy = {
    include_player_ids?: string[];
    include_external_user_ids?: string[];
  };

  const maybe = payload as PlayerLegacy;

  if (
    Array.isArray(maybe.include_external_user_ids) &&
    maybe.include_external_user_ids.length > 0 &&
    payload.include_aliases === undefined
  ) {
    payload.include_aliases = {
      external_id: maybe.include_external_user_ids.map(String),
    };
    maybe.include_external_user_ids = undefined;
  }

  if (
    Array.isArray(maybe.include_player_ids) &&
    maybe.include_player_ids.length > 0
  ) {
    payload.include_subscription_ids = maybe.include_player_ids;
    maybe.include_player_ids = undefined;
  }

  payload.target_channel = "push";

  const alias = payload.include_aliases as
    | { external_id?: unknown }
    | undefined;
  const hasExternal =
    alias && Array.isArray(alias.external_id) && alias.external_id.length > 0;
  const hasSubs =
    Array.isArray(payload.include_subscription_ids) &&
    payload.include_subscription_ids.length > 0;

  if (!hasExternal && !hasSubs) {
    console.warn(
      "[onesignal:rest] Outbound notification has no targeting (external_id or subscription ids)",
    );
  }
}

export async function postOneSignalNotification(
  payload: Record<string, unknown>,
): Promise<Response> {
  normalizeOutboundPushTargeting(payload);
  const url = `${getOneSignalApiOrigin()}/notifications`;
  return fetch(url, {
    method: "POST",
    headers: oneSignalNotificationsPostHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function cancelOneSignalNotification(
  notificationId: string,
  appId: string,
): Promise<Response> {
  const endpoint = new URL(
    `${getOneSignalApiOrigin()}/notifications/${encodeURIComponent(notificationId)}`,
  );
  endpoint.searchParams.set("app_id", appId);
  return fetch(endpoint.toString(), {
    method: "DELETE",
    headers: {
      Authorization: getOneSignalAuthorizationValue(),
    },
  });
}
