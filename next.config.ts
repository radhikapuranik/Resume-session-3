import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) dynamically imports its worker relative to its
  // own file on disk; letting Turbopack/webpack bundle it breaks that lookup,
  // so keep it (and its native canvas dep) external to the server bundle.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
