import { randomUUID } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';
import { supabaseServerAdmin } from '@/lib/supabase/server';

const BUCKET = 'study-group-resources';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

function extensionFor(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext ? `.${ext.slice(0, 12)}` : '';
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const { supabase, userId } = await getSupabaseWithClerkAuth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!supabase || !supabaseServerAdmin) {
      return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
    }

    const groupId = params.id;
    const body = (await request.json()) as {
      fileName?: string;
      contentType?: string;
      fileSize?: number;
    };

    const fileName = body.fileName?.trim();
    const contentType = body.contentType?.trim();
    const fileSize = Number(body.fileSize);

    if (!fileName || !contentType || !Number.isFinite(fileSize)) {
      return NextResponse.json(
        { error: 'File name, type, and size are required' },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'File type is not supported' }, { status: 400 });
    }
    if (fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File must be 10MB or smaller' }, { status: 400 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'You must be a member to upload resources' }, { status: 403 });
    }

    const path = `groups/${groupId}/${userId}/${randomUUID()}${extensionFor(fileName)}`;
    const { data, error } = await supabaseServerAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error('[social:createResourceUpload]', error);
      return NextResponse.json({ error: 'Could not prepare file upload' }, { status: 500 });
    }

    return NextResponse.json({
      bucket: BUCKET,
      path,
      token: data.token,
    });
  } catch (error) {
    console.error('[social:createResourceUpload]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
