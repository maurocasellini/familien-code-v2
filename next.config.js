/** @type {import('next').NextConfig} */
const nextConfig = {
  // Wichtig fuer Electron: relative Asset-Pfade, kein CDN-Prefix.
  // Reduziert Hydration-Probleme in der gepackten App.
  reactStrictMode: false,
  // Komprimierung aus (Electron localhost braucht das nicht, vermeidet Edge-Cases)
  compress: false,
  // Keine Telemetrie-Header
  poweredByHeader: false,
}
module.exports = nextConfig
