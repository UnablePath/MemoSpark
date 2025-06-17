'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function InstallPrompt() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const { isInstalled } = usePWA()

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPromptEvent(event as BeforeInstallPromptEvent)
      console.log('[PWA] beforeinstallprompt event captured.')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = useCallback(async () => {
    if (!installPromptEvent) {
      console.log('[PWA] Install prompt not available.')
      return
    }
    
    await installPromptEvent.prompt()
    
    const { outcome } = await installPromptEvent.userChoice
    
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt.')
    } else {
      console.log('[PWA] User dismissed the install prompt.')
    }
    
    setInstallPromptEvent(null)
  }, [installPromptEvent])

  const handleDismiss = () => {
    setInstallPromptEvent(null)
    console.log('[PWA] User dismissed the install prompt manually.')
  }

  // Do not show the prompt if the app is already installed or the event is not available
  if (isInstalled || !installPromptEvent) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-4 right-4 z-50"
        role="dialog"
        aria-labelledby="install-dialog-title"
        aria-describedby="install-dialog-description"
      >
        <div className="bg-background border border-border rounded-lg shadow-2xl p-4 max-w-sm w-full">
          <div className="flex items-start">
            <div className="flex-grow">
              <h3 id="install-dialog-title" className="font-semibold text-lg text-foreground">Install MemoSpark App</h3>
              <p id="install-dialog-description" className="text-sm text-muted-foreground mt-1">
                Get a faster, full-screen experience with offline access by installing our app.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="ml-4 -mt-2 -mr-2"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleInstallClick}
            className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white"
          >
            <Download className="mr-2 h-4 w-4" />
            Install App
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
} 