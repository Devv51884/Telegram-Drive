import React, { useEffect, useRef } from "react";

/**
 * Dynamically injects the Google AdSense script into document.head
 */
export function useAdSense(clientId, autoAds = false) {
  useEffect(() => {
    if (!clientId || typeof window === "undefined") return;

    // Clean up publisher ID format if user entered without "ca-"
    const cleanId = clientId.trim().startsWith("ca-pub-")
      ? clientId.trim()
      : clientId.trim().startsWith("pub-")
      ? `ca-${clientId.trim()}`
      : `ca-pub-${clientId.trim()}`;

    const existingScript = document.querySelector(`script[src*="pagead2.googlesyndication.com"]`);
    if (existingScript) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cleanId}`;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-ad-client", cleanId);

    document.head.appendChild(script);
  }, [clientId, autoAds]);
}

/**
 * Responsive Google AdSense Ad Unit Component
 */
export default function AdBanner({
  client,
  slot,
  format = "auto",
  responsive = "true",
  className = "",
  style = {}
}) {
  const adRef = useRef(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!client || !slot) return;

    // Ensure adsbygoogle is only called once per slot render
    if (!pushedRef.current) {
      try {
        if (typeof window !== "undefined") {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
          pushedRef.current = true;
        }
      } catch (e) {
        console.warn("AdSense push notice:", e.message);
      }
    }
  }, [client, slot]);

  if (!client || !slot) return null;

  const cleanClient = client.trim().startsWith("ca-pub-")
    ? client.trim()
    : client.trim().startsWith("pub-")
    ? `ca-${client.trim()}`
    : `ca-pub-${client.trim()}`;

  return (
    <div className={`w-full overflow-hidden text-center my-3 transition-all ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: "90px", ...style }}
        data-ad-client={cleanClient}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}

/**
 * Custom Raw Ad Snippet Renderer (for Adsterra, Monetag, custom HTML)
 */
export function CustomAdSnippet({ htmlCode, className = "" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !htmlCode) return;
    try {
      // Clear previous scripts
      containerRef.current.innerHTML = "";
      const range = document.createRange();
      range.selectNode(containerRef.current);
      const documentFragment = range.createContextualFragment(htmlCode);
      containerRef.current.appendChild(documentFragment);
    } catch (err) {
      console.warn("Custom ad snippet render error:", err.message);
    }
  }, [htmlCode]);

  if (!htmlCode) return null;

  return <div ref={containerRef} className={`w-full overflow-hidden text-center my-2 ${className}`} />;
}
