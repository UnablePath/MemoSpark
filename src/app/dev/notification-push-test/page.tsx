"use client";

import { useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface QueueResultState {
  ok: boolean;
  httpStatus: number;
  body: string;
  notificationId?: string | null;
}

function maskStudentId(raw: string | undefined): string {
  if (raw == null || raw.length < 10) {
    return "…";
  }
  return `${raw.slice(0, 8)}…${raw.slice(-4)}`;
}

export default function NotificationPushTestPage() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const studentId = user?.id;
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
    preferences,
  } = usePushNotifications();

  const [queueResult, setQueueResult] = useState<QueueResultState | null>(null);
  const [queuePending, setQueuePending] = useState(false);

  const vapidConfigured = useMemo(() => {
    const v = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    return Boolean(v && v !== "your_generated_public_key");
  }, []);

  const supabaseFunctionsBase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (!supabaseUrl) {
      return null;
    }
    try {
      const u = new URL(supabaseUrl);
      return `${u.origin}/functions/v1`;
    } catch {
      return null;
    }
  }, []);

  const sendTestToQueue = useCallback(
    async (opts: { delaySeconds: number }) => {
      if (studentId == null) return;

      setQueuePending(true);
      setQueueResult(null);

      const scheduledFor = new Date(
        Date.now() + opts.delaySeconds * 1000,
      ).toISOString();

      try {
        const response = await fetch("/api/push/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientUserId: studentId,
            category: "system",
            title: "MemoSpark test ping",
            body:
              opts.delaySeconds <= 0
                ? "Queued now — if cron + deliver run, you should see this on this device."
                : `Scheduled for ~${opts.delaySeconds}s from queue time — use this to test push-scheduler timing.`,
            url: "/dev/notification-push-test",
            scheduledFor,
          }),
        });

        const text = await response.text();
        let notificationId: string | null | undefined;
        try {
          const parsed = JSON.parse(text) as {
            notificationId?: string | null;
          };
          notificationId = parsed.notificationId;
        } catch {
          notificationId = undefined;
        }

        setQueueResult({
          ok: response.ok,
          httpStatus: response.status,
          body: text.slice(0, 2000),
          notificationId,
        });
      } catch (err: unknown) {
        console.error("[push:test-page]", err);
        setQueueResult({
          ok: false,
          httpStatus: 0,
          body: "Network error — check your connection and try again. Look at the browser console for details.",
        });
      } finally {
        setQueuePending(false);
      }
    },
    [studentId],
  );

  const systemNoticesOn = preferences.system_notices !== false;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-16 pt-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5" aria-hidden />
          Dev only
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Web push quick test
        </h1>
        <p className="text-sm text-muted-foreground">
          One place to enable push, enqueue a test notification, and read what
          to check in Supabase when the tray stays quiet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Who’s signed in</CardTitle>
          <CardDescription>
            The queue only accepts notifications for this Clerk account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!clerkLoaded ? (
            <p className="text-muted-foreground">Loading session…</p>
          ) : studentId ? (
            <p>
              <span className="text-muted-foreground">
                Student id (masked):
              </span>{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {maskStudentId(studentId)}
              </code>
            </p>
          ) : (
            <p className="text-amber-700 dark:text-amber-400">
              Sign in first — this route needs a logged-in student.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">This device</CardTitle>
          <CardDescription>
            Same pipeline as Settings → push, but with status lights for
            testing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              {isSupported ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <AlertCircle className="size-4 text-amber-600" />
              )}
              <span>
                Browser push support:{" "}
                <strong>{isSupported ? "yes" : "no"}</strong>
              </span>
            </li>
            <li className="flex items-center gap-2">
              {vapidConfigured ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <AlertCircle className="size-4 text-red-600" />
              )}
              <span>
                <code className="text-xs">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> on
                Vercel: <strong>{vapidConfigured ? "set" : "missing"}</strong>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-muted-foreground">Permission:</span>{" "}
              <strong>{permission}</strong>
            </li>
            <li className="flex items-center gap-2">
              {isSubscribed ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <AlertCircle className="size-4 text-muted-foreground" />
              )}
              <span>
                Push subscription saved:{" "}
                <strong>{isSubscribed ? "yes" : "no"}</strong>
              </span>
            </li>
            <li className="flex items-center gap-2">
              {systemNoticesOn ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <AlertCircle className="size-4 text-amber-600" />
              )}
              <span>
                System notices preference:{" "}
                <strong>{systemNoticesOn ? "on" : "off"}</strong> (off blocks
                the test — turn on in Settings → notifications)
              </span>
            </li>
          </ul>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant="default"
              disabled={
                !isSupported ||
                !vapidConfigured ||
                pushLoading ||
                permission === "denied"
              }
              onClick={() => void subscribe()}
            >
              {pushLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Enable push on this device"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!isSubscribed || pushLoading}
              onClick={() => void unsubscribe()}
            >
              Remove subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Queue a test notification</CardTitle>
          <CardDescription>
            Calls <code className="text-xs">POST /api/push/event</code> with
            category <code className="text-xs">system</code>. That inserts a row
            in <code className="text-xs">notifications</code>. Edge{" "}
            <code className="text-xs">push-scheduler</code> must run before you
            feel a ding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={studentId == null || queuePending || !systemNoticesOn}
              onClick={() => void sendTestToQueue({ delaySeconds: 0 })}
            >
              {queuePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send now (queue for immediate schedule)
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={studentId == null || queuePending || !systemNoticesOn}
              onClick={() => void sendTestToQueue({ delaySeconds: 90 })}
            >
              Schedule ~90s ahead
            </Button>
          </div>

          {queueResult != null && (
            <div
              className={`rounded-lg border p-3 text-xs ${
                queueResult.ok
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-red-500/40 bg-red-500/5"
              }`}
            >
              <p className="font-medium">
                HTTP {queueResult.httpStatus || "—"}{" "}
                {queueResult.ok ? "OK" : "problem"}
              </p>
              {queueResult.notificationId != null && (
                <p className="mt-1 font-mono text-[11px]">
                  notificationId: {queueResult.notificationId}
                </p>
              )}
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground">
                {queueResult.body}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">If there’s still no ding</CardTitle>
          <CardDescription>
            Work top to bottom — the first broken step is usually the fix.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-3 ps-4">
            <li>
              <strong className="text-foreground">Subscribe + prefs</strong> —
              This page should show subscription saved and system notices on.
              Re-run “Enable push” if you rotated VAPID keys.
            </li>
            <li>
              <strong className="text-foreground">Queue call</strong> — The
              “HTTP 200” block above should appear. If{" "}
              <code className="text-xs">403</code> or{" "}
              <code className="text-xs">400</code>, read the JSON body.
            </li>
            <li>
              <strong className="text-foreground">Supabase rows</strong> — SQL
              Editor → run:
              <pre className="mt-1 max-w-full overflow-x-auto rounded bg-muted p-2 font-mono text-[11px] text-foreground">
                {`SELECT id, status, scheduled_for, title
FROM notifications
ORDER BY created_at DESC
LIMIT 5;`}
              </pre>
              Expect <code className="text-xs">pending</code> until delivery,
              then <code className="text-xs">sent</code> or{" "}
              <code className="text-xs">failed</code> with{" "}
              <code className="text-xs">failure_reason</code>.
            </li>
            <li>
              <strong className="text-foreground">Scheduler + deliver</strong> —
              Dashboard → Edge Functions →{" "}
              <code className="text-xs">push-scheduler</code> then{" "}
              <code className="text-xs">push-deliver</code> → Logs after you
              queue a test. If scheduler never runs, configure{" "}
              <code className="text-xs">pg_cron</code> or invoke the scheduler
              URL manually with your cron secret and Bearer service role.
            </li>
            <li>
              <strong className="text-foreground">
                Project URLs (copy host)
              </strong>{" "}
              — Your functions base (from{" "}
              <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code>):
              <pre className="mt-1 max-w-full overflow-x-auto rounded bg-muted p-2 font-mono text-[11px] text-foreground">
                {supabaseFunctionsBase ??
                  "(set NEXT_PUBLIC_SUPABASE_URL to show)"}
              </pre>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
