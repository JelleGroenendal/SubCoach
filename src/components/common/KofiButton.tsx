import { useEffect, useRef } from "react";

declare global {
  interface Window {
    kofiwidget2?: {
      init: (text: string, color: string, id: string) => void;
      draw: () => void;
    };
  }
}

interface KofiButtonProps {
  text?: string;
  color?: string;
  kofiId?: string;
}

export function KofiButton({
  text = "Support me on Ko-fi",
  color = "#72a4f2",
  kofiId = "A0A31WEVPZ",
}: KofiButtonProps): React.ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Only load script once
    if (scriptLoadedRef.current) {
      // If script already loaded, just reinitialize
      if (window.kofiwidget2 && containerRef.current) {
        containerRef.current.innerHTML = "";
        window.kofiwidget2.init(text, color, kofiId);
        window.kofiwidget2.draw();
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://storage.ko-fi.com/cdn/widget/Widget_2.js";
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      if (window.kofiwidget2 && containerRef.current) {
        window.kofiwidget2.init(text, color, kofiId);
        window.kofiwidget2.draw();
      }
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove script on cleanup - it's cached and we might need it again
    };
  }, [text, color, kofiId]);

  return <div ref={containerRef} className="kofi-button-container" />;
}
