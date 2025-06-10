'use client'

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useUser } from '../user-context'; 
import { supabase, supabaseHelpers } from '../supabase/client';
import { PatternRecognitionEngine } from '../ai/patternEngine'; // Import the main engine
import type { AISuggestion } from '@/types/ai'; // Import AISuggestion from centralized types

// Updated AISuggestion Interface - REMOVED, using centralized type from @/types/ai

export interface UserAIPreferences { 
  user_id?: string; 
  learning_style?: string; 
  difficulty_preference?: number; 
  subject_interests?: string[];
  is_anonymous?: boolean;
  // Storing these nested in a JSONB column named 'ai_interaction_settings' in Supabase
  ai_interaction_settings?: {
    suggestionFrequency?: 'low' | 'medium' | 'high'; 
    enableStuInteractions?: boolean; 
  };
  created_at?: string;
  updated_at?: string;
}

const defaultUserAIPreferences: UserAIPreferences = {
  learning_style: 'adaptive',
  difficulty_preference: 5,
  subject_interests: [],
  is_anonymous: false,
  ai_interaction_settings: {
    suggestionFrequency: 'medium',
    enableStuInteractions: true,
  }
};

interface AIContextType {
  suggestions: AISuggestion[];
  isGenerating: boolean;
  userPreferences: UserAIPreferences;
  updateUserPreferences: (prefs: Partial<UserAIPreferences>) => void;
  acceptSuggestion: (suggestionId: string) => void;
  rejectSuggestion: (suggestionId: string) => void;
  generateAISuggestions: () => Promise<void>;
  syncUserPreferencesWithSupabase: (preferencesToSync: UserAIPreferences) => Promise<void>; // Updated signature
  fetchUserPreferencesFromSupabase: () => Promise<void>; 
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [userPreferences, setUserPreferences] = useLocalStorage<UserAIPreferences>(
    'memospark_ai_user_profiles', // Changed local storage key to reflect table
    defaultUserAIPreferences
  );
  // const { profile } = useUser(); // We might not need profile from UserContext if we fetch auth user directly
  const [authUserId, setAuthUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getAuthUser = async () => {
      if (!supabase) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuthUserId(user.id);
        } else {
          setAuthUserId(undefined); // Explicitly set to undefined if no user
        }
      } catch (error) {
        console.error("Error fetching auth user:", error);
        setAuthUserId(undefined);
      }
    };
    getAuthUser();
  }, []);

  // Pass supabase client to PatternRecognitionEngine constructor
  const patternEngine = useMemo(() => new PatternRecognitionEngine(supabase), [supabase]);

  const syncUserPreferencesWithSupabase = useCallback(async (preferencesToSync: UserAIPreferences) => {
    if (!authUserId || !supabase) return;
    console.log('Syncing user AI preferences to Supabase table ai_user_profiles for user:', authUserId, preferencesToSync);
    
    const dataToUpsert = { 
        learning_style: preferencesToSync.learning_style,
        difficulty_preference: preferencesToSync.difficulty_preference,
        subject_interests: preferencesToSync.subject_interests,
        is_anonymous: preferencesToSync.is_anonymous,
        ai_interaction_settings: preferencesToSync.ai_interaction_settings,
        user_id: authUserId, 
        updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('ai_user_profiles') 
        .upsert(dataToUpsert, { onConflict: 'user_id' }); 

      if (error) {
        supabaseHelpers.handleError(error, 'syncing AI user profile');
        throw error;
      }
    } catch (error) {
      console.error('Error in syncUserPreferencesWithSupabase:', error);
    }
  }, [authUserId]);

  const fetchUserPreferencesFromSupabase = useCallback(async () => {
    if (!authUserId || !supabase) return;
    console.log('Fetching user AI preferences from Supabase table ai_user_profiles for user:', authUserId);
    try {
      const { data, error } = await supabase
        .from('ai_user_profiles') 
        .select('*, ai_interaction_settings')
        .eq('user_id', authUserId)
        .single();

      if (error && error.code !== 'PGRST116') { 
        supabaseHelpers.handleError(error, 'fetching AI user profile');
        return;
      }
      if (data) {
        const fetchedPrefs: UserAIPreferences = {
            user_id: data.user_id,
            learning_style: data.learning_style,
            difficulty_preference: data.difficulty_preference,
            subject_interests: data.subject_interests,
            is_anonymous: data.is_anonymous,
            ai_interaction_settings: {
                suggestionFrequency: data.ai_interaction_settings?.suggestionFrequency || defaultUserAIPreferences.ai_interaction_settings?.suggestionFrequency,
                enableStuInteractions: data.ai_interaction_settings?.enableStuInteractions !== undefined 
                                        ? data.ai_interaction_settings.enableStuInteractions 
                                        : defaultUserAIPreferences.ai_interaction_settings?.enableStuInteractions,
            },
            created_at: data.created_at,
            updated_at: data.updated_at,
        };
        setUserPreferences(fetchedPrefs);
      } else {
        console.log(`No AI profile for user ${authUserId}, creating one with default/local settings.`);
        const initialPrefsToSync = { 
            ...userPreferences, 
            user_id: authUserId, 
            ai_interaction_settings: userPreferences.ai_interaction_settings || defaultUserAIPreferences.ai_interaction_settings
        };
        await syncUserPreferencesWithSupabase(initialPrefsToSync);
      }
    } catch (error) {
      console.error('Error in fetchUserPreferencesFromSupabase:', error);
    }
  }, [authUserId, setUserPreferences, userPreferences, syncUserPreferencesWithSupabase]);

  const updateUserPreferences = useCallback((prefs: Partial<UserAIPreferences>) => {
    setUserPreferences(prev => {
      const newPrefs = { ...prev, ...prefs };
      if (authUserId) { 
         syncUserPreferencesWithSupabase(newPrefs); 
      }
      return newPrefs;
    });
  }, [setUserPreferences, authUserId, syncUserPreferencesWithSupabase]);

  const generateAISuggestions = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      // Pass authUserId to generateSuggestions
      const newSuggestions = await patternEngine.generateSuggestions(authUserId, userPreferences);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, patternEngine, authUserId, userPreferences]);

  const acceptSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    patternEngine.trackFeedback(suggestionId, true);
  }, [patternEngine]);

  const rejectSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    patternEngine.trackFeedback(suggestionId, false);
  }, [patternEngine]);

  // Effect to fetch preferences from Supabase when authUserId becomes available
  useEffect(() => {
    if (authUserId && supabase) { 
      fetchUserPreferencesFromSupabase();
    }
  }, [authUserId, fetchUserPreferencesFromSupabase]);

  return (
    <AIContext.Provider
      value={{
        suggestions,
        isGenerating,
        userPreferences,
        updateUserPreferences,
        acceptSuggestion,
        rejectSuggestion,
        generateAISuggestions,
        syncUserPreferencesWithSupabase, 
        fetchUserPreferencesFromSupabase, 
      }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAI = (): AIContextType => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}; 