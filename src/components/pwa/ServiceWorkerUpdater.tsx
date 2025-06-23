'use client'

import { useState, useEffect } from 'react'
import { usePWA } from '@/hooks/usePWA'
import { Button } from '@/components/ui/button'
import { X, Download } from 'lucide-react'

// Global flag to prevent multiple instances
let isServiceWorkerUpdaterActive = false

export function ServiceWorkerUpdater() {
  const { hasUpdate, updateServiceWorker } = usePWA()
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Prevent multiple instances
    if (isServiceWorkerUpdaterActive) {
      return
    }

    if (hasUpdate) {
      setShowBanner(true)
      isServiceWorkerUpdaterActive = true
    }

    return () => {
      if (showBanner) {
        isServiceWorkerUpdaterActive = false
      }
    }
  }, [hasUpdate, showBanner])

  const handleUpdate = async () => {
    try {
      setShowBanner(false)
      isServiceWorkerUpdaterActive = false
      await updateServiceWorker()
    } catch (error) {
      console.error('Failed to update service worker:', error)
      isServiceWorkerUpdaterActive = false
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    isServiceWorkerUpdaterActive = false
  }

  if (!showBanner) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg border-b border-blue-500">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Download className="h-5 w-5" />
            <div>
              <p className="font-medium">Update Available</p>
              <p className="text-sm text-blue-100">A new version of MemoSpark is ready</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleUpdate}
              size="sm"
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              Update Now
            </Button>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="text-blue-100 hover:text-white hover:bg-blue-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}