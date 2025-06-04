"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import type { UserAIPreferences } from "@/types/ai";
import { defaultAIPreferences } from "@/types/ai";

// Define user profile interface
export interface UserProfile {
  name: string;
  email: string;
  yearOfStudy: string;
  subjects: string[];
  interests: string[];
  avatar?: string | null;
  birthDate?: string | null;
  bio?: string;
  // AI-specific fields (optional for backward compatibility)
  aiPreferences?: UserAIPreferences;
  aiEnabled?: boolean; // Quick toggle for all AI features
  onboardingCompleted?: boolean; // Track if AI onboarding was completed
  lastAIInteraction?: string; // ISO date string
}

// Default user profile
export const defaultProfile: UserProfile = {
  name: "",
  email: "",
  yearOfStudy: "Freshman",
  subjects: [],
  interests: [],
  avatar: null,
  birthDate: null,
  bio: "",
  aiEnabled: false, // Default to disabled until user enables
  onboardingCompleted: false,
};

// Define the context type
interface UserContextType {
  profile: UserProfile;
  isProfileLoaded: boolean;
  updateProfile: (newProfile: Partial<UserProfile>) => void;
  saveProfile: () => void;
  resetProfile: () => void;
  // AI-specific methods
  enableAI: () => void;
  disableAI: () => void;
  updateAIPreferences: (preferences: Partial<UserAIPreferences>) => void;
  initializeAIPreferences: () => void;
  isAIEnabled: () => boolean;
}

// Create the context
const UserContext = createContext<UserContextType>({
  profile: defaultProfile,
  isProfileLoaded: false,
  updateProfile: () => {},
  saveProfile: () => {},
  resetProfile: () => {},
  enableAI: () => {},
  disableAI: () => {},
  updateAIPreferences: () => {},
  initializeAIPreferences: () => {},
  isAIEnabled: () => false,
});

// Hook to use the user context
export const useUser = () => useContext(UserContext);

// Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  // Load profile from localStorage on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("memospark_profile");
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
      } catch (error) {
        console.error("Error parsing saved profile:", error);
      }
    }
    setIsProfileLoaded(true);
  }, []);

  // Update profile data
  const updateProfile = (newProfile: Partial<UserProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...newProfile,
    }));
  };

  // Save profile to localStorage
  const saveProfile = () => {
    // Validate required fields
    if (!profile.name.trim()) {
      toast.error("Please enter your name");
      return false;
    }

    if (!profile.email.trim() || !profile.email.includes('@')) {
      toast.error("Please enter a valid email address");
      return false;
    }

    // Save to localStorage
    localStorage.setItem("memospark_profile", JSON.stringify(profile));
    toast.success("Profile updated successfully");
    return true;
  };

  // Reset profile to default
  const resetProfile = () => {
    setProfile(defaultProfile);
    localStorage.removeItem("memospark_profile");
  };

  // AI-specific methods
  const enableAI = () => {
    setProfile(prev => ({
      ...prev,
      aiEnabled: true,
      aiPreferences: prev.aiPreferences || defaultAIPreferences,
      lastAIInteraction: new Date().toISOString(),
    }));
  };

  const disableAI = () => {
    setProfile(prev => ({
      ...prev,
      aiEnabled: false,
      lastAIInteraction: new Date().toISOString(),
    }));
  };

  const updateAIPreferences = (preferences: Partial<UserAIPreferences>) => {
    setProfile(prev => ({
      ...prev,
      aiPreferences: {
        ...(prev.aiPreferences || defaultAIPreferences),
        ...preferences,
      },
      lastAIInteraction: new Date().toISOString(),
    }));
  };

  const initializeAIPreferences = () => {
    setProfile(prev => ({
      ...prev,
      aiPreferences: prev.aiPreferences || defaultAIPreferences,
      onboardingCompleted: false,
    }));
  };

  const isAIEnabled = (): boolean => {
    return Boolean(profile.aiEnabled && profile.aiPreferences?.enableSuggestions);
  };

  // Value object to pass to provider
  const contextValue: UserContextType = {
    profile,
    isProfileLoaded,
    updateProfile,
    saveProfile,
    resetProfile,
    enableAI,
    disableAI,
    updateAIPreferences,
    initializeAIPreferences,
    isAIEnabled,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}
