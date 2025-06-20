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
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration && registration.waiting) {
          // Listen for the controlling service worker to change
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            // Reload the page once the new service worker has taken control
            window.location.reload()
          })
          // Send a message to the waiting service worker to skip waiting
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      } catch (error) {
        console.error('Error updating PWA:', error)
      }
    }
  }, [])

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      try {
        // Check for existing registration first
        let registration = await navigator.serviceWorker.getRegistration('/')
        
        if (!registration) {
          // Register the new service worker only if none exists
          registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          })
                     console.log('Service Worker registered successfully:', registration.scope)
         } else {
           console.log('Service Worker already registered:', registration.scope)
           // Check for updates on existing registration
           await registration.update()
         }
        setIsRegistered(true)

        // Handle service worker state changes
        const handleServiceWorkerState = (worker: ServiceWorker) => {
          worker.addEventListener('statechange', () => {
            console.log('Service Worker state changed:', worker.state)
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              setHasUpdate(true)
            }
          })
        }

        // Check for updates
        registration.addEventListener('updatefound', () => {
          console.log('Service Worker update found')
          const newWorker = registration.installing
          if (newWorker) {
            handleServiceWorkerState(newWorker)
          }
        })

        // Handle initial installation
        if (registration.installing) {
          handleServiceWorkerState(registration.installing)
        }

        // Check if there's already a waiting worker
        if (registration.waiting) {
          console.log('Service Worker waiting for activation')
          setHasUpdate(true)
        }

        // Handle controller changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Service Worker controller changed')
          window.location.reload()
        })

      } catch (error) {
        console.error('Service Worker registration failed:', error)
        setIsRegistered(false)
      }
    } else {
      console.log('Service Worker not supported')
    }
  }, [])

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.update()
        }
      } catch (error) {
        console.error('Failed to check for updates:', error)
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
      registerServiceWorker()
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
    getOfflineCapabilities
  }
} 