import { Component, type ReactNode, type ErrorInfo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryTranslations {
  title: string;
  description: string;
  details: string;
  tryAgain: string;
  reloadApp: string;
}

interface ErrorBoundaryInnerProps {
  children: ReactNode;
  fallback?: ReactNode;
  translations: ErrorBoundaryTranslations;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<
  ErrorBoundaryInnerProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryInnerProps) {
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

      const { translations: t } = this.props;

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">{t.title}</h1>
            <p className="mt-2 text-muted-foreground">{t.description}</p>
          </div>

          {this.state.error && (
            <details className="max-w-md rounded-lg border border-border bg-card p-4 text-sm">
              <summary className="cursor-pointer font-medium">
                {t.details}
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
              {t.tryAgain}
            </Button>
            <Button
              variant="default"
              size="xl"
              className="touch-manipulation"
              onClick={this.handleReload}
            >
              {t.reloadApp}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component that provides translations to the class component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ErrorBoundary({
  children,
  fallback,
}: ErrorBoundaryProps): ReactNode {
  const { t } = useTranslation();

  const translations: ErrorBoundaryTranslations = {
    title: t("error.title"),
    description: t("error.description"),
    details: t("error.details"),
    tryAgain: t("error.tryAgain"),
    reloadApp: t("error.reloadApp"),
  };

  return (
    <ErrorBoundaryInner fallback={fallback} translations={translations}>
      {children}
    </ErrorBoundaryInner>
  );
}
