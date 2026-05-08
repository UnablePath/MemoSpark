import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';
import {
  decryptIfNeeded,
  encryptIfConfigured,
  isMessagingAtRestEncryptionConfigured,
} from '@/lib/messaging/server/messageAtRestCrypto';

type ProfilesJoin = {
  clerk_user_id: string;
  full_name: string | null;
  avatar_url: string | null;
} | null;

type MessageRow = {
  id: string;
  conversation_id: string | null;
  sender_id: string;
  recipient_id: string | null;
  content: string;
  message_type: string | null;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  metadata: Record<string, unknown> | null;
  encrypted: boolean | null;
  delivery_status: string | null;
  created_at: string | null;
  read: boolean | null;
  sender?: ProfilesJoin | ProfilesJoin[];
  reactions?: unknown[];
  read_receipts?: unknown[];
  attachments?: unknown[];
};

async function ensureConversationAccess(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseWithClerkAuth>>['supabase']>,
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (participant) return true;

  await supabase.rpc('ensure_group_chat_participant', {
    _conversation_id: conversationId,
    _clerk_user_id: userId,
  });

  const { data: after } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(after);
}

function normalizeSender(sender: MessageRow['sender']): {
  id: string;
  full_name?: string;
  avatar_url?: string;
} | undefined {
  if (!sender) return undefined;
  const row = Array.isArray(sender) ? sender[0] : sender;
  if (!row) return undefined;
  return {
    id: row.clerk_user_id,
    full_name: row.full_name ?? undefined,
    avatar_url: row.avatar_url ?? undefined,
  };
}

function rowToClientPayload(row: MessageRow): Record<string, unknown> {
  const plainContent = decryptIfNeeded(row.content, row.encrypted);
  const sender = normalizeSender(row.sender);

  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    recipient_id: row.recipient_id ?? '',
    content: plainContent,
    message_type: row.message_type || 'text',
    reply_to_id: row.reply_to_id ?? undefined,
    edited_at: row.edited_at ?? undefined,
    deleted_at: row.deleted_at ?? undefined,
    metadata: row.metadata || {},
    encrypted: Boolean(row.encrypted),
    delivery_status: (row.delivery_status as 'sent' | 'delivered' | 'read') || 'sent',
    created_at: row.created_at || new Date().toISOString(),
    read: Boolean(row.read),
    sender,
    reactions: Array.isArray(row.reactions) ? row.reactions : [],
    read_receipts: Array.isArray(row.read_receipts) ? row.read_receipts : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseWithClerkAuth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);
    const notBefore = searchParams.get('notBefore') || undefined;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const allowed = await ensureConversationAccess(supabase, userId, conversationId);
    if (!allowed) {
      return NextResponse.json({ error: 'Not authorized to access this conversation' }, { status: 403 });
    }

    let query = supabase
      .from('messages')
      .select(
        `
          *,
          sender:profiles!messages_sender_id_fkey(clerk_user_id, full_name, avatar_url),
          reactions:message_reactions(*),
          read_receipts:message_read_receipts(*),
          attachments:message_attachments(*)
        `,
      )
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (notBefore) {
      query = query.gte('created_at', notBefore);
    }

    const { data: messages, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[messaging:fetchMessages]', error);
      return NextResponse.json({ error: 'Could not load messages right now.' }, { status: 500 });
    }

    const rows = (messages || []) as MessageRow[];
    const formattedMessages = rows.map((r) => rowToClientPayload(r));

    return NextResponse.json({
      messages: formattedMessages,
      atRestEncryptionEnabled: isMessagingAtRestEncryptionConfigured(),
    });
  } catch (error) {
    console.error('[messaging:fetchMessages]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseWithClerkAuth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const body = await request.json();
    const {
      conversationId,
      content,
      messageType = 'text',
      metadata = {},
      id: clientMessageId,
      replyToId,
      recipientId,
    } = body as {
      conversationId?: string;
      content?: string;
      messageType?: string;
      metadata?: Record<string, unknown>;
      id?: string;
      replyToId?: string;
      recipientId?: string | null;
    };

    if (!conversationId || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Conversation ID and content are required' }, { status: 400 });
    }

    const allowed = await ensureConversationAccess(supabase, userId, conversationId);
    if (!allowed) {
      return NextResponse.json({ error: 'Not authorized to send messages to this conversation' }, { status: 403 });
    }

    const { content: storedContent, encrypted } = encryptIfConfigured(content.trim());

    const insertRow: Record<string, unknown> = {
      conversation_id: conversationId,
      sender_id: userId,
      recipient_id: recipientId ?? null,
      content: storedContent,
      message_type: messageType,
      metadata: metadata as Record<string, unknown>,
      reply_to_id: replyToId ?? null,
      encrypted,
      delivery_status: 'sent',
    };

    if (clientMessageId && typeof clientMessageId === 'string') {
      insertRow.id = clientMessageId;
    }

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert(insertRow)
      .select(
        `
        *,
        sender:profiles!messages_sender_id_fkey(clerk_user_id, full_name, avatar_url),
        reactions:message_reactions(*),
        read_receipts:message_read_receipts(*),
        attachments:message_attachments(*)
      `,
      )
      .single();

    if (messageError) {
      console.error('[messaging:sendMessage]', messageError);
      return NextResponse.json({ error: 'Could not save this message. Try again.' }, { status: 500 });
    }

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    const formattedMessage = rowToClientPayload(message as MessageRow);

    return NextResponse.json(
      { message: formattedMessage, atRestEncryptionEnabled: isMessagingAtRestEncryptionConfigured() },
      { status: 201 },
    );
  } catch (error) {
    console.error('[messaging:sendMessage]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
