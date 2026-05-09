"use client";

import { useUser as useClerkUser } from "@clerk/nextjs";
import type { UserAIPreferences } from "@/types/ai";
import { defaultAIPreferences } from "@/types/ai";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { mergeLayeredAiPreferences } from "@/lib/ai/profileAiPreferencesContract";
import { toast } from "sonner";

/**
 * Tier F: Clerk `publicMetadata` (+ primary email) is authoritative for identity and
 * `onboardingComplete`. `memospark_profile` in localStorage stores **only** AI UI prefs
 * (`aiPreferences`, `aiEnabled`, `lastAIInteraction`), never a second copy of name/email/subjects.
 */

export interface UserProfile {
  name: string;
  email: string;
  yearOfStudy: string;
  subjects: string[];
  interests: string[];
  avatar?: string | null;
  birthDate?: string | null;
  bio?: string;
  aiPreferences?: UserAIPreferences;
  aiEnabled?: boolean;
  /** Mirrors Clerk `publicMetadata.onboardingComplete`, not persisted independently. */
  onboardingCompleted?: boolean;
  lastAIInteraction?: string;
}

export const defaultProfile: UserProfile = {
  name: "",
  email: "",
  yearOfStudy: "Freshman",
  subjects: [],
  interests: [],
  avatar: null,
  birthDate: null,
  bio: "",
  aiEnabled: false,
  onboardingCompleted: false,
};

const AI_PREFS_STORAGE_KEY = "memospark_profile";

interface UserContextType {
  profile: UserProfile;
  isProfileLoaded: boolean;
  updateProfile: (newProfile: Partial<UserProfile>) => void;
  saveProfile: () => void;
  resetProfile: () => void;
  enableAI: () => void;
  disableAI: () => void;
  updateAIPreferences: (preferences: Partial<UserAIPreferences>) => void;
  initializeAIPreferences: () => void;
  isAIEnabled: () => boolean;
}

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

/**
 * AI prefs (`memospark_profile`) plus Clerk-derived profile fields for display.
 * For session / auth, use `useUser` from `@clerk/nextjs`, not this hook.
 */
export function useUserProfilePrefs() {
  return useContext(UserContext);
}

function readAiPrefsFromStorage(): Partial<
  Pick<UserProfile, "aiPreferences" | "aiEnabled" | "lastAIInteraction">
> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(AI_PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<
      Pick<UserProfile, "aiPreferences" | "aiEnabled" | "lastAIInteraction">
    > = {};
    if (parsed.aiPreferences && typeof parsed.aiPreferences === "object") {
      out.aiPreferences = {
        ...defaultAIPreferences,
        ...(parsed.aiPreferences as UserAIPreferences),
      };
    }
    if (typeof parsed.aiEnabled === "boolean") {
      out.aiEnabled = parsed.aiEnabled;
    }
    if (typeof parsed.lastAIInteraction === "string") {
      out.lastAIInteraction = parsed.lastAIInteraction;
    }
    return out;
  } catch {
    return {};
  }
}

function mapClerkToProfile(
  user: ReturnType<typeof useClerkUser>["user"],
  aiPrefs: Partial<
    Pick<UserProfile, "aiPreferences" | "aiEnabled" | "lastAIInteraction">
  >,
): UserProfile {
  if (!user) {
    return { ...defaultProfile, ...aiPrefs };
  }
  const m = user.publicMetadata as Record<string, unknown> | undefined;
  const name =
    (typeof m?.name === "string" && m.name) ||
    user.fullName ||
    user.firstName ||
    "";
  const email = user.primaryEmailAddress?.emailAddress || "";
  const yearOfStudy =
    (typeof m?.yearOfStudy === "string" && m.yearOfStudy) || "Freshman";
  const subjects = Array.isArray(m?.subjects)
    ? (m.subjects as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  const interests = Array.isArray(m?.interests)
    ? (m.interests as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  const birthDate =
    typeof m?.birthDate === "string" ? m.birthDate : null;
  const bio = typeof m?.bio === "string" ? m.bio : "";

  const clerkAiPrefs =
    m?.aiPreferences && typeof m.aiPreferences === "object"
      ? (m.aiPreferences as Partial<UserAIPreferences>)
      : undefined;

  return {
    name,
    email,
    yearOfStudy,
    subjects,
    interests,
    avatar: user.imageUrl || null,
    birthDate,
    bio,
    onboardingCompleted: m?.onboardingComplete === true,
    aiPreferences: mergeLayeredAiPreferences(clerkAiPrefs, aiPrefs.aiPreferences),
    aiEnabled: aiPrefs.aiEnabled ?? false,
    lastAIInteraction: aiPrefs.lastAIInteraction,
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useClerkUser();
  const [aiPrefs, setAiPrefs] = useState<
    Partial<
      Pick<UserProfile, "aiPreferences" | "aiEnabled" | "lastAIInteraction">
    >
  >({});

  useEffect(() => {
    setAiPrefs(readAiPrefsFromStorage());
  }, []);

  const profile = useMemo(
    () => mapClerkToProfile(user ?? null, aiPrefs),
    [user, aiPrefs],
  );

  const isProfileLoaded = isLoaded;

  const persistAiPrefs = (
    next: Partial<
      Pick<UserProfile, "aiPreferences" | "aiEnabled" | "lastAIInteraction">
    >,
  ) => {
    setAiPrefs((prev) => {
      const merged = { ...prev, ...next };
      try {
        localStorage.setItem(AI_PREFS_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* quota */
      }
      return merged;
    });
  };

  const updateProfile = (newProfile: Partial<UserProfile>) => {
    const { aiPreferences, aiEnabled, lastAIInteraction, ...rest } = newProfile;
    if (
      rest.name !== undefined ||
      rest.email !== undefined ||
      rest.yearOfStudy !== undefined ||
      rest.subjects !== undefined ||
      rest.interests !== undefined ||
      rest.birthDate !== undefined ||
      rest.bio !== undefined ||
      rest.onboardingCompleted !== undefined
    ) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[UserProvider] Ignoring identity fields in updateProfile, use Clerk /profile or onboarding. Only AI prefs are mutable here.",
        );
      }
    }
    if (
      aiPreferences !== undefined ||
      aiEnabled !== undefined ||
      lastAIInteraction !== undefined
    ) {
      persistAiPrefs({ aiPreferences, aiEnabled, lastAIInteraction });
    }
  };

  const saveProfile = () => {
    try {
      localStorage.setItem(
        AI_PREFS_STORAGE_KEY,
        JSON.stringify({
          aiPreferences: profile.aiPreferences ?? defaultAIPreferences,
          aiEnabled: profile.aiEnabled ?? false,
          lastAIInteraction: profile.lastAIInteraction,
        }),
      );
      toast.success("Preferences saved");
      return true;
    } catch {
      toast.error("Could not save preferences");
      return false;
    }
  };

  const resetProfile = () => {
    setAiPrefs({});
    try {
      localStorage.removeItem(AI_PREFS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const enableAI = () => {
    persistAiPrefs({
      aiEnabled: true,
      aiPreferences: profile.aiPreferences || defaultAIPreferences,
      lastAIInteraction: new Date().toISOString(),
    });
  };

  const disableAI = () => {
    persistAiPrefs({
      aiEnabled: false,
      lastAIInteraction: new Date().toISOString(),
    });
  };

  const updateAIPreferences = (preferences: Partial<UserAIPreferences>) => {
    persistAiPrefs({
      aiPreferences: {
        ...(profile.aiPreferences || defaultAIPreferences),
        ...preferences,
      },
      lastAIInteraction: new Date().toISOString(),
    });
  };

  const initializeAIPreferences = () => {
    persistAiPrefs({
      aiPreferences: profile.aiPreferences || defaultAIPreferences,
    });
  };

  const isAIEnabled = (): boolean => {
    return Boolean(
      profile.aiEnabled && profile.aiPreferences?.enableSuggestions,
    );
  };

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
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}
