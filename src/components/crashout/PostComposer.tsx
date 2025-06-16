'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Smile, Tag, X } from 'lucide-react';
import { CrashoutPostInput } from '@/lib/supabase/crashoutApi';

interface PostComposerProps {
  onPost: (post: CrashoutPostInput) => Promise<void>;
}

const MOOD_OPTIONS = [
  { type: 'stressed', emoji: '😤', label: 'STRESSED AF' },
  { type: 'overwhelmed', emoji: '😵‍💫', label: 'OVERWHELMED' },
  { type: 'frustrated', emoji: '🤬', label: 'FRUSTRATED' },
  { type: 'anxious', emoji: '😬', label: 'ANXIOUS' },
  { type: 'sad', emoji: '😢', label: 'SAD' },
  { type: 'angry', emoji: '😡', label: 'ANGRY' },
  { type: 'exhausted', emoji: '😴', label: 'EXHAUSTED' },
  { type: 'excited', emoji: '🤩', label: 'EXCITED' },
  { type: 'calm', emoji: '😌', label: 'CALM' }
];

export const PostComposer: React.FC<PostComposerProps> = ({ onPost }) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsLoading(true);
    try {
      const selectedMoodObj = MOOD_OPTIONS.find(m => m.type === selectedMood);
      
      await onPost({
        content: content.trim(),
        title: title.trim() || undefined,
        mood_type: selectedMood || undefined,
        mood_emoji: selectedMoodObj?.emoji || undefined,
        is_private: isPrivate,
        tags: tags.length > 0 ? tags : undefined
      });
      
      // Reset form
      setContent('');
      setTitle('');
      setSelectedMood('');
      setTags([]);
      setTagInput('');
    } catch (error) {
      console.error('Error posting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const selectedMoodObj = MOOD_OPTIONS.find(m => m.type === selectedMood);

  return (
    <Card className="w-full bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-xl">
      <CardContent className="p-6">
        {/* Header with Privacy Toggle */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Crashout Composer</h3>
          <div className="flex items-center space-x-2">
            {isPrivate ? (
              <Lock className="h-4 w-4 text-purple-400" />
            ) : (
              <Unlock className="h-4 w-4 text-green-400" />
            )}
            <span className="text-sm text-gray-300">
              {isPrivate ? 'Private' : 'Public'}
            </span>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              className="data-[state=checked]:bg-purple-600"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Optional Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
            disabled={isLoading}
          />

          {/* Content Textarea */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's crashing on your mind today? 🔥"
            className="min-h-[120px] bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 resize-none"
            disabled={isLoading}
          />

          {/* Mood Selector */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMoodSelector(!showMoodSelector)}
                className="bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600"
              >
                <Smile className="h-4 w-4 mr-1" />
                {selectedMoodObj ? `${selectedMoodObj.emoji} ${selectedMoodObj.label}` : 'Select Mood'}
              </Button>
              {selectedMood && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMood('')}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {showMoodSelector && (
              <div className="grid grid-cols-3 gap-2 p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                {MOOD_OPTIONS.map((mood) => (
                  <Button
                    key={mood.type}
                    type="button"
                    variant={selectedMood === mood.type ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedMood(mood.type);
                      setShowMoodSelector(false);
                    }}
                    className={`justify-start text-xs ${
                      selectedMood === mood.type 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span className="mr-1">{mood.emoji}</span>
                    {mood.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Tags Input */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder="Add tags (press Enter)"
                className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                disabled={isLoading}
              />
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-purple-600/20 text-purple-300 border-purple-500/30"
                  >
                    #{tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTag(tag)}
                      className="ml-1 h-auto p-0 text-purple-300 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Public Posting Awareness Notice */}
          {!isPrivate && content.trim() && (
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 flex items-start space-x-2">
              <div className="text-blue-400 mt-0.5">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm text-blue-300">
                <p className="font-medium">You're sharing this publicly!</p>
                <p className="text-blue-200/80 text-xs mt-1">
                  Other students can see and react to this post. You'll have <strong>10 seconds</strong> to delete it if you change your mind.
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <Button 
              type="submit" 
              disabled={!content.trim() || isLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-2 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Posting...</span>
                </div>
              ) : (
                'Post Crashout 🔥'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 