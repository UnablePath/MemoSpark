"use client";

// import { useEffect } from 'react';
// import { useUser } from '@/lib/user-context'; // Old context, to be removed or replaced if necessary
import { usePathname } from 'next/navigation'; // useRouter might not be needed anymore here
import { Toaster } from "@/components/ui/sonner";
// If we need to check Clerk's auth status for loading, import useUser from Clerk
// import { useUser as useClerkUser } from '@clerk/nextjs'; 
import { useEffect } from 'react';

interface ClientBodyProps {
  children: React.ReactNode;
}

// const ALLOWED_INITIAL_PATHS = ['/', '/login', '/signup']; // This might be handled by middleware or Clerk components

export default function ClientBody({ children }: ClientBodyProps) {
  // const { profile, isProfileLoaded } = useUser(); // From old context
  // const router = useRouter();
  // const pathname = usePathname();
  // const { isLoaded: isClerkLoaded } = useClerkUser(); // Example if using Clerk's loading state

  /*
  useEffect(() => {
    // All redirection logic related to custom onboarding / profile.name is removed.
    // Middleware now handles redirection to /clerk-onboarding based on Clerk's metadata.
  }, [isProfileLoaded, profile, pathname, router]);
  */

  // Simplified rendering logic. 
  // The middleware and Clerk components should manage access and loading states for routes.
  // If a global loading spinner is desired before Clerk loads, it can be added here based on useClerkUser().isLoaded
  /*
  if (!isClerkLoaded && !ALLOWED_INITIAL_PATHS.includes(pathname)) { // Example condition
     return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p>Loading...</p>
      </div>
    );
  }
  */

  // Load development helpers in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // Development Helper Functions
      (window as any).devHelpers = {
        /**
         * Reset AI usage limits for current user
         */
        async resetAIUsage() {
          try {
            console.log('🔄 Resetting AI usage limits...');
            
            const response = await fetch('/api/dev/reset-usage', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            });

            const data = await response.json();
            
            if (response.ok) {
              console.log('✅ AI usage reset successfully!', data);
              console.log('🚀 You can now make AI requests again');
              
              // Refresh the page to update the UI
              if (confirm('AI usage reset! Refresh page to update UI?')) {
                window.location.reload();
              }
            } else {
              console.error('❌ Failed to reset usage:', data);
            }
            
            return data;
          } catch (error: any) {
            console.error('❌ Error resetting usage:', error);
            return { error: error.message };
          }
        },

        /**
         * Check current AI usage status
         */
        async checkUsage() {
          console.log('📊 Checking AI usage status...');
          console.log('ℹ️  Check the Network tab or server logs for usage details');
          
          try {
            const response = await fetch('/api/ai/suggestions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                feature: 'basic_suggestions',
                tasks: [],
                context: { check: true }
              })
            });

            const data = await response.json();
            console.log('Current usage status:', data.usage);
            return data;
          } catch (error) {
            console.error('Error checking usage:', error);
            return null;
          }
        },

        /**
         * Clear localStorage and sessionStorage
         */
        clearStorage() {
          localStorage.clear();
          sessionStorage.clear();
          console.log('🧹 Local storage cleared');
          window.location.reload();
        },

        /**
         * Upgrade user to premium tier for testing
         */
        async upgradeToPremium() {
          try {
            console.log('⬆️ Upgrading to premium tier for testing...');
            
            const response = await fetch('/api/dev/upgrade-tier', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ tier: 'premium' })
            });

            const data = await response.json();
            
            if (response.ok) {
              console.log('✅ Upgraded to premium tier!', data);
              console.log('🚀 You can now test all premium AI features');
              
              if (confirm('Upgraded to premium! Refresh page to apply changes?')) {
                window.location.reload();
              }
            } else {
              console.log('ℹ️ Note: Server-side override is active in development mode');
              console.log('🎯 All premium features should work regardless of database tier');
            }
            
            return data;
          } catch (error: any) {
            console.log('ℹ️ Upgrade endpoint not available, but development override is active');
            console.log('🎯 Premium features should work in development mode');
            return { message: 'Development override active' };
          }
        },

        /**
         * Show available helper functions
         */
        help() {
          console.log(`
🛠️  Development Helper Functions:

devHelpers.resetAIUsage()  - Reset daily AI usage limits
devHelpers.checkUsage()    - Check current usage status  
devHelpers.clearStorage()  - Clear browser storage & reload
devHelpers.upgradeToPremium() - Upgrade to premium tier for testing
devHelpers.help()          - Show this help message

💡 Tip: These functions only work in development mode!
          `);
        }
      };

      // Auto-show help message
      console.log('🚀 StudySpark Development Mode');
      console.log('📱 Development helpers loaded!');
      console.log('💡 Type: devHelpers.help()');
    }
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
