import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Basic shop items for launch
    const shopItems = [
      // THEME ITEMS (Customization category - coin-based themes)
      {
        name: "Forest Dream Theme",
        description: "Serene greens for focused studying and deep concentration",
        price: 50,
        category: "customization",
        type: "theme",
        icon: "🌿",
        metadata: { 
          theme_id: "forest-dream",
          rarity: "common",
          colors: { primary: "#10B981", secondary: "#047857", accent: "#34D399" }
        }
      },
      {
        name: "Sunset Blaze Theme",
        description: "Warm energy for productive sessions and motivation",
        price: 75,
        category: "customization",
        type: "theme",
        icon: "🌅",
        metadata: { 
          theme_id: "sunset-blaze",
          rarity: "common",
          colors: { primary: "#F59E0B", secondary: "#D97706", accent: "#FBBF24" }
        }
      },
      {
        name: "Ocean Depths Theme",
        description: "Deep blues that inspire focus and tranquility",
        price: 120,
        category: "customization",
        type: "theme",
        icon: "🌊",
        requirements: { tasks_completed: 10 },
        metadata: { 
          theme_id: "ocean-depths",
          rarity: "rare",
          colors: { primary: "#0EA5E9", secondary: "#0284C7", accent: "#38BDF8" }
        }
      },
      {
        name: "Purple Haze Theme",
        description: "Mystical purples for creativity and inspiration",
        price: 150,
        category: "customization",
        type: "theme",
        icon: "🔮",
        requirements: { tasks_completed: 15 },
        metadata: { 
          theme_id: "purple-haze",
          rarity: "rare",
          colors: { primary: "#8B5CF6", secondary: "#7C3AED", accent: "#A78BFA" }
        }
      },
      {
        name: "Golden Hour Theme",
        description: "Luxurious golds for dedicated students who've earned their stripes",
        price: 300,
        category: "customization",
        type: "theme",
        icon: "✨",
        requirements: { tasks_completed: 25, current_streak: 5 },
        metadata: { 
          theme_id: "golden-hour",
          rarity: "legendary",
          colors: { primary: "#F59E0B", secondary: "#D97706", accent: "#FCD34D" }
        }
      },
      {
        name: "Cherry Blossom Theme",
        description: "Soft pinks that bring zen to your studies",
        price: 200,
        category: "customization",
        type: "theme",
        icon: "🌸",
        requirements: { tasks_completed: 20, current_streak: 3 },
        metadata: { 
          theme_id: "cherry-blossom",
          rarity: "epic",
          colors: { primary: "#EC4899", secondary: "#DB2777", accent: "#F472B6" }
        }
      },

      // PROFILE CUSTOMIZATION
      {
        name: "Profile Badge: Early Bird",
        description: "Show off your early morning productivity",
        price: 150,
        category: "badge",
        type: "profile",
        icon: "🐦",
        metadata: { badge: "early_bird" }
      },
      {
        name: "Profile Badge: Night Owl",
        description: "Badge for late-night studiers",
        price: 150,
        category: "badge",
        type: "profile",
        icon: "🦉",
        metadata: { badge: "night_owl" }
      },
      {
        name: "Profile Badge: Streak Master",
        description: "Show your dedication to consistency",
        price: 200,
        category: "badge",
        type: "profile",
        icon: "🔥",
        metadata: { badge: "streak_master" }
      },

      // PRODUCTIVITY BOOSTS
      {
        name: "Extra Reminder Slot",
        description: "Add one more reminder to your daily limit",
        price: 300,
        category: "productivity",
        type: "feature",
        icon: "⏰",
        metadata: { feature: "extra_reminder" }
      },
      {
        name: "Priority Task Highlight",
        description: "Highlight your most important tasks",
        price: 250,
        category: "productivity",
        type: "feature",
        icon: "⭐",
        metadata: { feature: "priority_highlight" }
      },
      {
        name: "Custom Study Music",
        description: "Unlock ambient study music playlist",
        price: 400,
        category: "productivity",
        type: "feature",
        icon: "🎵",
        metadata: { feature: "study_music" }
      },

      // CELEBRATION ITEMS
      {
        name: "Confetti Celebration",
        description: "Extra confetti when completing tasks",
        price: 200,
        category: "celebration",
        type: "effect",
        icon: "🎉",
        metadata: { effect: "confetti" }
      },
      {
        name: "Fireworks Celebration",
        description: "Fireworks for major achievements",
        price: 500,
        category: "celebration",
        type: "effect",
        icon: "🎆",
        metadata: { effect: "fireworks" }
      },

      // SOCIAL FEATURES
      {
        name: "Custom Status Message",
        description: "Set a custom status for friends to see",
        price: 350,
        category: "social",
        type: "feature",
        icon: "💭",
        metadata: { feature: "custom_status" }
      },
      {
        name: "Friend Request Boost",
        description: "Send unlimited friend requests",
        price: 300,
        category: "social",
        type: "feature",
        icon: "👥",
        metadata: { feature: "unlimited_friends" }
      },

      // PREMIUM FEATURES
      {
        name: "Advanced Analytics",
        description: "Detailed insights into your study patterns",
        price: 1000,
        category: "premium",
        type: "feature",
        icon: "📊",
        metadata: { feature: "analytics" }
      },
      {
        name: "Export Data",
        description: "Export your tasks and progress to CSV",
        price: 800,
        category: "premium",
        type: "feature",
        icon: "📤",
        metadata: { feature: "export_data" }
      },

      // SPECIAL ITEMS
      {
        name: "Golden Crown",
        description: "Legendary status symbol (very rare!)",
        price: 5000,
        category: "legendary",
        type: "cosmetic",
        icon: "👑",
        metadata: { rarity: "legendary" }
      },
      {
        name: "Diamond Badge",
        description: "Ultimate achievement badge",
        price: 10000,
        category: "legendary",
        type: "badge",
        icon: "💎",
        metadata: { rarity: "legendary" }
      }
    ];

    // Check existing items
    const { data: existingItems } = await supabaseServerAdmin
      .from('shop_items')
      .select('name');

    const existingNames = existingItems?.map(item => item.name) || [];
    const newItems = shopItems.filter(item => !existingNames.includes(item.name));

    if (newItems.length === 0) {
      return NextResponse.json({ 
        message: 'All shop items already exist',
        existingCount: existingNames.length,
        totalDefined: shopItems.length
      });
    }

    // Insert new shop items
    const { data: insertedItems, error } = await supabaseServerAdmin
      .from('shop_items')
      .insert(newItems)
      .select();

    if (error) {
      console.error('Error inserting shop items:', error);
      return NextResponse.json({ error: 'Failed to insert shop items' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `🛍️ Successfully populated ${newItems.length} shop items!`,
      newCount: newItems.length,
      existingCount: existingNames.length,
      totalCount: existingNames.length + newItems.length,
      categories: {
        customization: shopItems.filter(item => item.category === 'customization').length,
        badge: shopItems.filter(item => item.category === 'badge').length,
        productivity: shopItems.filter(item => item.category === 'productivity').length,
        celebration: shopItems.filter(item => item.category === 'celebration').length,
        social: shopItems.filter(item => item.category === 'social').length,
        premium: shopItems.filter(item => item.category === 'premium').length,
        legendary: shopItems.filter(item => item.category === 'legendary').length
      },
      priceRange: {
        min: Math.min(...shopItems.map(item => item.price)),
        max: Math.max(...shopItems.map(item => item.price))
      }
    });

  } catch (error) {
    console.error('Error populating shop items:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 