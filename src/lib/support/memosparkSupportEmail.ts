/**
 * Canonical support inbox for MemoSpark (mailto-based flows).
 * Using mailto ensures reports work reliably on Android, iOS, and desktop.
 */
export const MEMOSPARK_SUPPORT_EMAIL = 'support@memospark.live' as const;

const MAILTO_HREF_CEILING = 2000;

interface MemoSparkReportMailtoInput {
  /** Short human-readable fragment for the Subject line */
  subjectDetail: string;
  /** Text the student typed (shown after context in the Body) */
  studentWrittenReport: string;
  /** Structured facts (IDs, URLs) shown before the student's text */
  contextLines: string[];
  /** Use `typeof window !== "undefined" ? window.location.href : undefined` from client code */
  pageUrl?: string;
}

function trimSubject(value: string): string {
  const t = value.trim().replace(/\s+/g, ' ');
  return t.length <= 96 ? t : `${t.slice(0, 93)}...`;
}

export function createMemoSparkReportMailtoHref(
  input: MemoSparkReportMailtoInput,
): string {
  const subject = encodeURIComponent(
    `MemoSpark: ${trimSubject(input.subjectDetail)}`,
  );

  const contextBlock = input.contextLines.filter((l) => l.trim().length > 0).join('\n');

  const urlBlock = input.pageUrl?.trim()
    ? `Page / context URL:\n${input.pageUrl.trim()}`
    : '';

  const buildBody = (studentText: string): string => {
    const head = [contextBlock, urlBlock].filter(Boolean).join('\n\n');
    const tail = `What I am reporting:\n${studentText.trim()}`;
    return head ? `${head}\n\n${tail}` : tail;
  };

  let studentText = input.studentWrittenReport.trim();

  const makeHref = (): string => {
    const body = buildBody(studentText);
    return `mailto:${MEMOSPARK_SUPPORT_EMAIL}?subject=${subject}&body=${encodeURIComponent(
      body,
    )}`;
  };

  let href = makeHref();

  while (
    href.length > MAILTO_HREF_CEILING &&
    studentText.length > 48
  ) {
    studentText = `${studentText.slice(0, Math.floor(studentText.length * 0.8))}\n[Truncated so your email app can open this draft]`;
    href = makeHref();
  }

  return href;
}

/** Navigates to a mailto URI (works with default mail apps on Android and iOS). */
export function openMemoSparkSupportMailHref(href: string): void {
  if (typeof window === 'undefined') return;
  window.location.href = href;
}
