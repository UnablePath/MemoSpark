"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

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
};

// Define the context type
interface UserContextType {
  profile: UserProfile;
  isProfileLoaded: boolean;
  updateProfile: (newProfile: Partial<UserProfile>) => void;
  saveProfile: () => void;
  resetProfile: () => void;
}

// Create the context
const UserContext = createContext<UserContextType>({
  profile: defaultProfile,
  isProfileLoaded: false,
  updateProfile: () => {},
  saveProfile: () => {},
  resetProfile: () => {},
});

// Hook to use the user context
export const useUser = () => useContext(UserContext);

// Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  // Load profile from localStorage on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("studyspark_profile");
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
    localStorage.setItem("studyspark_profile", JSON.stringify(profile));
    toast.success("Profile updated successfully");
    return true;
  };

  // Reset profile to default
  const resetProfile = () => {
    setProfile(defaultProfile);
    localStorage.removeItem("studyspark_profile");
  };

  // Value object to pass to provider
  const contextValue: UserContextType = {
    profile,
    isProfileLoaded,
    updateProfile,
    saveProfile,
    resetProfile,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}
