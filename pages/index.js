import dynamic from 'next/dynamic'

// SSR komplett deaktiviert: Diese App ist eine reine Client-/Desktop-Anwendung.
// Ohne SSR gibt es keine Hydration-Mismatches mehr — in der gepackten Electron-App
// (Mac .dmg / Windows .exe) hatte SSR dazu gefuehrt, dass React nicht hydratisierte
// und alle Buttons tot waren (Hover/CSS ging, Klick/JS nicht).
const AppInner = dynamic(() => import('../components/AppInner'), { ssr: false })

export default function Home() {
  return <AppInner />
}
