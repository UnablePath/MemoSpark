'use client';

import { useEffect, useState } from 'react';
import { useOneSignal } from '../providers/onesignal-provider';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';

interface NotificationPromptProps {
  autoShow?: boolean;
  className?: string;
}

export function NotificationPrompt({ autoShow = true, className = '' }: NotificationPromptProps) {
  const { shouldPromptUser, isSubscribed, promptUser, isInitialized } = useOneSignal();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

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
    const success = await promptUser();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    // Remember dismissal for 7 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    localStorage.setItem('notification-prompt-dismissed', expiryDate.toISOString());
  };

  const handleNotNow = () => {
    setIsVisible(false);
    // Don't set permanent dismissal - allow prompt to show again later
  };

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
                onClick={handleEnable}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Enable
              </Button>
              <Button 
                onClick={handleNotNow}
                variant="outline" 
                size="sm"
              >
                Not Now
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 