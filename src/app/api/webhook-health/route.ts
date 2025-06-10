import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const environment = process.env.NODE_ENV === 'production' 
    ? (req.url.includes('memospark.live') ? 'production' : 'preview')
    : 'development';

  const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  return NextResponse.json({
    environment,
    timestamp: new Date().toISOString(),
    configuration: {
      webhookSecret: webhookSecret ? '✅ Configured' : '❌ Missing',
      supabaseUrl: supabaseUrl ? '✅ Configured' : '❌ Missing',
      supabaseServiceRole: supabaseServiceRole ? '✅ Configured' : '❌ Missing',
      appUrl: appUrl ? `✅ ${appUrl}` : '❌ Missing',
    },
    webhookEndpoint: `${appUrl || req.url.split('/api')[0]}/api/clerk-webhooks`,
    expectedUrls: {
      local: 'http://localhost:3000/api/clerk-webhooks',
      preview: 'https://study-spark-pi.vercel.app/api/clerk-webhooks',
      production: 'https://memospark.live/api/clerk-webhooks'
    },
    status: (webhookSecret && supabaseUrl && supabaseServiceRole) ? 'ready' : 'misconfigured'
  });
} 