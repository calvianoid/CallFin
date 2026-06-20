"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so CallFin is installable and works offline.
 * Production-only: a SW in dev caches hashed chunks and fights HMR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[pwa] service worker registration failed:", err);
      });
    };

    // The component often mounts AFTER the window 'load' event has already
    // fired (so a 'load' listener would never run) — register immediately in
    // that case, otherwise wait for load to avoid contending with first paint.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
