import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initI18n } from "@/lib/i18n";
import { initializeTheme } from "@/lib/theme";
import { App } from "@/app/App";
import "./index.css";

// Initialize theme before rendering (prevents flash of wrong theme)
initializeTheme();

// Initialize i18n before rendering
initI18n();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
