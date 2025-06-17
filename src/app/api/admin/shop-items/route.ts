import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Mock data - replace with actual Supabase queries
const mockShopItems = [
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
    //   .from('reward_shop_items')
    //   .select('*')
    //   .order('created_at', { ascending: false });

    return NextResponse.json(mockShopItems);
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
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production, you would insert into Supabase here:
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

    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      ...body,
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