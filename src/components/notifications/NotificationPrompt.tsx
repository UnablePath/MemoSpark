'use client';

import { useEffect, useState, useRef } from 'react';
import { useOneSignal } from '../providers/onesignal-provider';
import { Button } from '@/components/ui/button';
import { Bell, X, Loader2 } from 'lucide-react';

interface NotificationPromptProps {
  autoShow?: boolean;
  className?: string;
}

export function NotificationPrompt({ autoShow = true, className = '' }: NotificationPromptProps) {
  const { shouldPromptUser, isSubscribed, promptUser, isInitialized } = useOneSignal();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  
  // Refs for button management
  const enableButtonRef = useRef<HTMLButtonElement>(null);
  const notNowButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('notification-prompt-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show prompt if conditions are met
    if (autoShow && isInitialized && shouldPromptUser && !isSubscribed && !isDismissed) {
      // Wait a bit before showing to avoid interrupting page load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [autoShow, isInitialized, shouldPromptUser, isSubscribed, isDismissed]);

  const handleEnable = async () => {
    // Debouncing - prevent multiple clicks within 2 seconds
    const now = Date.now();
    if (now - lastClickTime < 2000) {
      console.log('[NotificationPrompt] Click debounced');
      return;
    }
    setLastClickTime(now);

    // Prevent multiple simultaneous operations
    if (isEnabling) {
      console.log('[NotificationPrompt] Already enabling, skipping...');
      return;
    }

    try {
      setIsEnabling(true);
      console.log('[NotificationPrompt] Starting notification enable process...');
      
      // Disable buttons during operation
      if (enableButtonRef.current) {
        enableButtonRef.current.disabled = true;
      }
      if (notNowButtonRef.current) {
        notNowButtonRef.current.disabled = true;
      }
      
      const success = await promptUser();
      
      if (success) {
        console.log('[NotificationPrompt] Notifications enabled successfully');
        setIsVisible(false);
      } else {
        console.log('[NotificationPrompt] User declined or failed to enable notifications');
        // Don't hide prompt if user declined - they might try again
      }
    } catch (error) {
      console.error('[NotificationPrompt] Error enabling notifications:', error);
      // Keep prompt visible so user can try again
    } finally {
      setIsEnabling(false);
      
      // Re-enable buttons
      if (enableButtonRef.current) {
        enableButtonRef.current.disabled = false;
      }
      if (notNowButtonRef.current) {
        notNowButtonRef.current.disabled = false;
      }
    }
  };

  const handleDismiss = () => {
    if (isEnabling) return; // Prevent dismissal during operation
    
    try {
      console.log('[NotificationPrompt] User dismissed notification prompt');
      setIsVisible(false);
      setIsDismissed(true);
      // Remember dismissal for 7 days
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      localStorage.setItem('notification-prompt-dismissed', expiryDate.toISOString());
    } catch (error) {
      console.error('[NotificationPrompt] Error dismissing prompt:', error);
    }
  };

  const handleNotNow = () => {
    if (isEnabling) return; // Prevent dismissal during operation
    
    try {
      console.log('[NotificationPrompt] User selected "Not Now"');
      setIsVisible(false);
      // Don't set permanent dismissal - allow prompt to show again later
    } catch (error) {
      console.error('[NotificationPrompt] Error handling "Not Now":', error);
    }
  };

  // Reset enabling state if subscription status changes (e.g., from other components)
  useEffect(() => {
    if (isSubscribed && isEnabling) {
      setIsEnabling(false);
    }
  }, [isSubscribed, isEnabling]);

  if (!isVisible || isSubscribed) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md ${className}`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Bell className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Enable Notifications
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Get timely reminders for your tasks and never miss important deadlines.
            </p>
            <div className="flex gap-2 mt-3">
              <Button 
                ref={enableButtonRef}
                onClick={handleEnable}
                disabled={isEnabling}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnabling ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  'Enable'
                )}
              </Button>
              <Button 
                ref={notNowButtonRef}
                onClick={handleNotNow}
                disabled={isEnabling}
                variant="outline" 
                size="sm"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Not Now
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            disabled={isEnabling}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 