'use client'

import { useState, useEffect } from 'react'
import { usePWAContext } from '@/components/providers/pwa-provider'
import { 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Monitor, 
  Download, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'

interface PWAStatusProps {
  detailed?: boolean
  className?: string
}

export default function PWAStatus({ detailed = false, className = '' }: PWAStatusProps) {
  const { 
    isOnline, 
    isInstalled, 
    canInstall, 
    hasUpdate, 
    isRegistered,
    getOfflineCapabilities 
  } = usePWAContext()
  
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [showDetails, setShowDetails] = useState(detailed)

  useEffect(() => {
    if (detailed || showDetails) {
      getOfflineCapabilities().then(setCapabilities)
    }
  }, [detailed, showDetails, getOfflineCapabilities])

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500'
    if (hasUpdate) return 'text-yellow-500'
    if (isInstalled && isRegistered) return 'text-green-500'
    return 'text-blue-500'
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (hasUpdate) return 'Update Available'
    if (isInstalled) return 'Installed'
    if (canInstall) return 'Installable'
    return 'Ready'
  }

  if (!detailed && !showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative">
          {isOnline ? (
            <Wifi className={`w-4 h-4 ${getStatusColor()}`} />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          {hasUpdate && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full"></div>
          )}
        </div>
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        <button
          onClick={() => setShowDetails(true)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Show PWA details"
        >
          <Info className="w-3 h-3 text-gray-400" />
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">PWA Status</h3>
        {!detailed && (
          <button
            onClick={() => setShowDetails(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Hide
          </button>
        )}
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-3">
        {isOnline ? (
          <Wifi className="w-5 h-5 text-green-500" />
        ) : (
          <WifiOff className="w-5 h-5 text-red-500" />
        )}
        <div>
          <p className="font-medium text-gray-900">
            {isOnline ? 'Online' : 'Offline'}
          </p>
          <p className="text-sm text-gray-600">
            {isOnline 
              ? 'Connected to the internet' 
              : 'Working offline with cached content'
            }
          </p>
        </div>
      </div>

      {/* Installation Status */}
      <div className="flex items-center gap-3">
        {isInstalled ? (
          <Smartphone className="w-5 h-5 text-green-500" />
        ) : canInstall ? (
          <Download className="w-5 h-5 text-blue-500" />
        ) : (
          <Monitor className="w-5 h-5 text-gray-500" />
        )}
        <div>
          <p className="font-medium text-gray-900">
            {isInstalled ? 'Installed' : canInstall ? 'Installable' : 'Web App'}
          </p>
          <p className="text-sm text-gray-600">
            {isInstalled 
              ? 'Running as installed app'
              : canInstall 
                ? 'Can be installed to home screen'
                : 'Running in browser'
            }
          </p>
        </div>
      </div>

      {/* Service Worker Status */}
      <div className="flex items-center gap-3">
        {isRegistered ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <div>
          <p className="font-medium text-gray-900">Service Worker</p>
          <p className="text-sm text-gray-600">
            {isRegistered ? 'Active and registered' : 'Not registered'}
          </p>
        </div>
      </div>

      {/* Update Status */}
      {hasUpdate && (
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-yellow-500" />
          <div>
            <p className="font-medium text-gray-900">Update Available</p>
            <p className="text-sm text-gray-600">
              A new version is ready to install
            </p>
          </div>
        </div>
      )}

      {/* Capabilities */}
      {capabilities.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Offline Capabilities</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {capabilities.map((capability, index) => (
              <li key={index} className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                {capability}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status Summary */}
      <div className="pt-3 border-t border-gray-200">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
          isOnline && isRegistered 
            ? 'bg-green-100 text-green-800' 
            : !isOnline 
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isOnline && isRegistered 
              ? 'bg-green-500' 
              : !isOnline 
                ? 'bg-red-500'
                : 'bg-yellow-500'
          }`}></div>
          {getStatusText()}
        </div>
      </div>
    </div>
  )
} 