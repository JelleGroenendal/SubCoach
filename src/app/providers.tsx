import { Suspense, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { PWAUpdatePrompt } from "@/components/common/PWAUpdatePrompt";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): ReactNode {
  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <Suspense
          fallback={
            <div className="flex h-screen items-center justify-center bg-background text-foreground">
              <div className="text-lg">Loading...</div>
            </div>
          }
        >
          <OfflineIndicator />
          {children}
          <PWAUpdatePrompt />
        </Suspense>
      </I18nextProvider>
    </ErrorBoundary>
  );
}
