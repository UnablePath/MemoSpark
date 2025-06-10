"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaExclamationTriangle, FaRedo } from "react-icons/fa";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ConnectionsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Connections tab error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col h-full p-4 bg-background text-foreground rounded-lg overflow-hidden">
          <Card className="p-6 text-center border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                <FaExclamationTriangle className="h-5 w-5" />
                Connections Tab Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Something went wrong loading the connections tab. This might be due to:
              </p>
              <ul className="text-sm text-left text-muted-foreground space-y-1">
                <li>• Network connectivity issues</li>
                <li>• Browser memory constraints</li>
                <li>• Temporary loading errors</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={this.handleReset} variant="outline" className="flex items-center gap-2">
                  <FaRedo className="h-4 w-4" />
                  Try Again
                </Button>
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

export default ConnectionsErrorBoundary; 