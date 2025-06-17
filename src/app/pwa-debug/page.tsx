'use client'

import { useEffect, useState } from 'react'

interface DebugInfo {
  manifestUrl?: string
  manifestResponse?: any
  manifestError?: string
  userAgent?: string
  isAuthenticated?: boolean
}

export default function PWADebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({})
  const [loading, setLoading] = useState(false)

  const testManifest = async () => {
    setLoading(true)
    try {
      const manifestUrl = '/manifest.webmanifest'
      console.log('Testing manifest at:', manifestUrl)

      const response = await fetch(manifestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/manifest+json',
        }
      })

      console.log('Manifest response status:', response.status)
      console.log('Manifest response headers:', Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const manifestData = await response.json()
        setDebugInfo(prev => ({
          ...prev,
          manifestUrl,
          manifestResponse: manifestData,
          manifestError: undefined
        }))
      } else {
        const errorText = await response.text()
        setDebugInfo(prev => ({
          ...prev,
          manifestUrl,
          manifestError: `${response.status}: ${errorText.substring(0, 200)}...`
        }))
      }
    } catch (error) {
      console.error('Manifest test error:', error)
      setDebugInfo(prev => ({
        ...prev,
        manifestError: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
    setLoading(false)
  }

  const testAPI = async () => {
    try {
      const response = await fetch('/api/test-manifest')
      const data = await response.json()
      console.log('API test result:', data)
    } catch (error) {
      console.error('API test error:', error)
    }
  }

  useEffect(() => {
    setDebugInfo({
      userAgent: navigator.userAgent,
      isAuthenticated: document.cookie.includes('__session') || document.cookie.includes('__clerk'),
    })
  }, [])

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold">PWA Debug Information</h1>

      <div className="grid gap-6">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Environment Info</h2>
          <pre className="text-sm overflow-auto">
{JSON.stringify({
  url: typeof window !== 'undefined' ? window.location.href : 'SSR',
  userAgent: debugInfo.userAgent,
  isAuthenticated: debugInfo.isAuthenticated,
}, null, 2)}
          </pre>
        </div>

        <div className="bg-blue-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Manifest Test</h2>
          <div className="flex gap-2 mb-4">
            <button
              onClick={testManifest}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Manifest'}
            </button>
            <button
              onClick={testAPI}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Test API Route
            </button>
          </div>

          {debugInfo.manifestError && (
            <div className="bg-red-100 p-3 rounded text-red-800 mb-4">
              <strong>Error:</strong> {debugInfo.manifestError}
            </div>
          )}

          {debugInfo.manifestResponse && (
            <div className="bg-green-100 p-3 rounded">
              <strong>Success!</strong> Manifest loaded:
              <pre className="text-sm mt-2 overflow-auto">
                {JSON.stringify(debugInfo.manifestResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-yellow-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Quick Links</h2>
          <div className="space-y-2">
            <a 
              href="/manifest.webmanifest" 
              target="_blank"
              className="block text-blue-600 underline"
            >
              Direct Manifest Link
            </a>
            <a 
              href="/sw.js" 
              target="_blank"
              className="block text-blue-600 underline"
            >
              Service Worker Link
            </a>
            <a 
              href="/api/test-manifest" 
              target="_blank"
              className="block text-blue-600 underline"
            >
              API Test Route
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 