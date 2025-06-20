'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Trophy, Zap, Crown, Star, Rocket } from 'lucide-react';

export default function LaunchSetupPage() {
  const [isPopulating, setIsPopulating] = useState(false);
  const [populationResult, setPopulationResult] = useState<any>(null);

  const populateAchievements = async () => {
    setIsPopulating(true);
    try {
      const response = await fetch('/api/admin/achievements/populate', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setPopulationResult(result);
        toast.success('🎉 Launch achievements populated successfully!', {
          description: `Added ${result.newCount} new achievements. Ready for launch!`
        });
      } else {
        toast.error('Failed to populate achievements', {
          description: result.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      console.error('Error populating achievements:', error);
      toast.error('Error occurred while populating achievements');
    } finally {
      setIsPopulating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Rocket className="h-8 w-8 text-primary" />
            MemoSpark Launch Setup
          </h1>
          <p className="text-muted-foreground mt-2">
            Prepare your app for launch with 50 carefully designed achievements
          </p>
        </div>

        {/* Launch Competition Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Launch Competition Ready
            </CardTitle>
            <CardDescription>
              First person to reach 200 points wins a gift! 
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Competition Details:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• First 10 achievements = 205 points</li>
                  <li>• Encourages full app exploration</li>
                  <li>• Perfect for launch day engagement</li>
                  <li>• Balanced for fair competition</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Achievement Categories:</h4>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">Starter (10)</Badge>
                  <Badge variant="secondary" className="text-xs">Common (10)</Badge>
                  <Badge variant="secondary" className="text-xs">Uncommon (10)</Badge>
                  <Badge variant="secondary" className="text-xs">Rare (10)</Badge>
                  <Badge variant="secondary" className="text-xs">Epic (10)</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievement Examples */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-4 w-4 text-green-500" />
                Starter Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <div className="flex justify-between">
                  <span>🎉 Welcome to MemoSpark!</span>
                  <Badge variant="outline">10pts</Badge>
                </div>
                <div className="flex justify-between">
                  <span>🎮 Bubble Pop Champion</span>
                  <Badge variant="outline">10pts</Badge>
                </div>
                <div className="flex justify-between">
                  <span>🔥 Streak Starter</span>
                  <Badge variant="outline">15pts</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  + 7 more starter achievements
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                Common Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <div className="flex justify-between">
                  <span>🗂️ Dashboard Master</span>
                  <Badge variant="outline">15pts</Badge>
                </div>
                <div className="flex justify-between">
                  <span>🦋 Social Butterfly</span>
                  <Badge variant="outline">10pts</Badge>
                </div>
                <div className="flex justify-between">
                  <span>🦉 Night Owl</span>
                  <Badge variant="outline">20pts</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  + 7 more exploration achievements
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-4 w-4 text-purple-500" />
                Epic Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <div className="flex justify-between">
                  <span>💯 Centurion</span>
                  <Badge variant="outline">1000pts</Badge>
                </div>
                <div className="flex justify-between">
                  <span>🏛️ Three Month Hero</span>
                  <Badge variant="outline">1000pts</Badge>
                </div>
                <div className="flex justify-between">
                  <span>🌟 MemoSpark Legend</span>
                  <Badge variant="outline">1500pts</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  + 7 more legendary achievements
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Populate Button */}
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
                  Populating Achievements...
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

        {/* Results */}
        {populationResult && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-green-800 dark:text-green-200 flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Achievements Successfully Populated!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Population Results:</h4>
                  <ul className="space-y-1 text-green-700 dark:text-green-300">
                    <li>• New achievements: {populationResult.newCount}</li>
                    <li>• Existing achievements: {populationResult.existingCount}</li>
                    <li>• Total achievements: {populationResult.totalCount}</li>
                    <li>• First 10 points: {populationResult.first10Points}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Competition Ready:</h4>
                  <div className="text-green-700 dark:text-green-300">
                    {populationResult.competitionNote && (
                      <p className="text-xs">{populationResult.competitionNote}</p>
                    )}
                    <Badge className="mt-2 bg-green-600 hover:bg-green-700">
                      ✅ Launch Ready!
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Launch Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Launch Checklist</CardTitle>
            <CardDescription>
              Ensure everything is ready for tomorrow's launch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${populationResult ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className={populationResult ? 'text-green-700 dark:text-green-300' : ''}>
                  50 achievements populated
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-green-700 dark:text-green-300">
                  BubblePopGame added to homepage
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-green-700 dark:text-green-300">
                  StudySpark → MemoSpark branding updated
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-green-700 dark:text-green-300">
                  Console logs secured (no sensitive data)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-green-700 dark:text-green-300">
                  TypeScript compilation passes
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 