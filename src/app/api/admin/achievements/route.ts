import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Mock data - replace with actual Supabase queries
const mockAchievements = [
  {
    id: '1',
    name: 'First Steps',
    description: 'Complete your first task',
    category: 'streak',
    icon: 'zap',
    rarity: 'common',
    points: 10,
    requirements: { type: 'tasks_completed', count: 1 },
    reward: { coins: 50 },
    hidden: false,
    repeatable: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    category: 'streak',
    icon: 'fire',
    rarity: 'rare',
    points: 50,
    requirements: { type: 'consecutive_days', count: 7 },
    reward: { coins: 200 },
    hidden: false,
    repeatable: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, you would query Supabase here:
    // const { data, error } = await supabase
    //   .from('achievement_templates')
    //   .select('*')
    //   .order('created_at', { ascending: false });

    return NextResponse.json(mockAchievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.category || !body.requirements) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production, you would insert into Supabase here:
    // const { data, error } = await supabase
    //   .from('achievement_templates')
    //   .insert({
    //     name: body.name,
    //     description: body.description,
    //     category: body.category,
    //     icon: body.icon,
    //     rarity: body.rarity || 'common',
    //     points: body.points || 10,
    //     requirements: body.requirements,
    //     reward: body.reward,
    //     hidden: body.hidden || false,
    //     repeatable: body.repeatable || false
    //   })
    //   .select()
    //   .single();

    const newAchievement = {
      id: Math.random().toString(36).substr(2, 9),
      ...body,
      rarity: body.rarity || 'common',
      points: body.points || 10,
      hidden: body.hidden || false,
      repeatable: body.repeatable || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json(newAchievement, { status: 201 });
  } catch (error) {
    console.error('Error creating achievement:', error);
    return NextResponse.json(
      { error: 'Failed to create achievement' },
      { status: 500 }
    );
  }
} 