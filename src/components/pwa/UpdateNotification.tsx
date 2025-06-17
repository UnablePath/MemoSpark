'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Download, X } from 'lucide-react'

interface UpdateNotificationProps {
  onClose?: () => void
  className?: string
}

export default function UpdateNotification({ onClose, className = '' }: UpdateNotificationProps) {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Service worker has been updated and is now controlling the page
        window.location.reload()
      })

      // Check if there's a waiting service worker
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setShowUpdatePrompt(true)
        }

        // Listen for waiting worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker)
                setShowUpdatePrompt(true)
              }
            })
          }
        })
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          setShowUpdatePrompt(true)
        }
      })
    }
  }, [])

  const handleUpdate = () => {
    if (waitingWorker) {
      setIsUpdating(true)
      
      // Send message to waiting service worker to skip waiting
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      
      // Close the prompt
      setShowUpdatePrompt(false)
      
      // Show loading state briefly before reload
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  const handleClose = () => {
    setShowUpdatePrompt(false)
    onClose?.()
    
    // Don't show again for this session
    sessionStorage.setItem('update-prompt-dismissed', 'true')
  }

  // Don't show if dismissed in this session
  if (typeof window !== 'undefined' && sessionStorage.getItem('update-prompt-dismissed')) {
    return null
  }

  if (!showUpdatePrompt) {
    return null
  }

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 ${className}`}>
      <div className="bg-white border border-blue-200 rounded-lg shadow-lg p-4 max-w-md mx-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close update notification"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Content */}
        <div className="pr-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              {isUpdating ? (
                <RefreshCw className="w-6 h-6 text-green-600 animate-spin" />
              ) : (
                <Download className="w-6 h-6 text-green-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {isUpdating ? 'Updating...' : 'Update Available'}
              </h3>
              <p className="text-sm text-gray-600">
                {isUpdating 
                  ? 'MemoSpark is updating to the latest version' 
                  : 'A new version of MemoSpark is ready'
                }
              </p>
            </div>
          </div>

          {!isUpdating && (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">What&apos;s new:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Bug fixes and improvements</li>
                  <li>• Better performance</li>
                  <li>• Enhanced offline support</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Update Now
                </button>
                <button
                  onClick={handleClose}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                  Later
                </button>
              </div>
            </>
          )}

          {isUpdating && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                <span>Please wait while we update the app...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 