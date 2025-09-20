"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Users } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class StudyGroupErrorBoundary extends Component<Props, State> {
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
    const context = this.props.context || 'StudyGroup';
    console.error(`${context} error:`, error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Auto-retry for network errors after a delay
    if (this.isNetworkError(error) && this.state.retryCount < 2) {
      this.retryTimeout = setTimeout(() => {
        this.handleRetry();
      }, 3000);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  isNetworkError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return errorMessage.includes('fetch') || 
           errorMessage.includes('network') || 
           errorMessage.includes('connection') ||
           errorMessage.includes('timeout');
  }

  handleRetry = () => {
    this.setState(prevState => ({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error ? this.isNetworkError(this.state.error) : false;
      const context = this.props.context || 'Study Groups';

      return (
        <div className="flex flex-col h-full p-4 bg-background text-foreground rounded-lg overflow-hidden">
          <Card className="p-6 text-center border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {context} Unavailable
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-muted-foreground/50" />
              </div>
              
              <p className="text-muted-foreground">
                {isNetworkError 
                  ? "We're having trouble connecting to our servers. This usually resolves quickly."
                  : "Something went wrong while loading the study groups. Don't worry, your data is safe!"
                }
              </p>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <p>This might be due to:</p>
                <ul className="text-left space-y-1 max-w-xs mx-auto">
                  <li>• Temporary network issues</li>
                  <li>• Server maintenance</li>
                  <li>• Browser connectivity problems</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button 
                  onClick={this.handleRetry} 
                  variant="outline" 
                  className="flex items-center gap-2"
                  disabled={this.state.retryCount >= 3}
                >
                  <RefreshCw className="h-4 w-4" />
                  {this.state.retryCount >= 3 ? 'Max Retries Reached' : 'Try Again'}
                </Button>
                <Button 
                  onClick={this.handleRefresh} 
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
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
