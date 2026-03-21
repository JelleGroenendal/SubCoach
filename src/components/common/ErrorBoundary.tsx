import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">
              Something went wrong
            </h1>
            <p className="mt-2 text-muted-foreground">
              An unexpected error occurred. Your data is safe.
            </p>
          </div>

          {this.state.error && (
            <details className="max-w-md rounded-lg border border-border bg-card p-4 text-sm">
              <summary className="cursor-pointer font-medium">
                Error details
              </summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="xl"
              className="touch-manipulation"
              onClick={this.handleReset}
            >
              Try again
            </Button>
            <Button
              variant="default"
              size="xl"
              className="touch-manipulation"
              onClick={this.handleReload}
            >
              Reload app
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
