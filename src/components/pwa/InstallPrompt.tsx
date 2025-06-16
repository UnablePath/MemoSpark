'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone, Monitor, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallPromptProps {
  onClose?: () => void
  className?: string
}

export default function InstallPrompt({ onClose, className = '' }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window as any).navigator?.standalone === true
    setIsStandalone(standalone)

    // Don't show prompt if already installed
    if (standalone) {
      return
    }

    // Handle beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent
      setDeferredPrompt(event)
      setIsInstallable(true)
      setShowPrompt(true)
    }

    // Handle app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed')
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // For iOS, show manual install instructions after a delay
    if (iOS && !standalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Show after 3 seconds on iOS

      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
      }
    }

    // For testing on desktop, show prompt after 5 seconds if criteria are met
    if (!iOS && !standalone) {
      const timer = setTimeout(() => {
        // Show prompt for testing even without beforeinstallprompt on desktop
        if (process.env.NODE_ENV === 'development') {
          setShowPrompt(true)
        }
      }, 5000)

      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt')
        } else {
          console.log('User dismissed the install prompt')
        }
        
        setDeferredPrompt(null)
        setShowPrompt(false)
      } catch (error) {
        console.error('Error installing PWA:', error)
      }
    }
  }

  const handleClose = () => {
    setShowPrompt(false)
    onClose?.()
    
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  // Don't show if dismissed in this session
  if (typeof window !== 'undefined' && sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null
  }

  if (!showPrompt || isStandalone) {
    return null
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md mx-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close install prompt"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Content */}
        <div className="pr-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Install MemoSpark</h3>
              <p className="text-sm text-gray-600">Get the full app experience</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-2">Benefits of installing:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Works offline</li>
              <li>• Faster loading</li>
              <li>• Push notifications</li>
              <li>• Home screen access</li>
            </ul>
          </div>

          {/* Install Instructions */}
          {isIOS ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                To install MemoSpark on your device:
              </p>
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Share className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Tap the Share button
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Then &quot;Add to Home Screen&quot;
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                disabled={!deferredPrompt}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
              <button
                onClick={handleClose}
                className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                Later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 