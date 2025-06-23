'use client'

import { useState, useEffect, useCallback } from 'react'

type OSType = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown'

interface PWAState {
  isOnline: boolean
  isInstalled: boolean
  canInstall: boolean
  hasUpdate: boolean
  isRegistered: boolean
  os: OSType
}

interface PWAActions {
  install: () => Promise<void>
  update: () => Promise<void>
  updateServiceWorker: () => Promise<void>
  registerServiceWorker: () => Promise<void>
  checkForUpdates: () => Promise<void>
  getOfflineCapabilities: () => Promise<string[]>
}

const getOperatingSystem = (): OSType => {
  if (typeof window === 'undefined') return 'unknown'
  const userAgent = window.navigator.userAgent

  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) return 'ios'
  if (/android/i.test(userAgent)) return 'android'
  if (/Win/i.test(userAgent)) return 'windows'
  if (/Mac/i.test(userAgent)) return 'macos'
  if (/Linux/i.test(userAgent)) return 'linux'

  return 'unknown'
}

export function usePWA(): PWAState & PWAActions {
  const [isOnline, setIsOnline] = useState(true)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [os, setOs] = useState<OSType>('unknown')

  useEffect(() => {
    setOs(getOperatingSystem())
  }, [])

  // Check if PWA is installed
  useEffect(() => {
    const checkInstallation = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window as any).navigator?.standalone === true
      setIsInstalled(isStandalone)
    }

    checkInstallation()

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleChange = () => checkInstallation()
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    updateOnlineStatus()

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setCanInstall(false)
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Install PWA
  const install = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        console.log(`User response to the install prompt: ${outcome}`)
        setDeferredPrompt(null)
        setCanInstall(false)
        if (outcome === 'accepted') {
          setIsInstalled(true)
        }
      } catch (error) {
        console.error('Error during PWA installation:', error)
      }
    }
  }, [deferredPrompt])

  // Update PWA (reload to activate waiting service worker)
  const update = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/')
        if (registration && registration.waiting) {
          console.log('[PWA] Updating service worker...')
          
          // Listen for the controlling service worker to change
          const handleControllerChange = () => {
            console.log('[PWA] Service worker updated, reloading...')
            window.location.reload()
          }
          
          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { once: true })
          
          // Send a message to the waiting service worker to skip waiting
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          
          // Set hasUpdate to false immediately
          setHasUpdate(false)
        } else {
          console.log('[PWA] No waiting service worker found')
        }
      } catch (error) {
        console.error('Error updating PWA:', error)
      }
    }
  }, [])

  // Clean up conflicting service worker registrations
  const cleanupServiceWorkers = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return

    try {
      console.log('[PWA] Cleaning up service worker registrations...')
      const registrations = await navigator.serviceWorker.getRegistrations()
      
      for (const registration of registrations) {
        const scope = registration.scope
        const scriptURL = registration.active?.scriptURL || ''
        
        console.log('[PWA] Found registration:', { scope, scriptURL })
        
        // Keep OneSignal service worker if it exists
        if (scriptURL.includes('OneSignalSDKWorker') || scope.includes('OneSignal')) {
          console.log('[PWA] Keeping OneSignal service worker:', scope)
          continue
        }
        
        // Unregister old or conflicting service workers ONLY if they're different from current
        if (scriptURL.includes('sw.js') && scope !== `${window.location.origin}/`) {
          console.log('[PWA] Unregistering conflicting service worker:', scope)
          try {
            await registration.unregister()
          } catch (error) {
            console.warn('[PWA] Failed to unregister service worker:', error)
          }
        } else if (!scriptURL.includes('sw.js') && !scriptURL.includes('OneSignal')) {
          console.log('[PWA] Unregistering unknown service worker:', scope)
          try {
            await registration.unregister()
          } catch (error) {
            console.warn('[PWA] Failed to unregister unknown service worker:', error)
          }
        }
      }
      
      console.log('[PWA] Service worker cleanup completed')
    } catch (error) {
      console.error('[PWA] Error during service worker cleanup:', error)
    }
  }, [])

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      try {
        // Check for existing main registration first
        let registration = await navigator.serviceWorker.getRegistration('/')
        
        if (registration) {
          console.log('[PWA] MemoSpark Service Worker already registered:', registration.scope)
          setIsRegistered(true)
          
          // Check if there's a waiting worker
          if (registration.waiting) {
            console.log('[PWA] Service Worker waiting for activation')
            setHasUpdate(true)
          }
          
          // Try to update existing registration
          try {
            await registration.update()
            console.log('[PWA] Service worker update check completed')
          } catch (updateError) {
            console.warn('[PWA] Service worker update failed:', updateError)
          }
          
          return // Exit early if already registered
        }

        // Only clean up if no main service worker exists
        await cleanupServiceWorkers()
        
        // Wait a bit for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 200))

        // Register the new service worker
        console.log('[PWA] Registering new MemoSpark service worker...')
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        })
        console.log('[PWA] MemoSpark Service Worker registered successfully:', registration.scope)

        setIsRegistered(true)

        // Handle service worker state changes
        const handleServiceWorkerState = (worker: ServiceWorker) => {
          worker.addEventListener('statechange', () => {
            console.log('[PWA] Service Worker state changed:', worker.state)
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New service worker installed, update available')
              setHasUpdate(true)
            }
            if (worker.state === 'activated' && !navigator.serviceWorker.controller) {
              console.log('[PWA] Service worker activated for the first time')
            }
          })
        }

        // Check for updates
        registration.addEventListener('updatefound', () => {
          console.log('[PWA] Service Worker update found')
          const newWorker = registration.installing
          if (newWorker) {
            handleServiceWorkerState(newWorker)
          }
        })

        // Handle initial installation
        if (registration.installing) {
          console.log('[PWA] Service worker installing...')
          handleServiceWorkerState(registration.installing)
        }

        // Check if there's already a waiting worker
        if (registration.waiting) {
          console.log('[PWA] Service Worker waiting for activation')
          setHasUpdate(true)
        }

        // Handle active service worker
        if (registration.active) {
          console.log('[PWA] Service worker is active')
          
          // Check version to see if we need to show update prompt
          try {
            const messageChannel = new MessageChannel()
            messageChannel.port1.onmessage = (event) => {
              const { version, app } = event.data
              console.log('[PWA] Current service worker version:', version, 'for app:', app)
            }
            
            registration.active.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2])
          } catch (error) {
            console.log('[PWA] Could not check service worker version:', error)
          }
        }

        // Handle controller changes (when SW takes control) - only set up once
        if (!window._pwaSWListenerAdded) {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[PWA] Service Worker controller changed')
            setHasUpdate(false)
            // Don't auto-reload here - let the user decide
          })

          // Listen for messages from service worker - only set up once
          navigator.serviceWorker.addEventListener('message', (event) => {
            const { data } = event
            if (data && data.type === 'SW_UPDATED') {
              console.log('[PWA] Service worker reports it has been updated')
              setHasUpdate(true)
            } else if (data && data.type === 'SW_ACTIVATED') {
              console.log('[PWA] Service worker activated:', data)
              setIsRegistered(true)
            }
          })
          
          window._pwaSWListenerAdded = true
        }

      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error)
        setIsRegistered(false)
      }
    } else {
      console.log('[PWA] Service Worker not supported')
    }
  }, [cleanupServiceWorkers])

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        console.log('[PWA] Checking for service worker updates...')
        const registration = await navigator.serviceWorker.getRegistration('/')
        if (registration) {
          await registration.update()
          console.log('[PWA] Update check completed')
        }
      } catch (error) {
        console.error('[PWA] Failed to check for updates:', error)
      }
    }
  }, [])

  // Get offline capabilities
  const getOfflineCapabilities = useCallback(async (): Promise<string[]> => {
    const capabilities: string[] = []

    // Check cache API support
    if ('caches' in window) {
      capabilities.push('Static resource caching')
      
      try {
        const cacheNames = await caches.keys()
        if (cacheNames.length > 0) {
          capabilities.push('Cached content available')
        }
      } catch (error) {
        console.error('Error checking cache:', error)
      }
    }

    // Check IndexedDB support
    if ('indexedDB' in window) {
      capabilities.push('Local data storage')
    }

    // Check background sync support
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      capabilities.push('Background synchronization')
    }

    // Check push notification support
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      capabilities.push('Push notifications')
    }

    // Check Web Share API
    if ('share' in navigator) {
      capabilities.push('Native sharing')
    }

    // Check fullscreen support
    if (document.fullscreenEnabled) {
      capabilities.push('Fullscreen mode')
    }

    return capabilities
  }, [])

  // Auto-register service worker on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !isRegistered) {
      // Delay registration slightly to avoid blocking the main thread
      const timer = setTimeout(() => {
        registerServiceWorker()
      }, 500) // Increased delay to ensure page is loaded
      
      return () => clearTimeout(timer)
    }
  }, [registerServiceWorker, isRegistered])

  return {
    // State
    isOnline,
    isInstalled,
    canInstall,
    hasUpdate,
    isRegistered,
    os,
    
    // Actions
    install,
    update,
    registerServiceWorker,
    checkForUpdates,
    getOfflineCapabilities,
    updateServiceWorker: update
  }
} 