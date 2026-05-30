import { ImageResponse } from "next/og";

export const alt = "CallFin — AI Finance Assistant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand colors (matching the app's primary blue + dark surface)
const BLUE = "#2563eb";
const BLUE_SOFT = "#3b82f6";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at 20% 15%, #1e293b 0%, #0b1220 55%, #060a14 100%)",
          padding: 72,
          fontFamily: "sans-serif",
          color: "#f8fafc",
        }}
      >
        {/* Top row: logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: BLUE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 12px 40px ${BLUE}66`,
            }}
          >
            {/* TrendingUp icon (lucide path) */}
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>
            CallFin
          </span>
        </div>

        {/* Center: headline + tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span
            style={{
              fontSize: 78,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Manage your money with AI
          </span>
          <span style={{ fontSize: 34, color: "#94a3b8", maxWidth: 880, lineHeight: 1.3 }}>
            Chat to record transactions, track budgets &amp; goals, and get
            instant financial insights.
          </span>
        </div>

        {/* Bottom row: feature pills + URL */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 16 }}>
            {["💬 Chat AI", "💸 Multi-wallet", "📊 Reports"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 26,
                  fontWeight: 600,
                  color: "#e2e8f0",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 999,
                  padding: "12px 26px",
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 30, fontWeight: 700, color: BLUE_SOFT }}>
            callfin.vercel.app
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
