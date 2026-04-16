import React from 'react'
import { Analytics } from '@vercel/analytics/react'

function App() {
  return (
    <div className="App">
      <header>
        <h1>BuildTrack AI - Construction Management System</h1>
      </header>
      <main>
        <p>Welcome to the Project Monitoring System</p>
      </main>
      <Analytics />
    </div>
  )
}

export default App
