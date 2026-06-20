import type { MetadataRoute } from "next";

/**
 * Web App Manifest — makes CallFin installable ("Add to Home Screen") and run
 * in a standalone, app-like window. Served at /manifest.webmanifest (already
 * allow-listed in proxy.ts).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CallFin — AI Finance Assistant",
    short_name: "CallFin",
    description:
      "Chat to record transactions, track budgets & goals, and get instant AI financial insights.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#3B82F6",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
