'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FaTrophy, FaShoppingCart, FaCoins, FaUsers, FaStar, FaGift } from 'react-icons/fa';
import { Progress } from "@/components/ui/progress";

// Mock data (replace with actual data later)
const mockUserStats = {
  points: 1250,
  coins: 300,
  rank: 5,
  nextTier: "Gold",
  progressToNextTier: 60, // percentage
};

const mockLeaderboard = [
  { id: "usr1", name: "Alex J.", points: 2500, rank: 1 },
  { id: "usr2", name: "Morgan L.", points: 2200, rank: 2 },
  { id: "usr3", name: "Taylor K.", points: 1800, rank: 3 },
  { id: "usr4", name: "User You", points: mockUserStats.points, rank: mockUserStats.rank, isCurrentUser: true },
  { id: "usr5", name: "Jordan S.", points: 1100, rank: 6 },
];

const mockShopItems = [
  { id: "item1", name: "Exclusive Avatar Frame", cost: 150, icon: <FaStar className="w-8 h-8 text-yellow-400" /> },
  { id: "item2", name: "Profile Badge: 'Motivator'", cost: 100, icon: <FaTrophy className="w-8 h-8 text-orange-400" /> },
  { id: "item3", name: "Study Timer Skin", cost: 200, icon: <FaGift className="w-8 h-8 text-purple-400" /> },
];

const mockAchievements = [
    { id: "ach1", name: "Streak Starter", description: "Maintain a 3-day study streak.", earned: true, icon: "🔥" },
    { id: "ach2", name: "Task Master", description: "Complete 20 tasks.", earned: true, icon: "✔️" },
    { id: "ach3", name: "Social Butterfly", description: "Connect with 5 users.", earned: false, icon: "🤝" },
    { id: "ach4", name: "Night Owl", description: "Study past midnight 3 times.", earned: true, icon: "🦉" },
];

const GamificationHub = () => {
  return (
    <div className="p-4 md:p-6 space-y-6 h-full overflow-y-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gamification Hub</h1>
        <p className="text-muted-foreground">Track your progress, compete, and unlock rewards!</p>
      </header>

      {/* User Stats & Coin Economy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><FaCoins className="mr-2 h-5 w-5 text-yellow-500" /> Your Stash</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Points</p>
            <p className="text-2xl font-semibold">{mockUserStats.points}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Coins</p>
            <p className="text-2xl font-semibold">{mockUserStats.coins}</p>
          </div>
           <div className="p-3 bg-muted/50 rounded-lg text-center col-span-2 md:col-span-1">
            <p className="text-sm text-muted-foreground">Leaderboard Rank</p>
            <p className="text-2xl font-semibold">#{mockUserStats.rank}</p>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><FaUsers className="mr-2 h-5 w-5 text-blue-500" /> Leaderboard</CardTitle>
          <CardDescription>See how you stack up against other MemoSpark users!</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {mockLeaderboard.slice(0, 5).map(user => (
              <li key={user.id} className={`flex items-center justify-between p-3 rounded-md ${user.isCurrentUser ? 'bg-primary/10 border border-primary' : 'bg-muted/50'}`}>
                <div className="flex items-center">
                  <span className={`font-semibold w-6 text-center ${user.rank <= 3 ? 'text-orange-500' : 'text-muted-foreground'}`}>{user.rank}.</span>
                  <span className={`ml-2 font-medium ${user.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>{user.name}</span>
                </div>
                <span className={`font-semibold ${user.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>{user.points} pts</span>
              </li>
            ))}
          </ul>
          <Button variant="link" className="mt-3 px-0">View Full Leaderboard</Button>
        </CardContent>
      </Card>

      {/* Achievement Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><FaTrophy className="mr-2 h-5 w-5 text-amber-500" /> Achievements</CardTitle>
          <CardDescription>Unlock achievements by completing milestones.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {mockAchievements.map(ach => (
                    <div key={ach.id} title={`${ach.name} - ${ach.description}`} className={`p-3 border rounded-lg flex flex-col items-center text-center ${ach.earned ? 'border-green-500 bg-green-500/10' : 'border-border bg-muted/30 opacity-70'}`}>
                        <span className="text-3xl mb-1">{ach.icon}</span>
                        <p className={`text-xs font-semibold ${ach.earned ? 'text-green-700' : 'text-muted-foreground'}`}>{ach.name}</p>
                        {ach.earned && <span className="text-xs text-green-600">(Earned!)</span>}
                    </div>
                ))}
            </div>
             <Button variant="link" className="mt-3 px-0">View All Achievements</Button>
        </CardContent>
      </Card>

      {/* Virtual Shop Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><FaShoppingCart className="mr-2 h-5 w-5 text-green-500" /> Virtual Shop</CardTitle>
          <CardDescription>Spend your coins on cool virtual items!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {mockShopItems.map(item => (
              <div key={item.id} className="p-4 border rounded-lg flex flex-col items-center text-center bg-muted/30 hover:bg-muted/60 transition-colors">
                <div className="text-4xl mb-2">{item.icon}</div>
                <p className="font-semibold mb-1 text-sm text-foreground">{item.name}</p>
                <div className="flex items-center text-yellow-600 mb-2">
                  <FaCoins className="mr-1 h-4 w-4" />
                  <span className="font-bold">{item.cost}</span>
                </div>
                <Button size="sm" variant="outline">Get Item</Button>
              </div>
            ))}
          </div>
          <Button variant="link" className="mt-3 px-0">Visit Full Shop</Button>
        </CardContent>
      </Card>
      
      {/* Reward Tiers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><FaStar className="mr-2 h-5 w-5 text-purple-500" /> Reward Tiers</CardTitle>
          <CardDescription>Level up through tiers by earning points.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-1">Current Tier: <span className="font-semibold text-primary">Bronze</span></p>
          <p className="text-sm mb-2">Next Tier: <span className="font-semibold text-purple-500">{mockUserStats.nextTier}</span> ({mockUserStats.points} / 2000 points)</p>
          <Progress value={mockUserStats.progressToNextTier} className="w-full h-3 bg-muted" aria-label={`Progress to ${mockUserStats.nextTier} tier`} />
          <Button variant="link" className="mt-3 px-0">Learn More About Tiers</Button>
        </CardContent>
      </Card>

    </div>
  );
};

export default GamificationHub; 