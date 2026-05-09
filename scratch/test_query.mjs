
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testQuery() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const conversationId = '2bdd5c0d-421c-4bdf-bcb2-574a53df02c9'; // from logs
  
  console.log('Testing query for conversation:', conversationId);
  
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(clerk_user_id, full_name, avatar_url),
      reactions:message_reactions(*),
      read_receipts:message_read_receipts(*),
      attachments:message_attachments(*)
    `)
    .eq('conversation_id', conversationId)
    .limit(1);
    
  if (error) {
    console.error('Query Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Query Success:', data);
  }
}

testQuery();
