"use client";

import type React from 'react';
import ThemeSettings from '@/components/settings/ThemeSettings';
import AccessibilitySettings from '@/components/settings/AccessibilitySettings';
import { NotificationTestPanel } from '@/components/notifications/NotificationTestPanel';
import { PushNotificationControls } from '@/components/notifications/PushNotificationControls';
import PushNotificationSetup from '@/components/notifications/PushNotificationSetup';

// interface SettingsPageProps {} // Add if props are needed

const SettingsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Theme Settings</h2>
        <ThemeSettings />
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Accessibility Settings</h2>
        <AccessibilitySettings />
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Push Notifications</h2>
        <div className="space-y-4">
          <PushNotificationSetup />
          <PushNotificationControls />
        </div>
      </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-4">Notification Test Panel</h2>
        <NotificationTestPanel />
      </section>
    </div>
  );
};

export default SettingsPage;
