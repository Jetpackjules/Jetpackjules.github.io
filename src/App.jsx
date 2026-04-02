import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import BackgroundManager from './components/BackgroundManager';
import Home from './pages/Home';
import ProjectDetail from './pages/ProjectDetail';
import Resume from './pages/Resume';

function App() {
  const location = useLocation();
  const [effect, setEffect] = useState('dots'); 
  const [showControls, setShowControls] = useState(false);
  
  const [dotCount, setDotCount] = useState(8000);
  const [dotSize, setDotSize] = useState(1);
  const [dotInteractive, setDotInteractive] = useState(true);

  // Global UI "Pop" config
  const [popSize, setPopSize] = useState(6);
  const [popDirection, setPopDirection] = useState('diagonal'); // 'diagonal' or 'below'

  useEffect(() => {
    document.documentElement.style.setProperty('--pop-size', `${popSize}px`);
    document.documentElement.style.setProperty('--pop-dir-x', popDirection === 'diagonal' ? '1' : '0');
    document.documentElement.style.setProperty('--pop-dir-y', '1');
  }, [popSize, popDirection]);

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
            <Link to="/resume" className={location.pathname === '/resume' ? 'active' : ''}>Resume</Link>
          </div>
        </nav>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>

      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowControls(!showControls)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 10000,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: showControls ? '#fff' : 'var(--accent)',
          border: '3px solid #000',
          boxShadow: 'var(--brutal-shadow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
          cursor: 'pointer',
          pointerEvents: 'auto',
          transition: 'background 0.2s'
        }}
      >
         {showControls ? '✖' : '⚙'}
      </motion.button>

      <AnimatePresence>
        {showControls && (
           <motion.div
             initial={{ opacity: 0, y: 20, scale: 0.95 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 20, scale: 0.95 }}
             transition={{ duration: 0.2 }}
             style={{
                position: 'fixed', 
                bottom: '6rem', 
                right: '2rem', 
                background: '#ffffff',
                border: '3px solid #000',
                boxShadow: 'var(--brutal-shadow)',
                padding: '1.5rem', 
                borderRadius: '12px',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.5rem',
                zIndex: 9999,
                pointerEvents: 'auto',
                minWidth: '270px',
                maxHeight: '80vh',
                overflowY: 'auto'
             }}
           >
             <div>
               <h4 style={{ margin: 0, paddingBottom: '0.5rem', borderBottom: '2px solid #000', marginBottom: '0.8rem', fontWeight: 800 }}>Background</h4>
               <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                 <button onClick={() => setEffect('cubes')} className="brutalist-button" style={{ background: effect === 'cubes' ? 'var(--accent-purple)' : '#fff', padding: '0.5rem 0.6rem', flex: 1 }}>Cubes</button>
                 <button onClick={() => setEffect('dots')} className="brutalist-button" style={{ background: effect === 'dots' ? 'var(--accent)' : '#fff', padding: '0.5rem 0.6rem', flex: 1 }}>Dots</button>
                 <button onClick={() => setEffect('lines')} className="brutalist-button" style={{ background: effect === 'lines' ? 'var(--accent-light)' : '#fff', padding: '0.5rem 0.6rem', flex: 1 }}>Plexus</button>
               </div>
             </div>
             
             {effect === 'dots' && (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem', borderTop: '2px dashed #000' }}>
                   <h4 style={{ margin: 0, fontWeight: 800 }}>Dots Tuner</h4>
                   <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 600, fontSize: '0.9rem' }}>
                     Density ({dotCount} particles)
                     <input type="range" min="1000" max="25000" step="1000" value={dotCount} onChange={(e) => setDotCount(Number(e.target.value))} style={{ marginTop: '0.5rem' }} />
                   </label>
                   <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 600, fontSize: '0.9rem' }}>
                     Scale Multiplier ({dotSize}x)
                     <input type="range" min="0.1" max="5" step="0.1" value={dotSize} onChange={(e) => setDotSize(Number(e.target.value))} style={{ marginTop: '0.5rem' }} />
                   </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginTop: '0.5rem', cursor: 'pointer' }}>
                     <input type="checkbox" checked={dotInteractive} onChange={(e) => setDotInteractive(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem', accentColor: '#000' }} />
                     Enable Gravity Ripple
                   </label>
               </div>
             )}

             {/* UI Drop Shadow Tweaker */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem', borderTop: '2px dashed #000' }}>
                 <h4 style={{ margin: 0, fontWeight: 800 }}>UI Tuning</h4>
                 <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 600, fontSize: '0.9rem' }}>
                   Element "Pop" Shadow ({popSize}px)
                   <input type="range" min="0" max="20" step="1" value={popSize} onChange={(e) => setPopSize(Number(e.target.value))} style={{ marginTop: '0.5rem' }} />
                 </label>
                 
                 <div style={{ display: 'flex', gap: '0.5rem' }}>
                   <button onClick={() => setPopDirection('diagonal')} className="brutalist-button" style={{ background: popDirection === 'diagonal' ? 'var(--accent)' : '#fff', padding: '0.4rem', flex: 1, fontSize: '0.8rem' }}>Diagonal</button>
                   <button onClick={() => setPopDirection('below')} className="brutalist-button" style={{ background: popDirection === 'below' ? 'var(--accent)' : '#fff', padding: '0.4rem', flex: 1, fontSize: '0.8rem' }}>Below</button>
                 </div>
             </div>

           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
