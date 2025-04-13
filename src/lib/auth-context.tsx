"use client";

import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Tables } from './supabase';

type UserProfile = Tables['users'];

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, userData: Partial<UserProfile>) =>
    Promise<{ error: AuthError | null, user: User | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

// Default implementation with non-functional placeholders
const defaultAuthContext: AuthContextType = {
  session: null,
  user: null,
  userProfile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, user: null }),
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Fetch user profile data from the database
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data as UserProfile | null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  // Refresh the user profile data
  const refreshProfile = async () => {
    if (user?.id) {
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
    }
  };

  // Only run this effect on the client
  useEffect(() => {
    // Avoid running this during SSR/prerender
    if (!initialized) {
      setInitialized(true);
      setLoading(true);

      // Get the current session
      const initializeAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setUserProfile(profile);
        }

        setLoading(false);
      };

      initializeAuth();

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event: string, session: Session | null) => {
          console.log('Auth state changed:', { event: _event, hasSession: !!session });
          setSession(session);
          const currentUser = session?.user ?? null;
          setUser(currentUser);

          if (currentUser) {
            console.log('Fetching profile for user ID:', currentUser.id);
            let profile = await fetchUserProfile(currentUser.id);
            
            // If profile doesn't exist, attempt to create it
            if (!profile) {
              console.warn('Profile not found for user:', currentUser.id, 'Attempting to create one.');
              try {
                const now = new Date().toISOString();
                const fullName = currentUser.user_metadata?.full_name || 
                               currentUser.user_metadata?.name || 
                               'New User';

                const { error: insertError } = await supabase
                  .from('users')
                  .insert({
                    id: currentUser.id,
                    email: currentUser.email,
                    full_name: fullName,
                    year_of_study: 'Not specified',
                    subjects: [],
                    interests: [],
                    created_at: now,
                    updated_at: now,
                  })
                  .select()
                  .maybeSingle();

                if (insertError) {
                  console.error('Error auto-creating user profile:', insertError);
                  setUserProfile(null);
                } else {
                  // Re-fetch the profile after successful creation
                  profile = await fetchUserProfile(currentUser.id);
                  setUserProfile(profile);
                }
              } catch (creationError) {
                console.error('Exception during profile auto-creation:', creationError);
                setUserProfile(null);
              }
            } else {
              console.log('Profile found for user:', currentUser.id);
              setUserProfile(profile);
            }
          } else {
            console.log('No user session, clearing profile.');
            setUserProfile(null);
          }

          setLoading(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [fetchUserProfile, initialized]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error: error as AuthError };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    try {
      console.log('Starting signup process with email:', email, 'and userData:', userData);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: userData,
        },
      });

      console.log('Supabase auth.signUp response:', { user: data.user ? 'User object present' : 'No user', error });
      return { error, user: data.user };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error: error as AuthError, user: null };
    }
  };

  // Sign in with Google OAuth
  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign-in with redirect to:', `${window.location.origin}/auth/callback`);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'email profile',
        },
      });
      
      if (error) {
        console.error('Error initiating Google sign-in:', error);
      }
    } catch (error) {
      console.error('Exception during Google sign-in:', error);
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
  };

  const value = {
    session,
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}