"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Users } from "lucide-react";

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
}

export class StudyGroupErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Study Group Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Auto-retry for network errors
    if (this.isNetworkError(error) && this.state.retryCount < 3) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
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
      'ENOTFOUND'
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
      this.handleRetry();
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
      const canRetry = this.state.retryCount < 3;

      return (
        <div className="flex flex-col h-full p-4 bg-background text-foreground rounded-lg">
          <Card className="p-6 text-center border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                <Users className="h-5 w-5" />
                Study Groups Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {isNetworkError 
                  ? "Having trouble connecting to study groups. This usually resolves quickly."
                  : "Something went wrong loading study groups. This might be due to:"
                }
              </p>
              
              {!isNetworkError && (
                <ul className="text-sm text-left text-muted-foreground space-y-1">
                  <li>• Database connection issues</li>
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

export default StudyGroupErrorBoundary;

