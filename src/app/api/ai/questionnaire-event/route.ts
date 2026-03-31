import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Records a questionnaire funnel event (step viewed, completed, error).
 */
export async function POST(request: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const templateId = typeof body.templateId === 'string' ? body.templateId : null;
    const eventType = typeof body.eventType === 'string' ? body.eventType : 'unknown';
    const payload = typeof body.payload === 'object' && body.payload !== null ? body.payload : {};

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ ok: false, skipped: true }, { status: 200 });
    }

    const token = await getToken({ template: 'supabase-integration' });
    if (!token) {
      return NextResponse.json({ error: 'No token' }, { status: 401 });
    }

    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { error } = await supabase.from('questionnaire_user_events').insert({
      user_id: userId,
      template_id: templateId,
      event_type: eventType,
      payload,
    });

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[questionnaire-event]', error.message);
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
