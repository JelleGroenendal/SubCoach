import { Suspense, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): ReactNode {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-background text-foreground">
            <div className="text-lg">Loading...</div>
          </div>
        }
      >
        {children}
      </Suspense>
    </I18nextProvider>
  );
}
