import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';

// This would be your actual Supabase client
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category');

    // Build query to fetch from coin_spending_categories table
    let query = supabaseServerAdmin
      .from('coin_spending_categories')
      .select('*')
      .eq('is_active', true)
      .order('base_cost', { ascending: true });

    // Apply category filter if provided (filter by metadata->category)
    if (categoryFilter && categoryFilter !== 'all') {
      query = query.eq('metadata->>category', categoryFilter);
    }

    const { data: shopItems, error } = await query;

    if (error) {
      console.error('Error fetching shop items:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch shop items',
        details: error.message 
      }, { status: 500 });
    }

    // Convert database format to expected format for RewardShop.tsx
    const convertedItems = (shopItems || []).map((item: any) => ({
      id: item.id.toString(),
      item_name: item.name,                   // Use correct database column 'name'
      description: item.description,
      category_name: item.metadata?.category || 'theme', // Extract from metadata
      cost: item.base_cost,                   // Use correct database column 'base_cost'
      requirements: item.unlock_requirements || {},
      metadata: item.metadata || {},
      created_at: item.created_at,
      updated_at: item.created_at // Use created_at since no updated_at column
    }));

    return NextResponse.json(convertedItems);

  } catch (error) {
    console.error('Error in shop-items API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

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
    
    // Validate required fields (adjust to match our schema)
    if (!body.name || !body.base_cost) {
      return NextResponse.json(
        { error: 'Missing required fields: name, base_cost' },
        { status: 400 }
      );
    }

    // Insert into coin_spending_categories table with correct column names
    const { data, error } = await supabaseServerAdmin
      .from('coin_spending_categories')
      .insert({
        id: body.id || body.name.toLowerCase().replace(/\s+/g, '-'),
        name: body.name,
        description: body.description,
        base_cost: body.base_cost,
        unlock_requirements: body.requirements || {},
        metadata: {
          category: body.category || 'theme',
          rarity: body.rarity || 'common',
          ...body.metadata
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating shop item:', error);
      return NextResponse.json(
        { error: 'Failed to create shop item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating shop item:', error);
    return NextResponse.json(
      { error: 'Failed to create shop item' },
      { status: 500 }
    );
  }
} 