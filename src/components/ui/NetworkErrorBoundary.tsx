'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showRetry?: boolean;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isOnline: boolean;
}

export class NetworkErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('NetworkErrorBoundary caught an error:', error, errorInfo);
    
    // Check if it's a network-related error
    if (this.isNetworkError(error)) {
      console.log('Network error detected');
    }
  }

  componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  handleOnline = () => {
    this.setState({ isOnline: true });
    
    // Auto-retry when coming back online if there was an error
    if (this.state.hasError) {
      setTimeout(() => {
        this.handleRetry();
      }, 1000);
    }
  };

  handleOffline = () => {
    this.setState({ isOnline: false });
  };

  isNetworkError(error: Error): boolean {
    const networkErrorMessages = [
      'fetch',
      'network',
      'connection',
      'timeout',
      'offline',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
    ];
    
    const errorMessage = error.message.toLowerCase();
    return networkErrorMessages.some(msg => errorMessage.includes(msg));
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleAutoRetry = (delay: number = 3000) => {
    const timeout = setTimeout(() => {
      if (this.state.isOnline) {
        this.handleRetry();
      }
    }, delay);
    
    this.retryTimeouts.push(timeout);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default network error UI
      const isNetworkError = this.state.error ? this.isNetworkError(this.state.error) : false;
      const isOffline = !this.state.isOnline;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
          <div className="mb-4">
            {isOffline ? (
              <WifiOff className="h-16 w-16 text-red-500 mx-auto mb-2" />
            ) : isNetworkError ? (
              <Wifi className="h-16 w-16 text-orange-500 mx-auto mb-2" />
            ) : (
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-2" />
            )}
          </div>
          
          <h3 className="text-xl font-semibold mb-2">
            {isOffline 
              ? 'No Internet Connection' 
              : isNetworkError 
              ? 'Connection Problem' 
              : 'Something Went Wrong'
            }
          </h3>
          
          <p className="text-muted-foreground mb-6 max-w-md">
            {isOffline 
              ? 'Please check your internet connection and try again.'
              : isNetworkError
              ? 'We\'re having trouble connecting to our servers. This usually resolves quickly.'
              : 'An unexpected error occurred. Please try refreshing the page.'
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            {(this.props.showRetry !== false) && (
              <Button 
                onClick={this.handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            
            <Button 
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              Refresh Page
            </Button>
          </div>

          {isNetworkError && this.state.isOnline && (
            <p className="text-xs text-muted-foreground mt-4">
              Auto-retrying in a few seconds...
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useNetworkError = () => {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};
