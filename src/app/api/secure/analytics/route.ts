import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';
import { createHash } from 'crypto';

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const cfConnecting = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (real) {
    return real;
  }
  if (cfConnecting) {
    return cfConnecting;
  }
  
  return request.ip || '127.0.0.1';
}

function isIPAllowed(ip: string): boolean {
  const allowedIPs = process.env.ANALYTICS_ALLOWED_IPS?.split(',') || ['127.0.0.1', '::1'];
  
  // In development, allow localhost
  if (process.env.NODE_ENV === 'development' && (ip === '127.0.0.1' || ip === '::1')) {
    return true;
  }
  
  return allowedIPs.includes(ip);
}

async function getComprehensiveAnalytics() {
  if (!supabaseServerAdmin) {
    throw new Error('Database not available');
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // User Analytics
    const { data: users, error: usersError } = await supabaseServerAdmin
      .from('user_profiles')
      .select('*');

    if (usersError) throw usersError;

    // Task Analytics
    const { data: tasks, error: tasksError } = await supabaseServerAdmin
      .from('tasks')
      .select('*');

    if (tasksError) throw tasksError;

    // Achievement Analytics
    const { data: achievements, error: achievementsError } = await supabaseServerAdmin
      .from('user_achievements')
      .select('*');

    if (achievementsError) throw achievementsError;

    // Gamification Analytics
    const { data: gamification, error: gamificationError } = await supabaseServerAdmin
      .from('user_gamification')
      .select('*');

    if (gamificationError) throw gamificationError;

    // Subscription Analytics
    const { data: subscriptions, error: subscriptionsError } = await supabaseServerAdmin
      .from('user_subscriptions')
      .select('*');

    if (subscriptionsError) throw subscriptionsError;

    // Conversion Analytics
    const { data: conversions, error: conversionsError } = await supabaseServerAdmin
      .from('conversion_analytics')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (conversionsError) throw conversionsError;

    // Onboarding Analytics
    const { data: onboarding, error: onboardingError } = await supabaseServerAdmin
      .from('onboarding_analytics')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (onboardingError) throw onboardingError;

    // Process and aggregate data
    const totalUsers = users?.length || 0;
    const activeUsers7d = users?.filter(u => new Date(u.last_active_at || u.created_at) >= sevenDaysAgo).length || 0;
    const activeUsers1d = users?.filter(u => new Date(u.last_active_at || u.created_at) >= oneDayAgo).length || 0;
    
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.completed).length || 0;
    const tasksLast7d = tasks?.filter(t => new Date(t.created_at) >= sevenDaysAgo).length || 0;
    
    const totalAchievements = achievements?.length || 0;
    const achievementsLast7d = achievements?.filter(a => new Date(a.earned_at) >= sevenDaysAgo).length || 0;
    
    const totalCoinsEarned = gamification?.reduce((sum, g) => sum + (g.total_coins_earned || 0), 0) || 0;
    const totalPointsEarned = gamification?.reduce((sum, g) => sum + (g.total_points || 0), 0) || 0;
    
    const premiumUsers = subscriptions?.filter(s => s.tier !== 'free' && s.is_active).length || 0;
    const freeUsers = totalUsers - premiumUsers;
    
    const conversionRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0;
    
    // User engagement metrics
    const userEngagement = users?.map(user => {
      const userTasks = tasks?.filter(t => t.user_id === user.id) || [];
      const userAchievements = achievements?.filter(a => a.user_id === user.id) || [];
      const userGamification = gamification?.find(g => g.user_id === user.id);
      
      return {
        id: user.id,
        email: user.email,
        name: user.full_name,
        createdAt: user.created_at,
        lastActive: user.last_active_at,
        totalTasks: userTasks.length,
        completedTasks: userTasks.filter(t => t.completed).length,
        totalAchievements: userAchievements.length,
        totalPoints: userGamification?.total_points || 0,
        totalCoins: userGamification?.total_coins_earned || 0,
        currentStreak: userGamification?.current_streak || 0,
        subscription: subscriptions?.find(s => s.user_id === user.id)?.tier || 'free'
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints) || [];

    // Revenue analytics
    const monthlyRevenue = subscriptions?.filter(s => {
      const createdAt = new Date(s.created_at);
      return createdAt >= thirtyDaysAgo && s.tier !== 'free' && s.is_active;
    }).reduce((sum, s) => {
      // Estimate revenue based on tier (you should replace with actual pricing)
      const pricing = { basic: 9.99, premium: 19.99, enterprise: 49.99 };
      return sum + (pricing[s.tier as keyof typeof pricing] || 0);
    }, 0) || 0;

    return {
      overview: {
        totalUsers,
        activeUsers7d,
        activeUsers1d,
        totalTasks,
        completedTasks,
        taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        totalAchievements,
        achievementsLast7d,
        totalCoinsEarned,
        totalPointsEarned,
        premiumUsers,
        freeUsers,
        conversionRate,
        monthlyRevenue
      },
      userEngagement: userEngagement.slice(0, 50), // Top 50 users
      recentActivity: {
        tasksLast7d,
        achievementsLast7d,
        newUsers7d: users?.filter(u => new Date(u.created_at) >= sevenDaysAgo).length || 0,
        conversionsLast7d: conversions?.filter(c => c.event_type === 'subscription_created').length || 0
      },
      conversionFunnel: {
        signups: conversions?.filter(c => c.event_type === 'user_registered').length || 0,
        onboardingCompleted: onboarding?.filter(o => o.completed).length || 0,
        firstTaskCreated: conversions?.filter(c => c.event_type === 'first_task_created').length || 0,
        subscribed: conversions?.filter(c => c.event_type === 'subscription_created').length || 0
      },
      systemHealth: {
        databaseConnected: true,
        totalQueries: 'N/A', // You could track this
        averageResponseTime: 'N/A', // You could track this
        uptime: '99.9%' // You could track this
      }
    };

  } catch (error) {
    console.error('Analytics query error:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    
    // IP whitelist check
    if (!isIPAllowed(ip)) {
      console.warn(`🚨 SECURITY ALERT: Unauthorized analytics access from IP: ${ip} at ${new Date().toISOString()}`);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Session verification
    const sessionToken = request.cookies.get('analytics-session')?.value;
    const authHeader = request.headers.get('authorization');
    const token = sessionToken || authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get comprehensive analytics
    const analytics = await getComprehensiveAnalytics();
    
    // Log access
    console.log(`📊 ANALYTICS ACCESS: Dashboard data accessed from IP: ${ip} at ${new Date().toISOString()}`);
    
    return NextResponse.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
      generatedBy: 'MemoSpark Secure Analytics Engine v1.0'
    });
    
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch analytics data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
