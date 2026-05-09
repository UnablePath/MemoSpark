import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const supabase = getSupabaseAdmin();

/**
 * Cancel every pending OneSignal notification attached to a task.
 *
 * Looks up `notification_queue` rows where `data->>taskId` matches, calls
 * OneSignal's `DELETE /notifications/{id}` for each, then flips the local
 * row status to `cancelled`. Best effort, returns counts and continues on
 * partial failure.
 */
export async function POST(request: NextRequest) {
  try {
    const { taskId, userId } = (await request.json()) as {
      taskId?: string;
      userId?: string;
    };

    if (!taskId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, userId' },
        { status: 400 },
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 },
      );
    }

    const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const oneSignalKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!oneSignalAppId || !oneSignalKey) {
      return NextResponse.json(
        { error: 'OneSignal not configured' },
        { status: 500 },
      );
    }

    const { data: queued, error: queueError } = await supabase
      .from('notification_queue')
      .select('id, onesignal_notification_id')
      .eq('clerk_user_id', userId)
      .eq('status', 'scheduled')
      .filter('data->>taskId', 'eq', taskId);

    if (queueError) {
      console.warn('[cancel] queue lookup failed', queueError);
      return NextResponse.json(
        { cancelled: 0, failed: 0, reason: 'queue-lookup-failed' },
        { status: 200 },
      );
    }

    if (!queued || queued.length === 0) {
      return NextResponse.json({ cancelled: 0, failed: 0 });
    }

    let cancelled = 0;
    let failed = 0;

    await Promise.all(
      queued.map(async (row) => {
        const id = row.onesignal_notification_id;
        if (!id) return;
        try {
          const res = await fetch(
            `https://onesignal.com/api/v1/notifications/${id}?app_id=${oneSignalAppId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Basic ${oneSignalKey}`,
              },
            },
          );
          if (res.ok || res.status === 404) {
            cancelled += 1;
          } else {
            failed += 1;
            const body = await res.text().catch(() => '');
            console.warn('[cancel] OneSignal reject', res.status, body);
          }
        } catch (error) {
          failed += 1;
          console.warn('[cancel] OneSignal request threw', error);
        }
      }),
    );

    const ids = queued.map((r) => r.id);
    const { error: updateError } = await supabase
      .from('notification_queue')
      .update({ status: 'cancelled' })
      .in('id', ids);

    if (updateError) {
      console.warn('[cancel] queue status update failed', updateError);
    }

    return NextResponse.json({ cancelled, failed, total: queued.length });
  } catch (error) {
    console.error('[cancel] unhandled error', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
