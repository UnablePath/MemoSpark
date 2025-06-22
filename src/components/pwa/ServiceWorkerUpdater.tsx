'use client'

import { useEffect, useState } from 'react'
import { usePWA } from '@/hooks/usePWA'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'

// Global flag to prevent multiple update banners
let isUpdateBannerShowing = false;

export function ServiceWorkerUpdater() {
  const { hasUpdate, update, isRegistered } = usePWA()
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (hasUpdate && isRegistered && !showUpdateBanner && !isUpdateBannerShowing) {
      setShowUpdateBanner(true)
      isUpdateBannerShowing = true
    }
  }, [hasUpdate, isRegistered, showUpdateBanner])

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      await update()
    } catch (error) {
      console.error('Failed to update service worker:', error)
    } finally {
      setIsUpdating(false)
      setShowUpdateBanner(false)
      isUpdateBannerShowing = false
    }
  }

  const handleDismiss = () => {
    setShowUpdateBanner(false)
    isUpdateBannerShowing = false
  }

  // Reset global flag when component unmounts
  useEffect(() => {
    return () => {
      if (showUpdateBanner) {
        isUpdateBannerShowing = false
      }
    }
  }, [showUpdateBanner])

  if (!showUpdateBanner) {
    return null
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg border border-blue-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <RefreshCw className={`h-5 w-5 ${isUpdating ? 'animate-spin' : ''}`} />
            <div>
              <p className="font-medium">Update Available</p>
              <p className="text-sm text-blue-100">A new version of MemoSpark is ready</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-blue-100 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="mt-3 flex space-x-2">
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            size="sm"
            variant="secondary"
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            {isUpdating ? 'Updating...' : 'Update Now'}
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="text-blue-100 hover:text-white hover:bg-blue-500"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  )
}