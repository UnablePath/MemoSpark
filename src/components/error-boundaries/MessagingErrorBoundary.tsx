"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, MessageSquare, Wifi, WifiOff } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isOnline: boolean;
}

export class MessagingErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
    };
  }

  componentDidMount() {
    // Listen for online/offline events
    this.onlineListener = () => this.setState({ isOnline: true });
    this.offlineListener = () => this.setState({ isOnline: false });

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineListener);
      window.addEventListener('offline', this.offlineListener);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    if (this.onlineListener && typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineListener);
    }
    if (this.offlineListener && typeof window !== 'undefined') {
      window.removeEventListener('offline', this.offlineListener);
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Messaging Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Auto-retry for network errors when online
    if (this.isNetworkError(error) && this.state.retryCount < 3 && this.state.isOnline) {
      this.scheduleRetry();
    }
  }

  private isNetworkError(error: Error): boolean {
    const networkErrorMessages = [
      'Failed to fetch',
      'NetworkError',
      'fetch failed',
      'Connection failed',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
      'WebSocket',
      'realtime'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return networkErrorMessages.some(msg => errorMessage.includes(msg));
  }

  private scheduleRetry = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff, max 10s
    
    this.retryTimeout = setTimeout(() => {
      if (this.state.isOnline) {
        this.handleRetry();
      }
    }, delay);
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error ? this.isNetworkError(this.state.error) : false;
      const canRetry = this.state.retryCount < 3 && this.state.isOnline;

      return (
        <div className="flex flex-col h-full p-4 bg-background text-foreground rounded-lg">
          <Card className="p-6 text-center border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                <MessageSquare className="h-5 w-5" />
                Messaging Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                {this.state.isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">
                  {this.state.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <p className="text-muted-foreground">
                {!this.state.isOnline
                  ? "You're currently offline. Messages will sync when you're back online."
                  : isNetworkError 
                    ? "Having trouble connecting to messaging services. This usually resolves quickly."
                    : "Something went wrong with messaging. This might be due to:"
                }
              </p>
              
              {this.state.isOnline && !isNetworkError && (
                <ul className="text-sm text-left text-muted-foreground space-y-1">
                  <li>• Real-time connection issues</li>
                  <li>• Authentication problems</li>
                  <li>• Temporary service unavailability</li>
                </ul>
              )}

              {isNetworkError && this.state.retryCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  Auto-retry attempt {this.state.retryCount}/3
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry} 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {isNetworkError ? 'Retry Connection' : 'Try Again'}
                  </Button>
                )}
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="default"
                  className="flex items-center gap-2"
                >
                  Refresh Page
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm font-medium">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MessagingErrorBoundary;

