"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Heart, 
  Save, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  BookOpen, 
  Brain, 
  TrendingUp,
  Star,
  Calendar,
  Clock,
  Tag,
  Lightbulb,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { CrashoutJournal, JournalEntry, WritingPrompt, MoodType, MoodAnalytics } from '@/lib/services/CrashoutJournal';
import { supabase } from '@/lib/supabase/client';

// Mood configuration
const MOOD_CONFIG = {
  stressed: { 
    emoji: '😰', 
    color: 'bg-red-100 text-red-800 border-red-200',
    label: 'Stressed' 
  },
  overwhelmed: { 
    emoji: '🌪️', 
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    label: 'Overwhelmed' 
  },
  frustrated: { 
    emoji: '😤', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    label: 'Frustrated' 
  },
  anxious: { 
    emoji: '😟', 
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    label: 'Anxious' 
  },
  sad: { 
    emoji: '😢', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'Sad' 
  },
  exhausted: { 
    emoji: '😴', 
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    label: 'Exhausted' 
  },
};

interface JournalEditorProps {
  onEntrySaved?: (entry: JournalEntry) => void;
  editingEntry?: JournalEntry | null;
  onCancelEdit?: () => void;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  onEntrySaved,
  editingEntry,
  onCancelEdit,
}) => {
  const { user } = useUser();
  const [crashoutJournal] = useState(() => new CrashoutJournal(supabase!));

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodType>('stressed');
  const [moodIntensity, setMoodIntensity] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<WritingPrompt | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Data state
  const [prompts, setPrompts] = useState<WritingPrompt[]>([]);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [analytics, setAnalytics] = useState<MoodAnalytics | null>(null);

  // UI state
  const [showPrompts, setShowPrompts] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Define loadInitialData function first
  const loadInitialData = useCallback(async () => {
    if (!user) return;

    try {
      const [promptsData, userTagsData, entriesData, analyticsData] = await Promise.all([
        crashoutJournal.getWritingPrompts(),
        crashoutJournal.getUniqueTagsForUser(user.id),
        crashoutJournal.getUserEntries(user.id, { limit: 5 }),
        crashoutJournal.getMoodInsights(user.id, 7),
      ]);

      setPrompts(promptsData);
      setUserTags(userTagsData);
      setRecentEntries(entriesData.entries);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load journal data');
    }
  }, [user, crashoutJournal]);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user, loadInitialData]);

  // Load editing entry data
  useEffect(() => {
    if (editingEntry) {
      setTitle(editingEntry.title || '');
      setContent(editingEntry.content);
      setMood(editingEntry.mood);
      setMoodIntensity(editingEntry.mood_intensity);
      setTags(editingEntry.tags);
      setSelectedPrompt(null); // Don't load prompt for editing
    } else {
      resetForm();
    }
  }, [editingEntry]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setMood('stressed');
    setMoodIntensity(5);
    setTags([]);
    setNewTag('');
    setSelectedPrompt(null);
  };

  const handleSave = async () => {
    if (!user || !content.trim()) {
      toast.error('Please write something in your journal');
      return;
    }

    setIsLoading(true);
    
    try {
      let savedEntry: JournalEntry;

      if (editingEntry) {
        savedEntry = await crashoutJournal.updateEntry(editingEntry.id, {
          title: title.trim() || undefined,
          content: content.trim(),
          mood,
          mood_intensity: moodIntensity,
          tags,
        });
        toast.success('Journal entry updated!');
      } else {
        savedEntry = await crashoutJournal.createEntry(
          user.id,
          content.trim(),
          mood,
          moodIntensity,
          title.trim() || undefined,
          tags,
          selectedPrompt?.id
        );
        toast.success('Journal entry saved!');
      }

      onEntrySaved?.(savedEntry);
      
      if (!editingEntry) {
        resetForm();
        // Refresh recent entries and analytics
        loadInitialData();
      }
    } catch (error) {
      console.error('Failed to save entry:', error);
      toast.error('Failed to save journal entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleUsePrompt = (prompt: WritingPrompt) => {
    setSelectedPrompt(prompt);
    setContent(prev => {
      if (prev.trim()) {
        return prev + '\n\n' + prompt.prompt_text;
      }
      return prompt.prompt_text;
    });
    setShowPrompts(false);
    toast.success('Writing prompt added!');
  };

  const getRandomPrompt = async () => {
    try {
      const randomPrompt = await crashoutJournal.getRandomPrompt(mood);
      if (randomPrompt) {
        handleUsePrompt(randomPrompt);
      } else {
        toast.error('No prompts found for this mood');
      }
    } catch (error) {
      console.error('Failed to get random prompt:', error);
      toast.error('Failed to get writing prompt');
    }
  };

  const moodConfig = MOOD_CONFIG[mood];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {editingEntry ? 'Edit Journal Entry' : 'Private Crashout Journal'}
          </h1>
          <p className="text-gray-600 mt-1">
            A safe space to process your academic stress and emotions
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showPrompts} onOpenChange={setShowPrompts}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Lightbulb className="h-4 w-4 mr-2" />
                Writing Prompts
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Writing Prompts</DialogTitle>
              </DialogHeader>
              <WritingPromptsDialog 
                prompts={prompts}
                onUsePrompt={handleUsePrompt}
                currentMood={mood}
                onGetRandom={getRandomPrompt}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Insights
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Your Journal Insights</DialogTitle>
              </DialogHeader>
              {analytics && <AnalyticsDialog analytics={analytics} />}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Journal Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Title (Optional)
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your entry a title..."
                  className="w-full"
                />
              </div>

              {/* Mood Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  How are you feeling?
                </label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {Object.entries(MOOD_CONFIG).map(([moodKey, config]) => (
                    <Button
                      key={moodKey}
                      variant={mood === moodKey ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMood(moodKey as MoodType)}
                      className="justify-start h-auto p-3"
                    >
                      <span className="text-lg mr-2">{config.emoji}</span>
                      <span className="text-xs">{config.label}</span>
                    </Button>
                  ))}
                </div>

                {/* Mood Intensity */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">
                    Intensity:
                  </label>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-gray-500">1</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={moodIntensity}
                      onChange={(e) => setMoodIntensity(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">10</span>
                    <Badge className={moodConfig.color}>
                      {moodIntensity}/10
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  What's on your mind?
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write about what's stressing you out, your feelings, or anything else on your mind..."
                  className="min-h-[200px] w-full"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-500">
                    {content.length} characters
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={getRandomPrompt}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Get inspiration
                  </Button>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <button className="ml-1 hover:text-red-600">×</button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button size="sm" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {userTags.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Your tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {userTags.map((tag) => (
                        <Button
                          key={tag}
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => !tags.includes(tag) && setTags([...tags, tag])}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={isLoading || !content.trim()}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : editingEntry ? 'Update Entry' : 'Save Entry'}
                </Button>
                {editingEntry && (
                  <Button variant="outline" onClick={onCancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Recent Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-4 w-4" />
                Recent Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentEntries.length > 0 ? (
                <div className="space-y-3">
                  {recentEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">
                          {MOOD_CONFIG[entry.mood].emoji}
                        </span>
                        <span className="text-sm font-medium">
                          {entry.title || 'Untitled'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {entry.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No entries yet</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-4 w-4" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Entries this week:</span>
                  <span className="font-medium">{analytics.total_entries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current streak:</span>
                  <span className="font-medium">{analytics.streak_info.current_streak} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg. intensity:</span>
                  <span className="font-medium">{analytics.average_intensity.toFixed(1)}/10</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Writing Prompts Dialog Component
const WritingPromptsDialog: React.FC<{
  prompts: WritingPrompt[];
  onUsePrompt: (prompt: WritingPrompt) => void;
  currentMood: MoodType;
  onGetRandom: () => void;
}> = ({ prompts, onUsePrompt, currentMood, onGetRandom }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const filteredPrompts = prompts.filter(prompt => {
    if (selectedCategory !== 'all' && prompt.category !== selectedCategory) {
      return false;
    }
    return prompt.mood_target.includes(currentMood);
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'stress_relief', label: 'Stress Relief' },
    { value: 'academic_pressure', label: 'Academic Pressure' },
    { value: 'social_anxiety', label: 'Social Anxiety' },
    { value: 'motivation', label: 'Motivation' },
    { value: 'self_reflection', label: 'Self Reflection' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={onGetRandom} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Random
        </Button>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className="cursor-pointer hover:bg-gray-50">
              <CardContent className="p-4">
                <p className="text-sm mb-2">{prompt.prompt_text}</p>
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="text-xs">
                    {prompt.category.replace('_', ' ')}
                  </Badge>
                  <Button 
                    size="sm" 
                    onClick={() => onUsePrompt(prompt)}
                  >
                    Use This
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// Analytics Dialog Component
const AnalyticsDialog: React.FC<{ analytics: MoodAnalytics }> = ({ analytics }) => {
  const moodEntries = Object.entries(analytics.mood_distribution || {});
  const totalMoodEntries = moodEntries.reduce((sum, [, count]) => sum + (Number(count) || 0), 0);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="mood" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mood">Mood Distribution</TabsTrigger>
          <TabsTrigger value="streaks">Streaks & Stats</TabsTrigger>
        </TabsList>
        
        <TabsContent value="mood" className="space-y-4">
          <div className="space-y-3">
            {moodEntries.map(([mood, count]) => {
              const config = MOOD_CONFIG[mood as MoodType];
              const numCount = Number(count) || 0;
              const percentage = totalMoodEntries > 0 ? (numCount / totalMoodEntries) * 100 : 0;
              
              return (
                <div key={mood} className="flex items-center gap-3">
                  <span className="text-lg">{config.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{config.label}</span>
                      <span className="text-sm text-gray-600">
                        {numCount} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="streaks" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.streak_info.current_streak}
                </div>
                <div className="text-sm text-gray-600">Current Streak</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.streak_info.longest_streak}
                </div>
                <div className="text-sm text-gray-600">Longest Streak</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.total_entries}
                </div>
                <div className="text-sm text-gray-600">Total Entries</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {analytics.average_intensity.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Avg. Intensity</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JournalEditor; 