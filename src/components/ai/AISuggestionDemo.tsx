'use client';

import type React from 'react';
import { useState } from 'react';
import { SuggestionCard, SuggestionList, QuickActions } from './index';
import type { AISuggestion } from '@/types/ai';

// Sample AI suggestions for demonstration
const sampleSuggestions: AISuggestion[] = [
  {
    id: '1',
    type: 'study_time',
    title: 'Start your morning study session',
    description: 'Based on your patterns, you\'re most productive between 9-11 AM. Start with Mathematics for optimal focus.',
    priority: 'high',
    confidence: 0.85,
    reasoning: 'Your completion rate is 23% higher during morning hours, and you haven\'t studied Mathematics in 3 days.',
    duration: 90,
    subject: 'Mathematics',
    metadata: {
      category: 'productivity',
      tags: ['morning', 'mathematics', 'focus'],
      difficulty: 6,
      estimatedBenefit: 0.75,
      requiredAction: 'immediate'
    },
    createdAt: new Date().toISOString(),
    acceptanceStatus: 'pending'
  },
  {
    id: '2',
    type: 'break_reminder',
    title: 'Take a mindful break',
    description: 'You\'ve been studying for 45 minutes. A 10-minute break will help maintain your focus and prevent burnout.',
    priority: 'medium',
    confidence: 0.92,
    reasoning: 'Research shows that breaks every 45-50 minutes improve retention by 15% and reduce mental fatigue.',
    duration: 10,
    metadata: {
      category: 'wellness',
      tags: ['break', 'mindfulness', 'focus'],
      estimatedBenefit: 0.6,
      requiredAction: 'immediate'
    },
    createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    acceptanceStatus: 'pending'
  },
  {
    id: '3',
    type: 'difficulty_adjustment',
    title: 'Try a more challenging Physics problem',
    description: 'You\'ve mastered the current difficulty level. Moving to harder problems will accelerate your learning.',
    priority: 'medium',
    confidence: 0.68,
    reasoning: 'Your success rate on current Physics problems is 89%. Increasing difficulty by one level is optimal for growth.',
    duration: 30,
    subject: 'Physics',
    metadata: {
      category: 'academic',
      tags: ['physics', 'difficulty', 'growth'],
      difficulty: 7,
      estimatedBenefit: 0.8,
      requiredAction: 'scheduled'
    },
    createdAt: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    acceptanceStatus: 'pending'
  },
  {
    id: '4',
    type: 'subject_focus',
    title: 'Review Chemistry concepts',
    description: 'Your Chemistry performance has declined 12% this week. A focused review session could help.',
    priority: 'low',
    confidence: 0.71,
    reasoning: 'Pattern analysis shows Chemistry scores dropping. Early intervention prevents larger knowledge gaps.',
    duration: 45,
    subject: 'Chemistry',
    metadata: {
      category: 'academic',
      tags: ['chemistry', 'review', 'performance'],
      difficulty: 5,
      estimatedBenefit: 0.65,
      requiredAction: 'optional'
    },
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    acceptanceStatus: 'pending'
  }
];

export const AISuggestionDemo: React.FC = () => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>(sampleSuggestions);
  const [isLoading, setIsLoading] = useState(false);

  const handleAcceptSuggestion = (id: string) => {
    setSuggestions(prev => 
      prev.map(s => 
        s.id === id 
          ? { ...s, acceptanceStatus: 'accepted' as const, respondedAt: new Date().toISOString() }
          : s
      )
    );
    console.log('Accepted suggestion:', id);
  };

  const handleRejectSuggestion = (id: string) => {
    setSuggestions(prev => 
      prev.map(s => 
        s.id === id 
          ? { ...s, acceptanceStatus: 'rejected' as const, respondedAt: new Date().toISOString() }
          : s
      )
    );
    console.log('Rejected suggestion:', id);
  };

  const handleQuickAction = (actionType: string, actionData?: any) => {
    console.log('Quick action triggered:', actionType, actionData);
    
    // Simulate action processing
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      
      // If it's a suggestion-based action, mark it as accepted
      if (actionData?.suggestionId) {
        handleAcceptSuggestion(actionData.suggestionId);
      }
    }, 1000);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Reset suggestions to pending state
      setSuggestions(prev => 
        prev.map(s => ({ ...s, acceptanceStatus: 'pending' as const }))
      );
    }, 1500);
  };

  const pendingSuggestions = suggestions.filter(s => s.acceptanceStatus === 'pending');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">AI Suggestion Components Demo</h1>
        <p className="text-muted-foreground">
          Interactive demonstration of MemoSpark's AI suggestion system
        </p>
      </div>

      {/* Quick Actions Demo */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="p-4 border rounded-lg bg-card">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Default Layout</h3>
              <QuickActions
                onActionClick={handleQuickAction}
                suggestions={pendingSuggestions}
                isLoading={isLoading}
              />
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Compact Layout</h3>
              <QuickActions
                onActionClick={handleQuickAction}
                suggestions={pendingSuggestions}
                isLoading={isLoading}
                compact
                maxActions={6}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Individual Suggestion Cards Demo */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Individual Suggestion Cards</h2>
        <div className="grid gap-4">
          {pendingSuggestions.slice(0, 2).map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onAccept={handleAcceptSuggestion}
              onReject={handleRejectSuggestion}
              showReasoning
            />
          ))}
        </div>
      </section>

      {/* Compact Cards Demo */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Compact Cards</h2>
        <div className="space-y-2">
          {pendingSuggestions.slice(0, 3).map((suggestion) => (
            <SuggestionCard
              key={`compact-${suggestion.id}`}
              suggestion={suggestion}
              onAccept={handleAcceptSuggestion}
              onReject={handleRejectSuggestion}
              compact
            />
          ))}
        </div>
      </section>

      {/* Suggestion List Demo */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Suggestion List with Filters</h2>
        <SuggestionList
          suggestions={suggestions}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          onRefresh={handleRefresh}
          showFilters
          showReasoning
          isLoading={isLoading}
          collapsible
          headerStyle="highlighted"
          title="Your AI Suggestions"
          emptyMessage="No suggestions available. Try completing some tasks to get personalized recommendations!"
        />
      </section>

      {/* Grid Layout Demo */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Grid Layout</h2>
        <SuggestionList
          suggestions={pendingSuggestions}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          layout="grid"
          showHeader={false}
          className="max-h-96 overflow-y-auto"
        />
      </section>

      {/* Stats */}
      <section className="p-4 bg-muted/30 rounded-lg">
        <h3 className="font-medium mb-2">Demo Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium text-primary">
              {suggestions.filter(s => s.acceptanceStatus === 'accepted').length}
            </div>
            <div className="text-muted-foreground">Accepted</div>
          </div>
          <div>
            <div className="font-medium text-destructive">
              {suggestions.filter(s => s.acceptanceStatus === 'rejected').length}
            </div>
            <div className="text-muted-foreground">Rejected</div>
          </div>
          <div>
            <div className="font-medium text-orange-500">
              {pendingSuggestions.length}
            </div>
            <div className="text-muted-foreground">Pending</div>
          </div>
          <div>
            <div className="font-medium">
              {suggestions.filter(s => s.priority === 'high').length}
            </div>
            <div className="text-muted-foreground">High Priority</div>
          </div>
        </div>
      </section>
    </div>
  );
}; 