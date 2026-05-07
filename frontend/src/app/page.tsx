'use client'

import { useAppStore } from '@/store/useAppStore'
import { Sidebar } from '@/components/sidebar'
import { Canvas } from '@/components/canvas'
import { Preview } from '@/components/preview'

export default function Home() {
  const appState = useAppStore((state) => state.appState)

  return (
    <div className="app-layout">
      <Sidebar />
      <Canvas />
      {appState === 'previewing' && <Preview />}
    </div>
  )
}
