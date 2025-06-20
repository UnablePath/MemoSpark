// ADMIN PAGE COMMENTED OUT FOR PRODUCTION

/* 
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trophy, Rocket, Star } from 'lucide-react';

export default function AdminPage() {
  const [isPopulating, setIsPopulating] = useState(false);
  const [populationResult, setPopulationResult] = useState<any>(null);
  const [isPopulatingShop, setIsPopulatingShop] = useState(false);
  const [shopResult, setShopResult] = useState<any>(null);

  const populateAchievements = async () => {
    setIsPopulating(true);
    try {
      const response = await fetch('/api/admin/achievements/populate', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setPopulationResult(result);
        toast.success('🎉 Launch achievements populated successfully!');
      } else {
        toast.error('Failed to populate achievements');
      }
    } catch (error) {
      console.error('Error populating achievements:', error);
      toast.error('Error occurred while populating achievements');
    } finally {
      setIsPopulating(false);
    }
  };

  const populateShopItems = async () => {
    setIsPopulatingShop(true);
    try {
      const response = await fetch('/api/admin/shop-items/populate', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setShopResult(result);
        toast.success('🛍️ Shop items populated successfully!');
      } else {
        toast.error('Failed to populate shop items');
      }
    } catch (error) {
      console.error('Error populating shop items:', error);
      toast.error('Error occurred while populating shop items');
    } finally {
      setIsPopulatingShop(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Rocket className="h-8 w-8 text-primary" />
            MemoSpark Launch Setup
          </h1>
          <p className="text-muted-foreground mt-2">
            Populate 50 achievements for tomorrow's launch
          </p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Launch Competition Ready
            </CardTitle>
            <CardDescription>
              First person to reach 200 points wins a gift! First 10 achievements = 205 points.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>🎉 Welcome to MemoSpark!</span>
                <Badge variant="outline">10 pts</Badge>
              </div>
              <div className="flex justify-between">
                <span>🎮 Bubble Pop Champion</span>
                <Badge variant="outline">10 pts</Badge>
              </div>
              <div className="flex justify-between">
                <span>🔥 Streak Starter</span>
                <Badge variant="outline">15 pts</Badge>
              </div>
              <div className="text-xs text-muted-foreground">+ 47 more achievements...</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Populate Launch Achievements</CardTitle>
            <CardDescription>
              Add all 50 achievements to your database for launch day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={populateAchievements} 
              disabled={isPopulating}
              size="lg"
              className="w-full"
            >
              {isPopulating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Populating...
                </>
              ) : (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  Populate 50 Launch Achievements
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Populate Shop Items</CardTitle>
            <CardDescription>
              Add reward shop items for users to spend their coins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={populateShopItems} 
              disabled={isPopulatingShop}
              size="lg"
              className="w-full"
              variant="outline"
            >
              {isPopulatingShop ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Populating...
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  Populate Shop Items
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {populationResult && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <Star className="h-5 w-5" />
                Success!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-green-700">
                <p>✅ Added {populationResult.newCount} new achievements</p>
                <p>✅ Total: {populationResult.totalCount} achievements</p>
                <p>✅ First 10 achievements: {populationResult.first10Points} points</p>
                <p>✅ Ready for launch competition!</p>
              </div>
            </CardContent>
          </Card>
        )}

        {shopResult && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <Star className="h-5 w-5" />
                Shop Ready!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-blue-700">
                <p>🛍️ Added {shopResult.newCount} new shop items</p>
                <p>🛍️ Total: {shopResult.totalCount} shop items</p>
                <p>🛍️ Users can now spend their coins!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 
*/

// Redirect admin access in production
export default function AdminPage() {
  return (
    <div className="container mx-auto p-6 max-w-md text-center">
      <h1 className="text-2xl font-bold mb-4">Admin Access Disabled</h1>
      <p className="text-muted-foreground">
        Admin functionality has been disabled for production.
      </p>
    </div>
  );
}