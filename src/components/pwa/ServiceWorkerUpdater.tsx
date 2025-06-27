'use client'

import { useState, useEffect, useRef } from 'react'
import { usePWA } from '@/hooks/usePWA'
import { Button } from '@/components/ui/button'
import { X, Download } from 'lucide-react'

// Global flag to prevent multiple instances
let isServiceWorkerUpdaterActive = false

export function ServiceWorkerUpdater() {
  const { hasUpdate, updateServiceWorker } = usePWA()
  const [showBanner, setShowBanner] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const updateButtonRef = useRef<HTMLButtonElement>(null)
  const dismissButtonRef = useRef<HTMLButtonElement>(null)

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
    if (isUpdating) return // Prevent multiple clicks during update
    
    try {
      setIsUpdating(true)
      console.log('[ServiceWorkerUpdater] Starting update process...')
      
      // Disable buttons during update
      if (updateButtonRef.current) {
        updateButtonRef.current.disabled = true
      }
      if (dismissButtonRef.current) {
        dismissButtonRef.current.disabled = true
      }
      
      await updateServiceWorker()
      
      // If we reach here, the update was successful and page reload is imminent
      // The update function will handle clearing hasUpdate before reload
      console.log('[ServiceWorkerUpdater] Update initiated successfully, page should reload soon...')
      
      // Don't immediately hide banner - let the reload handle cleanup
      // The timeout in usePWA will ensure reload happens within 5 seconds
      
    } catch (error) {
      console.error('Failed to update service worker:', error)
      
      // Re-enable buttons on error
      if (updateButtonRef.current) {
        updateButtonRef.current.disabled = false
      }
      if (dismissButtonRef.current) {
        dismissButtonRef.current.disabled = false
      }
      
      setIsUpdating(false)
      
      // Show user-friendly error message
      console.error('[ServiceWorkerUpdater] Update failed, please try again or refresh the page manually')
      
      // Keep banner visible on error so user can try again
      // The usePWA hook should have reset hasUpdate to false, but if not, keep trying
    }
  }

  const handleDismiss = () => {
    if (isUpdating) return // Prevent dismissal during update
    
    try {
      console.log('[ServiceWorkerUpdater] User dismissed update banner')
      setShowBanner(false)
      isServiceWorkerUpdaterActive = false
    } catch (error) {
      console.error('Error dismissing update banner:', error)
    }
  }

  // Reset updating state if hasUpdate becomes false (e.g., update completed elsewhere)
  useEffect(() => {
    if (!hasUpdate && isUpdating) {
      setIsUpdating(false)
    }
  }, [hasUpdate, isUpdating])

  if (!showBanner) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg border-b border-blue-500">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Download className={`h-5 w-5 ${isUpdating ? 'animate-spin' : ''}`} />
            <div>
              <p className="font-medium">
                {isUpdating ? 'Updating...' : 'Update Available'}
              </p>
              <p className="text-sm text-blue-100">
                {isUpdating 
                  ? 'Installing new version, please wait...' 
                  : 'A new version of MemoSpark is ready'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              ref={updateButtonRef}
              onClick={handleUpdate}
              disabled={isUpdating}
              size="sm"
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating...' : 'Update Now'}
            </Button>
            <Button
              ref={dismissButtonRef}
              onClick={handleDismiss}
              disabled={isUpdating}
              size="sm"
              variant="ghost"
              className="text-blue-100 hover:text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}