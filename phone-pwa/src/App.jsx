import React from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Marquee from './components/Marquee'
import StatusSection from './components/StatusSection'
import PendingActionsSection from './components/PendingActionsSection'
import SecuritySection from './components/SecuritySection'
import Footer from './components/Footer'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <Header />
      <main>
        <Hero />
        <Marquee />
        <StatusSection />
        <PendingActionsSection />
        <SecuritySection />
      </main>
      <Footer />
    </div>
  )
}

export default App
