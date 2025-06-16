'use client';

import React from 'react';
import { PushNotificationManager } from '@/components/pwa/PushNotificationManager';
import { usePWAContext } from '@/components/providers/pwa-provider';
import PWADebug from '@/components/pwa/PWADebug';

export default function PWATestPage() {
  const pwa = usePWAContext();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              MemoSpark PWA Test Center
            </h1>
            <p className="text-gray-600">
              Test and explore all Progressive Web App features
            </p>
          </div>

          {/* PWA Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className={`text-2xl mb-2 ${pwa.isOnline ? 'text-green-500' : 'text-red-500'}`}>
                {pwa.isOnline ? '🌐' : '🔌'}
              </div>
              <h3 className="font-semibold text-gray-900">Connection</h3>
              <p className="text-sm text-gray-600">
                {pwa.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className={`text-2xl mb-2 ${pwa.isInstalled ? 'text-green-500' : 'text-gray-400'}`}>
                {pwa.isInstalled ? '📱' : '📋'}
              </div>
              <h3 className="font-semibold text-gray-900">Installation</h3>
              <p className="text-sm text-gray-600">
                {pwa.isInstalled ? 'Installed' : 'Not Installed'}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className={`text-2xl mb-2 ${pwa.canInstall ? 'text-purple-500' : 'text-gray-400'}`}>
                {pwa.canInstall ? '⬇️' : '✅'}
              </div>
              <h3 className="font-semibold text-gray-900">Install Prompt</h3>
              <p className="text-sm text-gray-600">
                {pwa.canInstall ? 'Available' : 'Not Available'}
              </p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className={`text-2xl mb-2 ${pwa.hasUpdate ? 'text-orange-500' : 'text-green-500'}`}>
                {pwa.hasUpdate ? '🔄' : '✅'}
              </div>
              <h3 className="font-semibold text-gray-900">Updates</h3>
              <p className="text-sm text-gray-600">
                {pwa.hasUpdate ? 'Available' : 'Up to Date'}
              </p>
            </div>
          </div>

          {/* PWA Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Installation Section */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                App Installation
              </h2>
              <div className="space-y-3">
                {pwa.canInstall && (
                  <button
                    onClick={pwa.install}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Install MemoSpark
                  </button>
                )}
                {pwa.isInstalled && (
                  <div className="text-green-600 text-center py-2">
                    ✅ MemoSpark is installed on your device
                  </div>
                )}
                {!pwa.canInstall && !pwa.isInstalled && (
                  <div className="text-gray-600 text-center py-2">
                    Installation not available in this browser/context
                  </div>
                )}
              </div>
            </div>

            {/* Update Section */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                App Updates
              </h2>
              <div className="space-y-3">
                {pwa.hasUpdate && (
                  <button
                    onClick={pwa.update}
                    className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Update Available - Click to Refresh
                  </button>
                )}
                {!pwa.hasUpdate && (
                  <div className="text-green-600 text-center py-2">
                    ✅ You're running the latest version
                  </div>
                )}
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Force Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Push Notifications Section */}
          <div className="mb-8">
            <PushNotificationManager />
          </div>

          {/* Offline Testing */}
          <div className="bg-gray-50 p-6 rounded-xl mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Offline Testing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => window.open('/offline', '_blank')}
                className="bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                View Offline Page
              </button>
              <button
                onClick={() => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(registration => {
                      console.log('Service Worker Status:', registration);
                      alert('Check console for Service Worker details');
                    });
                  }
                }}
                className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Check Service Worker
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>
                To test offline functionality:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Open Developer Tools (F12)</li>
                <li>Go to Network tab</li>
                <li>Check "Offline" checkbox</li>
                <li>Navigate around the app</li>
              </ol>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-gray-50 p-6 rounded-xl mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Links
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <a
                href="/manifest.json"
                target="_blank"
                className="text-center bg-white p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="text-2xl mb-1">📋</div>
                <div className="text-sm font-medium">Manifest</div>
              </a>
              <a
                href="/sw.js"
                target="_blank"
                className="text-center bg-white p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="text-2xl mb-1">⚙️</div>
                <div className="text-sm font-medium">Service Worker</div>
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  alert('URL copied to clipboard!');
                }}
                className="text-center bg-white p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="text-2xl mb-1">📋</div>
                <div className="text-sm font-medium">Copy URL</div>
              </button>
              <button
                onClick={() => {
                  const shareData = {
                    title: 'MemoSpark PWA',
                    text: 'Check out this awesome PWA!',
                    url: window.location.href,
                  };
                  if (navigator.share) {
                    navigator.share(shareData);
                  } else {
                    alert('Web Share API not supported');
                  }
                }}
                className="text-center bg-white p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="text-2xl mb-1">📤</div>
                <div className="text-sm font-medium">Share</div>
              </button>
            </div>
          </div>

          {/* PWA Debug Component */}
          <PWADebug />
        </div>
      </div>
    </div>
  );
} 