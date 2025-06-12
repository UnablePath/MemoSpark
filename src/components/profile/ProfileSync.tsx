"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ensureUserProfileAction, syncUserProfileAction } from '@/app/actions/user-actions';
import { toast } from 'sonner';

interface ProfileSyncProps {
  className?: string;
}

export const ProfileSync: React.FC<ProfileSyncProps> = ({ className }) => {
  const { profile, isLoading, error, refetch } = useUserProfile();
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const result = await ensureUserProfileAction();
      if (result.success) {
        toast.success('Profile synchronized successfully!');
        await refetch(); // Refresh the profile data
      } else {
        toast.error(result.error || 'Failed to sync profile');
      }
    } catch (error) {
      console.error('Manual sync error:', error);
      toast.error('Failed to sync profile');
    } finally {
      setSyncing(false);
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    try {
      const result = await syncUserProfileAction();
      if (result.success) {
        const syncedFields = result.data?.syncedFields || [];
        toast.success(`Profile synchronized! Updated: ${syncedFields.join(', ')}`);
        await refetch();
      } else {
        toast.error(result.error || 'Failed to sync profile');
      }
    } catch (error) {
      console.error('Full sync error:', error);
      toast.error('Failed to sync profile');
    } finally {
      setSyncing(false);
    }
  };

  const handleApiSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        const { profileCreated, syncedFields } = result.data;
        const message = profileCreated 
          ? 'Profile created and synchronized successfully!' 
          : `Profile updated! Synced: ${syncedFields.join(', ')}`;
        toast.success(message);
        await refetch();
      } else {
        toast.error(result.error || 'Failed to sync profile via API');
      }
    } catch (error) {
      console.error('API sync error:', error);
      toast.error('Failed to sync profile via API');
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Checking profile...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Profile Synchronization
          {profile ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {profile ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Profile synchronized! ID: {profile.id}
              {profile.onboarding_completed === false && (
                <span className="block mt-1 text-sm text-muted-foreground">
                  Note: Complete onboarding to access all features.
                </span>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Profile not found in database. This may happen for existing Clerk users.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleManualSync}
            disabled={syncing}
            variant="outline"
            size="sm"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Profile
          </Button>

          <Button
            onClick={handleFullSync}
            disabled={syncing}
            variant="outline"
            size="sm"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Full Sync
          </Button>

          <Button
            onClick={handleApiSync}
            disabled={syncing}
            variant="outline"
            size="sm"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            API Sync
          </Button>

          <Button
            onClick={refetch}
            disabled={isLoading}
            variant="ghost"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {profile && (
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Profile ID: <code className="bg-muted px-1 rounded">{profile.id}</code></div>
            <div>Clerk ID: <code className="bg-muted px-1 rounded">{profile.clerk_user_id}</code></div>
            {profile.email && (
              <div>Email: <code className="bg-muted px-1 rounded">{profile.email}</code></div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 