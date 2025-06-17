'use client'

import React from 'react'

interface PWAErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface PWAErrorBoundaryProps {
  children: React.ReactNode
}

export class PWAErrorBoundary extends React.Component<
  PWAErrorBoundaryProps,
  PWAErrorBoundaryState
> {
  constructor(props: PWAErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): PWAErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log PWA-related errors
    console.error('PWA Error:', error, errorInfo)
    
    // In production, you might want to report this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      // errorReporting.captureException(error, { extra: errorInfo })
    }
  }

  render() {
    if (this.state.hasError) {
      // Render a minimal fallback that doesn't break the app
      return (
        <div className="fixed bottom-4 right-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                PWA Feature Unavailable
              </h3>
              <p className="mt-1 text-sm text-red-700">
                Some offline features may not work properly.
              </p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="mt-2 text-sm text-red-600 underline hover:text-red-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
} 