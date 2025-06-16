import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// This would be your actual Supabase client
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, query Supabase:
    // const { data, error } = await supabase
    //   .from('reward_shop_items')
    //   .select('*')
    //   .order('created_at', { ascending: false });

    // if (error) throw error;

    // Mock data for development
    const shopItems = [
      {
        id: '1',
        name: 'Streak Freeze',
        description: 'Protects your streak for one missed day',
        category: 'streak_recovery',
        price: 100,
        icon: 'shield',
        effect: { type: 'streak_protection', duration: 1 },
        requirements: { min_level: 1 },
        availability: { enabled: true, stock: null },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Double XP Boost',
        description: 'Doubles XP earned for 24 hours',
        category: 'boosts',
        price: 200,
        icon: 'zap',
        effect: { type: 'xp_multiplier', multiplier: 2, duration: 24 },
        requirements: { min_level: 3 },
        availability: { enabled: true, stock: null },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Time Extension',
        description: 'Adds 2 hours to task deadlines',
        category: 'productivity',
        price: 150,
        icon: 'clock',
        effect: { type: 'deadline_extension', hours: 2 },
        requirements: { min_level: 2 },
        availability: { enabled: true, stock: null },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '4',
        name: 'Custom Theme',
        description: 'Unlock premium app themes',
        category: 'customization',
        price: 300,
        icon: 'palette',
        effect: { type: 'theme_unlock', themes: ['dark_pro', 'sunset', 'ocean'] },
        requirements: { min_level: 5 },
        availability: { enabled: true, stock: null },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '5',
        name: 'Priority Boost',
        description: 'Skip to front of AI assistance queue',
        category: 'productivity',
        price: 75,
        icon: 'crown',
        effect: { type: 'priority_access', duration: 7 },
        requirements: { min_level: 1 },
        availability: { enabled: true, stock: null },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return NextResponse.json(shopItems);
  } catch (error) {
    console.error('Error fetching shop items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shop items' },
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
    if (!body.name || !body.category || !body.price) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, price' },
        { status: 400 }
      );
    }

    // In production, insert into Supabase:
    // const { data, error } = await supabase
    //   .from('reward_shop_items')
    //   .insert({
    //     name: body.name,
    //     description: body.description,
    //     category: body.category,
    //     price: body.price,
    //     icon: body.icon,
    //     effect: body.effect,
    //     requirements: body.requirements,
    //     availability: body.availability || { enabled: true, stock: null },
    //     metadata: body.metadata || {}
    //   })
    //   .select()
    //   .single();

    // if (error) throw error;

    // Mock response for development
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      ...body,
      availability: body.availability || { enabled: true, stock: null },
      metadata: body.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating shop item:', error);
    return NextResponse.json(
      { error: 'Failed to create shop item' },
      { status: 500 }
    );
  }
} 