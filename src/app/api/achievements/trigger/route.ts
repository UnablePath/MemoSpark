import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json();
    const { action, score, count } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Get user profile to ensure they exist
    const { data: profile } = await supabaseServerAdmin
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Find matching achievement templates
    const { data: achievementTemplates } = await supabaseServerAdmin
      .from('achievement_templates')
      .select('*');

    if (!achievementTemplates || achievementTemplates.length === 0) {
      return NextResponse.json({ message: 'No achievement templates found' });
    }

    const unlockedAchievements = [];

    for (const template of achievementTemplates) {
      const requirements = template.requirements;
      
      // Skip if this template doesn't match our action
      if (requirements.type !== action) {
        continue;
      }

      // Check if user already has this achievement
      const { data: existingAchievement } = await supabaseServerAdmin
        .from('achievements')
        .select('*')
        .eq('user_id', profile.id)
        .eq('name', template.name)
        .single();

      if (existingAchievement && existingAchievement.unlocked) {
        continue; // User already has this achievement
      }

      // Check if achievement criteria is met
      let criteriaCheck = false;
      
      if (requirements.type === 'bubble_game_played') {
        criteriaCheck = true; // First play always triggers
      } else if (requirements.type === 'bubble_game_score' && score !== undefined) {
        criteriaCheck = score >= requirements.score;
      } else if (requirements.count && count !== undefined) {
        criteriaCheck = count >= requirements.count;
      }

      if (criteriaCheck) {
        // Create or update achievement record
        const { error: achievementError } = await supabaseServerAdmin
          .from('achievements')
          .upsert({
            user_id: profile.id,
            name: template.name,
            description: template.description,
            unlocked: true,
            progress: requirements.count || requirements.score || 1,
            total: requirements.count || requirements.score || 1,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,name'
          });

        if (!achievementError) {
          // Award points by updating user stats
          const { error: pointsError } = await supabaseServerAdmin
            .from('user_stats')
            .upsert({
              user_id: profile.id,
              achievements_earned: 1, // Will be added to existing if record exists
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });

          unlockedAchievements.push({
            id: template.id,
            name: template.name,
            description: template.description,
            icon: template.icon,
            points: template.points
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: unlockedAchievements.length > 0 
        ? `Unlocked ${unlockedAchievements.length} achievement(s)!`
        : 'No new achievements unlocked',
      unlockedAchievements,
      action,
      score,
      count
    });

  } catch (error) {
    console.error('Error triggering achievements:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 