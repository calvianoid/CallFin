import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Memungkinkan build verifikasi di lingkungan sandbox tanpa menyentuh .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Revamp IA: halaman lama digabung — Budget+Goals → /rencana,
  // Laporan+Kebebasan Finansial → /insight. Route lama tetap hidup
  // sebagai redirect agar bookmark/link lama tidak putus.
  async redirects() {
    return [
      { source: "/budgets", destination: "/rencana", permanent: false },
      { source: "/goals", destination: "/rencana?tab=goals", permanent: false },
      { source: "/reports", destination: "/insight", permanent: false },
      { source: "/freedom", destination: "/insight?tab=kebebasan", permanent: false },
    ];
  },
};

export default nextConfig;
