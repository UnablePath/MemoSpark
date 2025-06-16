'use client';

import { RewardShop } from '@/components/gamification/RewardShop';

export default function TestRewardShopPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Reward Shop Test</h1>
      <RewardShop variant="full" />
    </div>
  );
} 