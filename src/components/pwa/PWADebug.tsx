'use client'

import { useState, useEffect } from 'react'
import { usePWA } from '@/hooks/usePWA'
import { PushNotificationManager } from './PushNotificationManager'
import { Badge } from '@/components/ui/badge'

interface PWADebugProps {
  className?: string
}

export default function PWADebug({ className = '' }: PWADebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [showDebug, setShowDebug] = useState(false)
  const pwa = usePWA()

  useEffect(() => {
    const checkPWAStatus = async () => {
      const info: any = {
        // Browser support
        serviceWorkerSupported: 'serviceWorker' in navigator,
        pushManagerSupported: 'PushManager' in window,
        notificationSupported: 'Notification' in window,
        
        // Installation status
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isAndroid: /Android/.test(navigator.userAgent),
        
        // Current state
        isOnline: navigator.onLine,
        userAgent: navigator.userAgent,
        
        // PWA context
        pwaIsOnline: pwa.isOnline,
        pwaIsInstalled: pwa.isInstalled,
        pwaCanInstall: pwa.canInstall,
        pwaHasUpdate: pwa.hasUpdate,
        pwaIsRegistered: pwa.isRegistered,
      }

      // Check service worker registration
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          info.swRegistration = !!registration
          info.swActive = !!registration?.active
          info.swWaiting = !!registration?.waiting
          info.swInstalling = !!registration?.installing
        } catch (error) {
          info.swError = error
        }
      }

      // Check manifest
      try {
        const manifestResponse = await fetch('/manifest.webmanifest')
        info.manifestAccessible = manifestResponse.ok
        if (manifestResponse.ok) {
          const manifest = await manifestResponse.json()
          info.manifestValid = !!manifest.name
          info.manifestIcons = manifest.icons?.length || 0
        }
      } catch (error) {
        info.manifestError = error
      }

      // Check beforeinstallprompt event
      info.beforeInstallPromptFired = window.localStorage.getItem('beforeinstallprompt-fired') === 'true'

      setDebugInfo(info)
    }

    checkPWAStatus()

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = () => {
      window.localStorage.setItem('beforeinstallprompt-fired', 'true')
      setDebugInfo((prev: any) => ({ ...prev, beforeInstallPromptFired: true }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [pwa])

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className={`fixed bottom-4 right-4 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium ${className}`}
        style={{ zIndex: 9999 }}
      >
        PWA Debug
      </button>
    )
  }

  return (
    <div className={`fixed inset-4 bg-white border border-gray-300 rounded-lg p-4 overflow-auto ${className}`} style={{ zIndex: 9999 }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">PWA Debug Information</h2>
        <button
          onClick={() => setShowDebug(false)}
          className="text-red-500 hover:text-red-700 font-medium"
        >
          Close
        </button>
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <h3 className="font-semibold text-green-600 mb-2">Browser Support</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>Service Worker: {debugInfo.serviceWorkerSupported ? '✅' : '❌'}</div>
            <div>Push Manager: {debugInfo.pushManagerSupported ? '✅' : '❌'}</div>
            <div>Notifications: {debugInfo.notificationSupported ? '✅' : '❌'}</div>
            <div>Standalone: {debugInfo.isStandalone ? '✅' : '❌'}</div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-blue-600 mb-2">Service Worker Status</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>Registered: {debugInfo.swRegistration ? '✅' : '❌'}</div>
            <div>Active: {debugInfo.swActive ? '✅' : '❌'}</div>
            <div>Waiting: {debugInfo.swWaiting ? '⏳' : '❌'}</div>
            <div>Installing: {debugInfo.swInstalling ? '⏳' : '❌'}</div>
          </div>
          {debugInfo.swError && (
            <div className="text-red-600 mt-2">Error: {debugInfo.swError.message}</div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-purple-600 mb-2">Manifest Status</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>Accessible: {debugInfo.manifestAccessible ? '✅' : '❌'}</div>
            <div>Valid: {debugInfo.manifestValid ? '✅' : '❌'}</div>
            <div>Icons: {debugInfo.manifestIcons || 0}</div>
            <div>Install Event: {debugInfo.beforeInstallPromptFired ? '✅' : '❌'}</div>
          </div>
          {debugInfo.manifestError && (
            <div className="text-red-600 mt-2">Error: {debugInfo.manifestError.message}</div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-orange-600 mb-2">PWA Context</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>Online: {debugInfo.pwaIsOnline ? '✅' : '❌'}</div>
            <div>Installed: {debugInfo.pwaIsInstalled ? '✅' : '❌'}</div>
            <div>Can Install: {debugInfo.pwaCanInstall ? '✅' : '❌'}</div>
            <div>Has Update: {debugInfo.pwaHasUpdate ? '⏳' : '❌'}</div>
            <div>SW Registered: {debugInfo.pwaIsRegistered ? '✅' : '❌'}</div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-600 mb-2">Device Info</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>iOS: {debugInfo.isIOS ? '✅' : '❌'}</div>
            <div>Android: {debugInfo.isAndroid ? '✅' : '❌'}</div>
            <div>Online: {debugInfo.isOnline ? '✅' : '❌'}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500 break-all">
            {debugInfo.userAgent}
          </div>
        </div>

        {/* Network Diagnostics */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">🌐 Network Diagnostics</h3>
          <div className="space-y-2 text-sm">
            <div>Online Status: <Badge variant={debugInfo.isOnline ? "default" : "destructive"}>{debugInfo.isOnline ? "Online" : "Offline"}</Badge></div>
            <div>Connection Type: {(navigator as any)?.connection?.effectiveType || 'Unknown'}</div>
            <div>User Agent: {debugInfo.userAgent.substring(0, 50)}...</div>
            
            <details className="mt-2">
              <summary className="cursor-pointer text-amber-700 font-medium">OneSignal CDN Test</summary>
              <div className="mt-2 p-2 bg-amber-100 rounded text-xs">
                <p>If OneSignal is stuck on "Initializing...", try:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Check if <code>cdn.onesignal.com</code> is reachable</li>
                  <li>Disable VPN/proxy temporarily</li>
                  <li>Try a different network (mobile hotspot)</li>
                  <li>Check corporate firewall settings</li>
                  <li>Clear browser cache and cookies</li>
                </ul>
                <p className="mt-2 font-semibold">The app works normally without OneSignal!</p>
              </div>
            </details>
          </div>
        </div>

        {/* Push Notification Manager */}
        <div className="mb-4">
          <PushNotificationManager />
        </div>

        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">Quick Actions</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-3 py-1 rounded text-xs"
            >
              Reload Page
            </button>
            <button
              onClick={() => navigator.serviceWorker.register('/sw.js')}
              className="bg-green-500 text-white px-3 py-1 rounded text-xs"
            >
              Register SW
            </button>
            <button
              onClick={() => window.open('/manifest.webmanifest', '_blank')}
              className="bg-purple-500 text-white px-3 py-1 rounded text-xs"
            >
              View Manifest
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 