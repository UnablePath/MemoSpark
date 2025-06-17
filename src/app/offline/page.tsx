'use client'

import { Wifi, RefreshCw, AlertCircle } from 'lucide-react'
import { useEffect } from 'react'

export default function OfflinePage() {
  // Set page title for client component
  useEffect(() => {
    document.title = 'Offline - MemoSpark'
  }, [])
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Offline Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wifi className="w-10 h-10 text-red-500" />
            <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Title and Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          You&apos;re Offline
        </h1>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          MemoSpark needs an internet connection to sync your data and provide the best experience. 
          Please check your connection and try again.
        </p>

        {/* Features Available Offline */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-blue-900 mb-2">Available Offline:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• View cached tasks and progress</li>
            <li>• Use Stu stress relief animations</li>
            <li>• Access previously loaded content</li>
            <li>• Create tasks (will sync when online)</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Go Back
          </button>
        </div>

        {/* Connection Status */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>Connection Status: Offline</span>
          </div>
        </div>
      </div>
    </div>
  )
} 