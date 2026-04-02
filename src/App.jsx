import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import BackgroundManager from './components/BackgroundManager';
import Home from './pages/Home';
import ProjectDetail from './pages/ProjectDetail';

function App() {
  const location = useLocation();
  const [effect, setEffect] = useState('dots'); // Default to dots
  
  // Dots Sandbox State
  const [dotCount, setDotCount] = useState(8000);
  const [dotSize, setDotSize] = useState(1);
  const [dotInteractive, setDotInteractive] = useState(true);

  return (
    <div className="app-container">
      <div className="canvas-container">
         <BackgroundManager effect={effect} dotProps={{count: dotCount, size: dotSize, interactive: dotInteractive}} />
      </div>
      
      <div className="content-wrapper">
        <nav className="main-nav brutalist-panel">
          <Link to="/" className="brand">JULES.</Link>
          <div className="nav-links">
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
          </div>
        </nav>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>

      {/* Switcher Panel */}
      <div className="switcher-panel brutalist-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
         <h4 style={{ margin: 0, paddingBottom: '0.5rem', borderBottom: '2px solid #000', width: '100%', marginBottom: '0.5rem' }}>3D Effect</h4>
         <div style={{ display: 'flex', gap: '0.5rem' }}>
           <button onClick={() => setEffect('cubes')} className="brutalist-button" style={{ background: effect === 'cubes' ? 'var(--accent)' : '#fff', padding: '0.5rem' }}>Cubes</button>
           <button onClick={() => setEffect('dots')} className="brutalist-button" style={{ background: effect === 'dots' ? 'var(--accent)' : '#fff', padding: '0.5rem' }}>Dots</button>
           <button onClick={() => setEffect('lines')} className="brutalist-button" style={{ background: effect === 'lines' ? 'var(--accent)' : '#fff', padding: '0.5rem' }}>Plexus</button>
         </div>
      </div>

      {/* Dots Sandbox UI in interactable dom layer */}
      {effect === 'dots' && (
        <div style={{
          position: 'fixed', 
          top: '2rem', 
          right: '2rem', 
          background: '#ffffff',
          border: '3px solid #000',
          boxShadow: '4px 4px 0px #000',
          padding: '1.5rem', 
          borderRadius: '12px',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
          zIndex: 9999
        }}>
           <h4 style={{ margin: 0, borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>Dots Sandbox</h4>
           
           <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 600 }}>
             Count: {dotCount}
             <input type="range" min="1000" max="25000" step="1000" value={dotCount} onChange={(e) => setDotCount(Number(e.target.value))} />
           </label>
           
           <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 600 }}>
             Scale: {dotSize}x
             <input type="range" min="0.1" max="5" step="0.1" value={dotSize} onChange={(e) => setDotSize(Number(e.target.value))} />
           </label>
           
           <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
             <input type="checkbox" checked={dotInteractive} onChange={(e) => setDotInteractive(e.target.checked)} />
             Interactive Gravity
           </label>
        </div>
      )}
    </div>
  );
}

export default App;
