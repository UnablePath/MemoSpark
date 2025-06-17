'use client'

import { useState, useEffect } from 'react'
import { usePWAContext } from '@/components/providers/pwa-provider'
import { Button } from '@/components/ui/button'
import { X, Download, Share } from 'lucide-react'

// Helper to detect iOS/iPadOS
const isIOS = () => {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

export default function InstallPrompt({ onClose }: { onClose: () => void }) {
  const { install, canInstall, isInstalled } = usePWAContext()
  const [isIosUser, setIsIosUser] = useState(false)

  useEffect(() => {
    setIsIosUser(isIOS())
  }, [])

  const handleInstallClick = async () => {
    await install()
    onClose()
  }

  // Do not show any prompt if already installed
  if (isInstalled) {
    return null
  }

  // Specific prompt for iOS users
  if (isIosUser) {
    return (
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 max-w-sm p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-5 z-50">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>
        <div className="flex flex-col items-center text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Install MemoSpark
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            To get the best experience, add the app to your Home Screen. Tap the
            <Share className="inline-block h-4 w-4 mx-1" />
            button and then select 'Add to Home Screen'.
          </p>
        </div>
      </div>
    )
  }

  // Standard prompt for other devices (Android/Desktop)
  if (canInstall) {
    return (
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 max-w-sm p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-5 z-50">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>
        <div className="flex flex-col items-center text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Install MemoSpark App
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Get a faster, full-screen experience with offline access by installing our app.
          </p>
          <Button onClick={handleInstallClick} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Install App
          </Button>
        </div>
      </div>
    )
  }

  return null
} 