'use client'

import React, { useState, useEffect } from 'react'
import { usePWA } from '@/hooks/usePWA'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowDownToLine, Share, X, Smartphone, Zap, Bell, Wifi } from 'lucide-react'

// More accurate iOS Safari Share icon
const IOSSafariShareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="11" width="18" height="10" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
    <circle cx="12" cy="11" r="1" fill="currentColor"/>
    <path d="M12 5L12 11M12 5L9 8M12 5L15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Add to Home Screen icon
const AddToHomeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M12 8L12 16M8 12L16 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const InstallPrompt: React.FC = () => {
  const { os, canInstall, install } = usePWA()
  const [showPrompt, setShowPrompt] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)

  // Decide when to show the prompt
  useEffect(() => {
    // For non-iOS devices, show when the browser says it's installable
    if (os !== 'ios' && canInstall) {
      setShowPrompt(true)
    }
    // For iOS, show after a delay if not installed
    else if (os === 'ios' && !window.navigator.standalone) {
      const timer = setTimeout(() => {
        // Check if the user has already seen the hint
        const hasSeenHint = localStorage.getItem('hasSeenIOSInstallHint')
        if (!hasSeenHint) {
          setShowIOSHint(true)
        }
      }, 3000) // Show after 3 seconds (reduced from 5)
      return () => clearTimeout(timer)
    }
  }, [canInstall, os])

  const handleCloseIOSHint = () => {
    localStorage.setItem('hasSeenIOSInstallHint', 'true')
    setShowIOSHint(false)
  }

  const handleInstallClick = async () => {
    await install()
    setShowPrompt(false)
  }

  if (showIOSHint) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="w-full max-w-md max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
          <Card className="bg-white shadow-2xl border-0 mx-auto">
            <CardHeader className="text-center pb-4 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleCloseIOSHint} 
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 z-10"
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 pr-8">
                Install MemoSpark App
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Get the full app experience on your iPhone!
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 pb-6">
              {/* Benefits Section */}
              <div className="bg-blue-50 rounded-lg p-3">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">Why install the app?</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-1 text-blue-800">
                    <Zap className="w-3 h-3" />
                    <span>Faster loading</span>
                  </div>
                  <div className="flex items-center space-x-1 text-blue-800">
                    <Bell className="w-3 h-3" />
                    <span>Push notifications</span>
                  </div>
                  <div className="flex items-center space-x-1 text-blue-800">
                    <Wifi className="w-3 h-3" />
                    <span>Works offline</span>
                  </div>
                  <div className="flex items-center space-x-1 text-blue-800">
                    <Smartphone className="w-3 h-3" />
                    <span>Home screen access</span>
                  </div>
                </div>
              </div>

              {/* Step-by-step instructions */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-center text-sm">Easy Installation in 2 Steps:</h4>
                
                {/* Step 1 */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-green-900 mb-1 text-sm">
                        Tap the Share button
                      </p>
                      <div className="flex items-center space-x-1 text-green-800">
                        <span className="text-xs">Look for this icon at the bottom of Safari:</span>
                        <div className="bg-white p-1 rounded border border-green-300">
                          <IOSSafariShareIcon />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-purple-900 mb-1 text-sm">
                        Select "Add to Home Screen"
                      </p>
                      <div className="flex items-center space-x-1 text-purple-800 flex-wrap">
                        <span className="text-xs">Scroll down and look for:</span>
                        <div className="bg-white p-1 rounded border border-purple-300 flex items-center space-x-1">
                          <AddToHomeIcon />
                          <span className="text-xs font-medium">Add to Home Screen</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional tip */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <div className="flex items-center space-x-2 text-amber-800">
                  <div className="w-4 h-4 text-amber-500">💡</div>
                  <p className="text-xs font-medium">
                    Tip: The share button is usually in the bottom toolbar of Safari
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={handleCloseIOSHint}
                  className="flex-1 text-sm"
                  size="sm"
                >
                  Maybe Later
                </Button>
                <Button 
                  onClick={handleCloseIOSHint}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-sm"
                  size="sm"
                >
                  Got It!
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (showPrompt) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="max-w-sm bg-background/90 backdrop-blur-sm border-border shadow-lg">
          <CardHeader>
            <CardTitle>Install MemoSpark</CardTitle>
            <CardDescription>Get the full app experience.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleInstallClick} className="w-full">
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              Install App
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
} 