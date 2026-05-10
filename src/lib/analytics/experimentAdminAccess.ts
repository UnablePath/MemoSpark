function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseCommaList(raw: string | undefined): string[] {
  return (
    raw
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  );
}

function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : normalizeEmail(email.slice(at + 1));
}

/**
 * Who may open `/admin/experiments` and call refresh actions.
 *
 * Set **one** of (easiest first):
 * - `MEMOSPARK_EXPERIMENT_ADMIN_EMAIL_DOMAINS` — comma-separated domains (e.g. `memospark.live`)
 * - `MEMOSPARK_EXPERIMENT_ADMIN_EMAILS` — exact work emails
 * - `MEMOSPARK_EXPERIMENT_ADMIN_IDS` — Clerk `user_…` ids
 *
 * If none are set: only **development** (any signed-in user). Production requires an allowlist.
 */
export function userCanViewExperimentAnalytics(
  userId: string | null | undefined,
  verifiedEmails?: readonly string[] | null,
): boolean {
  if (!userId) {
    return false;
  }

  const idAllow = parseCommaList(process.env.MEMOSPARK_EXPERIMENT_ADMIN_IDS);
  if (idAllow.length > 0 && idAllow.includes(userId)) {
    return true;
  }

  const emails = (verifiedEmails ?? []).map(normalizeEmail).filter(Boolean);

  const exactAllow = parseCommaList(
    process.env.MEMOSPARK_EXPERIMENT_ADMIN_EMAILS,
  ).map(normalizeEmail);
  if (exactAllow.length > 0 && emails.some((e) => exactAllow.includes(e))) {
    return true;
  }

  const domainAllow = parseCommaList(
    process.env.MEMOSPARK_EXPERIMENT_ADMIN_EMAIL_DOMAINS,
  ).map(normalizeEmail);
  if (domainAllow.length > 0) {
    for (const email of emails) {
      const domain = emailDomain(email);
      if (domain && domainAllow.includes(domain)) {
        return true;
      }
    }
  }

  const hasAnyAllowlist =
    idAllow.length > 0 || exactAllow.length > 0 || domainAllow.length > 0;
  if (!hasAnyAllowlist) {
    return process.env.NODE_ENV === "development";
  }

  return false;
}
