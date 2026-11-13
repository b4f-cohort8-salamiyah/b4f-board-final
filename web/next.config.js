/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server Actions default to same-origin protection in Next 14 — do not widen
  // allowedOrigins unless an actual deployment topology requires it (see
  // specification/FRONTEND-ARCHITECTURE.md, "Web session architecture").
};

module.exports = nextConfig;
