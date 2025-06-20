'use client'

import React, { useState, useEffect } from 'react'
import { usePWA } from '@/hooks/usePWA'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowDownToLine, Share, X } from 'lucide-react'

// iOS Share Sheet icon (approximated)
const IosShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4L12 16M12 4L8 8M12 4L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 12V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
      }, 5000) // Show after 5 seconds
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
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="max-w-sm bg-background/90 backdrop-blur-sm border-border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">Install MemoSpark</span>
              <X className="ml-auto h-5 w-5 cursor-pointer" onClick={handleCloseIOSHint} />
            </CardTitle>
            <CardDescription>
              For the best experience, add the app to your home screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p>1. Tap the <IosShareIcon /> icon in the Safari menu bar.</p>
            <p className="mt-2">2. Scroll down and tap 'Add to Home Screen'.</p>
          </CardContent>
        </Card>
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