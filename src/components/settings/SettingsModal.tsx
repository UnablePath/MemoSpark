"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Crown, CreditCard, Bell, Volume2, Shield, HelpCircle, ExternalLink } from 'lucide-react';
import ThemeSettings from '@/components/settings/ThemeSettings';
import AccessibilitySettings from '@/components/settings/AccessibilitySettings';

interface SettingsModalProps {
  children: React.ReactNode;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ children }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleSubscriptionRedirect = () => {
    setIsOpen(false);
    router.push('/settings/subscription');
  };

  const handleFullSettingsRedirect = () => {
    setIsOpen(false);
    router.push('/settings');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-6">
            {/* Subscription Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Subscription & Usage
                  <Badge variant="secondary">Premium</Badge>
                </CardTitle>
                <CardDescription>
                  Manage your MemoSpark subscription and view usage statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      View detailed usage stats, billing history, and upgrade options
                    </p>
                  </div>
                  <Button onClick={handleSubscriptionRedirect}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Configure how you receive notifications and reminders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Task reminders</span>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email notifications</span>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Push notifications</span>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audio & Sounds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  Audio & Sounds
                </CardTitle>
                <CardDescription>
                  Control sound effects and audio feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Task completion sounds</span>
                    <Button variant="outline" size="sm">On</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Button click sounds</span>
                    <Button variant="outline" size="sm">Off</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Notification sounds</span>
                    <Button variant="outline" size="sm">On</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 mt-6">
            <ThemeSettings />
            <AccessibilitySettings />
          </TabsContent>

          <TabsContent value="account" className="space-y-4 mt-6">
            {/* Privacy & Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy & Security
                </CardTitle>
                <CardDescription>
                  Manage your privacy settings and account security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Two-factor authentication</span>
                    <Button variant="outline" size="sm">Enable</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data export</span>
                    <Button variant="outline" size="sm">Download</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Delete account</span>
                    <Button variant="destructive" size="sm">Delete</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data & Storage */}
            <Card>
              <CardHeader>
                <CardTitle>Data & Storage</CardTitle>
                <CardDescription>
                  Manage your data and storage preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Clear cache</span>
                    <Button variant="outline" size="sm">Clear</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Offline data sync</span>
                    <Button variant="outline" size="sm">On</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auto-backup</span>
                    <Button variant="outline" size="sm">Daily</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="space-y-4 mt-6">
            {/* Help & Support */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Help & Support
                </CardTitle>
                <CardDescription>
                  Get help and access support resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Help Center</span>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Contact Support</span>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Contact
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Feature Requests</span>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Submit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* App Information */}
            <Card>
              <CardHeader>
                <CardTitle>App Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span>2.1.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Build:</span>
                    <span>20241201</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform:</span>
                    <span>Web</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal */}
            <Card>
              <CardHeader>
                <CardTitle>Legal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Terms of Service</span>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Privacy Policy</span>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Open Source Licenses</span>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="ghost" onClick={handleFullSettingsRedirect}>
            <Settings className="h-4 w-4 mr-2" />
            Full Settings Page
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 