'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Zod schema for form validation
const OnboardingFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  yearOfStudy: z.enum(['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Postgraduate', 'Other'], {
    errorMap: () => ({ message: 'Please select a valid year of study' })
  }),
  birthDate: z.string().min(1, 'Birth date is required').refine((dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const hundredYearsAgo = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
    const sixteenYearsAgo = new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());
    
    return date >= hundredYearsAgo && date <= sixteenYearsAgo;
  }, 'Please enter a valid birth date (must be at least 16 years old)'),
  interests: z.string().transform((str) => {
    const interests = str.split(/\s*,\s*/).filter(Boolean);
    return interests;
  }),
  learningStyle: z.enum(['Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing', 'Unspecified'], {
    errorMap: () => ({ message: 'Please select a valid learning style' })
  }),
  subjects: z.string().min(1, 'At least one subject is required').transform((str) => {
    const subjects = str.split(/\s*,\s*/).filter(Boolean);
    if (subjects.length === 0) {
      throw new z.ZodError([{
        code: 'custom',
        message: 'At least one subject is required',
        path: ['subjects']
      }]);
    }
    return subjects;
  }),
  aiPreferences: z.string().transform((str) => {
    try {
      const parsed = JSON.parse(str);
      return z.object({
        difficulty: z.number().min(1).max(10).default(5),
        explanationStyle: z.enum(['simple', 'balanced', 'detailed']).default('balanced'),
        interactionFrequency: z.enum(['minimal', 'moderate', 'frequent']).default('moderate')
      }).parse(parsed);
    } catch (error) {
      return {
        difficulty: 5,
        explanationStyle: 'balanced' as const,
        interactionFrequency: 'moderate' as const
      };
    }
  })
});

type OnboardingFormData = z.infer<typeof OnboardingFormSchema>;

// Enhanced response type for better error handling
type ActionResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Create authenticated Supabase client for server actions
 * Uses official Clerk-Supabase native integration (no JWT template needed)
 */
function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    // Native Clerk-Supabase integration - no JWT template needed
    accessToken: async () => {
      try {
        const { getToken } = await auth();
        // Use native integration - no template parameter needed
        const token = await getToken();
        return token;
      } catch (error) {
        console.warn('Failed to get Clerk session token:', error);
        return null;
      }
    },
  });
}

export async function completeUserProfileOnboarding(formData: FormData): Promise<ActionResponse> {
  try {
    // 1. Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return { 
        error: 'Authentication required. Please sign in and try again.',
        success: false 
      };
    }

    // 2. Extract and validate form data using Zod
    const rawFormData = {
      name: formData.get('name') as string || '',
      email: formData.get('email') as string || '',
      yearOfStudy: formData.get('yearOfStudy') as string || 'Freshman',
      birthDate: formData.get('birthDate') as string || '',
      interests: formData.get('interests') as string || '',
      learningStyle: formData.get('learningStyle') as string || 'Unspecified',
      subjects: formData.get('subjects') as string || '',
      aiPreferences: formData.get('aiPreferences') as string || '{"difficulty":5,"explanationStyle":"balanced","interactionFrequency":"moderate"}'
    };

    const validationResult = OnboardingFormSchema.safeParse(rawFormData);
    
    if (!validationResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      validationResult.error.errors.forEach((error) => {
        const field = error.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(error.message);
      });

      return {
        error: 'Please correct the following errors and try again.',
        fieldErrors,
        success: false
      };
    }

    const validatedData: OnboardingFormData = validationResult.data;

    try {
      // 3. Update Clerk user metadata first - this drives onboarding completion
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: {
          onboardingComplete: true,
          name: validatedData.name,
          yearOfStudy: validatedData.yearOfStudy,
          birthDate: validatedData.birthDate,
          interests: validatedData.interests,
          learningStyle: validatedData.learningStyle,
          subjects: validatedData.subjects,
          aiPreferences: validatedData.aiPreferences,
        },
      });

      // 4. Sync profile to Supabase (optional - Clerk is source of truth)
      try {
        const supabase = createServerSupabaseClient();

        // First check if we can get a valid Clerk token for Supabase auth
        const { getToken } = await auth();
        const clerkToken = await getToken({ template: 'supabase' });
        
        if (!clerkToken) {
          console.warn('No Clerk token available for Supabase - skipping profile sync');
          // Still mark onboarding as complete since Clerk metadata is the source of truth
        } else {
          // 5. Use upsert to handle both insert and update cases
          // RLS policies will automatically filter by the authenticated user (Clerk JWT)
          const profileData = {
            clerk_user_id: userId,
            email: validatedData.email,
            full_name: validatedData.name,
            year_of_study: validatedData.yearOfStudy,
            learning_style: validatedData.learningStyle,
            subjects: validatedData.subjects,
            interests: validatedData.interests,
            ai_preferences: validatedData.aiPreferences,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          };

          const { error: supabaseError } = await supabase
            .from('profiles')
            .upsert(profileData, {
              onConflict: 'clerk_user_id'
            });

          if (supabaseError) {
            console.error("Error syncing profile to Supabase:", supabaseError);
            // Don't fail the entire operation if Supabase sync fails
            // The Clerk metadata is the source of truth for onboarding completion
            console.warn('Profile sync failed, but onboarding marked complete in Clerk');
          } else {
            console.log('Profile successfully synced to Supabase');
          }
        }
      } catch (supabaseError) {
        console.error("Error in Supabase operations:", supabaseError);
        console.warn('Supabase sync failed, but onboarding marked complete in Clerk');
      }

      // 6. Revalidate relevant paths for cache invalidation
      revalidatePath('/dashboard');
      revalidatePath('/profile');
      revalidatePath('/');

      return { 
        success: true,
        message: "Onboarding completed successfully! Welcome to MemoSpark."
      };
      
    } catch (clerkOrSupabaseError) {
      console.error("Error in onboarding operations:", clerkOrSupabaseError);
      
      // Check if it's a Clerk API error
      if (clerkOrSupabaseError && typeof clerkOrSupabaseError === 'object' && 'errors' in clerkOrSupabaseError) {
        const clerkError = clerkOrSupabaseError as any;
        if (clerkError.errors && clerkError.errors[0] && clerkError.errors[0].message) {
          return { 
            error: `Authentication error: ${clerkError.errors[0].message}`,
            success: false 
          };
        }
      }
      
      return { 
        error: 'There was an error completing your onboarding. Please try again.',
        success: false 
      };
    }

  } catch (unexpectedError) {
    console.error("Unexpected error in completeUserProfileOnboarding:", unexpectedError);
    return { 
      error: 'An unexpected error occurred. Please try again later.',
      success: false 
    };
  }
}

// Keep the original function name for backward compatibility
export const completeOnboarding = completeUserProfileOnboarding; 