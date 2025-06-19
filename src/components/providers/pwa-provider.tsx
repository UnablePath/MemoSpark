'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePWA } from '@/hooks/usePWA'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import UpdateNotification from '@/components/pwa/UpdateNotification'
import PWADebug from '@/components/pwa/PWADebug'
import { PWAErrorBoundary } from '@/components/pwa/PWAErrorBoundary'

interface PWAContextType {
  isOnline: boolean
  isInstalled: boolean
  canInstall: boolean
  hasUpdate: boolean
  isRegistered: boolean
  install: () => Promise<void>
  update: () => Promise<void>
  checkForUpdates: () => Promise<void>
  getOfflineCapabilities: () => Promise<string[]>
}

const PWAContext = createContext<PWAContextType | undefined>(undefined)

export function usePWAContext() {
  const context = useContext(PWAContext)
  if (context === undefined) {
    throw new Error('usePWAContext must be used within a PWAProvider')
  }
  return context
}

interface PWAProviderProps {
  children: React.ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const pwa = usePWA()
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showUpdateNotification, setShowUpdateNotification] = useState(false)

  useEffect(() => {
    // Show install prompt if installable and not installed
    if (pwa.canInstall && !pwa.isInstalled) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true)
      }, 5000) // Show after 5 seconds

      return () => clearTimeout(timer)
    }
  }, [pwa.canInstall, pwa.isInstalled])

  useEffect(() => {
    // Show update notification if update is available
    if (pwa.hasUpdate) {
      setShowUpdateNotification(true)
    }
  }, [pwa.hasUpdate])

  useEffect(() => {
    // Log PWA status for debugging
    console.log('PWA Status:', {
      isOnline: pwa.isOnline,
      isInstalled: pwa.isInstalled,
      canInstall: pwa.canInstall,
      hasUpdate: pwa.hasUpdate,
      isRegistered: pwa.isRegistered,
    })
  }, [pwa])

  useEffect(() => {
    // Handle offline/online events
    if (!pwa.isOnline) {
      console.log('App went offline')
      // You could show a toast notification here
    } else {
      console.log('App is online')
      // Check for updates when coming back online
      pwa.checkForUpdates()
    }
  }, [pwa.isOnline, pwa.checkForUpdates])

  const contextValue: PWAContextType = {
    isOnline: pwa.isOnline,
    isInstalled: pwa.isInstalled,
    canInstall: pwa.canInstall,
    hasUpdate: pwa.hasUpdate,
    isRegistered: pwa.isRegistered,
    install: pwa.install,
    update: pwa.update,
    checkForUpdates: pwa.checkForUpdates,
    getOfflineCapabilities: pwa.getOfflineCapabilities,
  }

  return (
    <PWAErrorBoundary>
      <PWAContext.Provider value={contextValue}>
        {children}
        
        {/* PWA Install Prompt */}
        {showInstallPrompt && (
          <InstallPrompt onClose={() => setShowInstallPrompt(false)} />
        )}
        
        {/* PWA Update Notification */}
        {showUpdateNotification && (
          <UpdateNotification onClose={() => setShowUpdateNotification(false)} />
        )}
      </PWAContext.Provider>
    </PWAErrorBoundary>
  )
} 