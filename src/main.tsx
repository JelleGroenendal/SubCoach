import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initI18n } from "@/lib/i18n";
import { App } from "@/app/App";
import "./index.css";

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
