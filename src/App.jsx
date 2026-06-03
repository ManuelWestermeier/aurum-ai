import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ChatPanel from './components/ChatPanel'
import { VisionPanel, AudioPanel, DocumentPanel, DiagramPanel, LearnPanel } from './components/Panels'

export default function App() {
  const [mode, setMode] = useState('chat')

  const panels = {
    chat: <ChatPanel />,
    vision: <VisionPanel />,
    audio: <AudioPanel />,
    document: <DocumentPanel />,
    diagram: <DiagramPanel />,
    learn: <LearnPanel />
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--black)', overflow: 'hidden' }}>
      <Sidebar activeMode={mode} onModeChange={setMode} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Header activeMode={mode} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {panels[mode] || panels.chat}
        </main>
      </div>
    </div>
  )
}
