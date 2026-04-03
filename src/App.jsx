import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import BackgroundManager from './components/BackgroundManager';
import Home from './pages/Home';
import ProjectDetail from './pages/ProjectDetail';
import Resume from './pages/Resume';

function ClickEffectLayer({ particles, type }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999, pointerEvents: 'none' }}>
       <AnimatePresence>
         {particles.map(p => (
           <React.Fragment key={p.id}>
           
             {/* RIPPLE BUTTON (Element Fit) */}
             {type === 'ripple-button' && p.type === 'button' && (
                <motion.div
                  initial={{ opacity: 0.6, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.15 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{ position: 'absolute', top: p.rect.top, left: p.rect.left, width: p.rect.width, height: p.rect.height, border: '4px solid var(--text-primary)', borderRadius: p.br || '8px', transformOrigin: 'center', pointerEvents: 'none' }}
                />
             )}
             
             {/* RIPPLE POINT (Circular Wave) */}
             {(type === 'ripple-point' || (type === 'ripple-button' && p.type === 'point')) && (
                <motion.div
                  initial={{ width: 0, height: 0, opacity: 0.6 }}
                  animate={{ width: 60, height: 60, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{ position: 'absolute', top: p.y, left: p.x, border: '3px solid var(--text-primary)', borderRadius: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
                />
             )}

             {/* RIPPLE DOUBLE */}
             {type === 'ripple-double' && (
                <>
                  <motion.div initial={{ width: 0, height: 0, opacity: 0.8 }} animate={{ width: 80, height: 80, opacity: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} style={{ position: 'absolute', top: p.y, left: p.x, border: '3px solid var(--text-primary)', borderRadius: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
                  <motion.div initial={{ width: 0, height: 0, opacity: 0.8 }} animate={{ width: 60, height: 60, opacity: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }} style={{ position: 'absolute', top: p.y, left: p.x, border: '3px dashed var(--accent)', borderRadius: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
                </>
             )}

             {/* SUNBURST MONOCHROME */}
             {type === 'sunburst-monochrome' && (
                [...Array(8)].map((_, i) => (
                  <div key={`${p.id}-${i}`} style={{ position: 'absolute', top: p.y, left: p.x, transform: `rotate(${i * 45}deg)` }}>
                    <motion.div initial={{ x: 10, width: 0, opacity: 1 }} animate={{ x: 40, width: [0, 15, 0], opacity: [1, 1, 0] }} transition={{ duration: 0.4, ease: 'easeOut', times: [0, 0.4, 1] }} style={{ height: '3px', background: 'var(--text-primary)', borderRadius: '1.5px', translateY: '-50%' }} />
                  </div>
                ))
             )}

             {/* SUNBURST COLORFUL */}
             {type === 'sunburst-color' && (
                [...Array(6)].map((_, i) => (
                  <div key={`${p.id}-${i}`} style={{ position: 'absolute', top: p.y, left: p.x, transform: `rotate(${i * 60 + (p.id % 30)}deg)` }}>
                    <motion.div initial={{ x: 20, width: 0, opacity: 1, scale: 1 }} animate={{ x: [20, 50, 70], width: [0, 30, 0], opacity: [1, 1, 0], scale: [1, 1, 0] }} transition={{ duration: 0.35, ease: 'easeOut', times: [0, 0.4, 1] }} style={{ height: '10px', background: i % 2 === 0 ? 'var(--accent)' : 'var(--accent-purple)', border: '2.5px solid #000', translateY: '-50%' }} />
                  </div>
                ))
             )}

             {/* SUNBURST RETRO SVG STAR */}
             {type === 'sunburst-retro' && (
                 <motion.div initial={{ scale: 0.2, opacity: 1, rotate: (p.id % 45) }} animate={{ scale: [0.2, 1.5, 2], opacity: [1, 1, 0] }} transition={{ duration: 0.4, ease: 'easeOut', times: [0, 0.3, 1] }} style={{ position: 'absolute', top: p.y, left: p.x, transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
                    <svg width="80" height="80" viewBox="0 0 100 100" overflow="visible"><path d="M50 0 L58 38 L95 25 L65 55 L100 80 L62 70 L50 100 L38 70 L0 80 L35 55 L5 25 L42 38 Z" fill="var(--accent)" stroke="#000" strokeWidth="4" strokeLinejoin="miter"/></svg>
                 </motion.div>
             )}
             
           </React.Fragment>
         ))}
       </AnimatePresence>
    </div>
  );
}

const AnimatedRouteWrapper = ({ children, styleType, clickPos }) => {
  if (styleType === 'none') {
    return <motion.div initial={{opacity:1}} animate={{opacity:1}} exit={{opacity:0, transition:{duration:0}}} style={{width: '100%'}}>{children}</motion.div>;
  }
  if (styleType === 'fast') {
    return <motion.div initial={{opacity:0, y:15}} animate={{opacity:1, y:0, transition: {duration: 0.15}}} exit={{opacity:0, y:-15, transition: {duration: 0.1}}} style={{width: '100%'}}>{children}</motion.div>;
  }
  if (styleType === 'fade') {
    return <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0, transition: {duration: 0.3}}} exit={{opacity:0, y:-20, transition: {duration: 0.2}}} style={{width: '100%'}}>{children}</motion.div>;
  }
  if (styleType === 'slide') {
    return <motion.div initial={{opacity:0, x:'100vw'}} animate={{opacity:1, x:0, transition: {type:'spring', stiffness:100, damping:15}}} exit={{opacity:0, x:'-100vw', transition: {duration: 0.2}}} style={{width: '100%'}}>{children}</motion.div>;
  }
  if (styleType === 'iris') {
    return (
       <motion.div style={{width: '100%'}}>
          <motion.div exit={{ opacity: 1, transition: { duration: 0.5 } }}>
             {children}
          </motion.div>
          <svg style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999, pointerEvents: 'none' }}>
             <defs>
                <mask id="iris-mask">
                   <rect width="100%" height="100%" fill="white" />
                   <motion.circle 
                      cx={clickPos.x} 
                      cy={clickPos.y} 
                      initial={{ r: 0 }} 
                      animate={{ r: 3000, transition: { duration: 0.4, ease: 'easeInOut' } }} 
                      exit={{ r: 0, transition: { duration: 0.3, ease: 'easeInOut' } }} 
                      fill="black" 
                   />
                </mask>
             </defs>
             <rect width="100%" height="100%" fill="var(--accent)" mask="url(#iris-mask)" />
          </svg>
       </motion.div>
    );
  }
  return <>{children}</>;
};

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
  const [layoutWidth, setLayoutWidth] = useState('1100px');
  const [transitionStyle, setTransitionStyle] = useState('fade');
  const [clickPos, setClickPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const [clickEffect, setClickEffect] = useState('none');
  const [clickParticles, setClickParticles] = useState([]);
  const clickEffectRef = useRef(clickEffect);
  clickEffectRef.current = clickEffect;

  useEffect(() => {
    const handleMouseDown = (e) => {
      setClickPos({ x: e.clientX, y: e.clientY });
      
      const effectType = clickEffectRef.current;
      if (effectType !== 'none') {
        const target = e.target.closest('button, a, .brutalist-panel');
        let particleData = { id: Date.now() + Math.random(), x: e.clientX, y: e.clientY, type: 'point' };
        
        if (target && effectType === 'ripple-button') {
           const rect = target.getBoundingClientRect();
           const br = window.getComputedStyle(target).borderRadius;
           particleData = { ...particleData, rect, br, type: 'button' };
        }
        
        setClickParticles(prev => [...prev, particleData]);
        setTimeout(() => {
           setClickParticles(prev => prev.filter(p => p.id !== particleData.id));
        }, 600);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--pop-size', `${popSize}px`);
    document.documentElement.style.setProperty('--pop-dir-x', popDirection === 'diagonal' ? '1' : '0');
    document.documentElement.style.setProperty('--pop-dir-y', '1');
    document.documentElement.style.setProperty('--layout-width', layoutWidth);
  }, [popSize, popDirection, layoutWidth]);

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
              <Route path="/" element={<AnimatedRouteWrapper styleType={transitionStyle} clickPos={clickPos}><Home /></AnimatedRouteWrapper>} />
              <Route path="/resume" element={<AnimatedRouteWrapper styleType={transitionStyle} clickPos={clickPos}><Resume /></AnimatedRouteWrapper>} />
              <Route path="/projects/:projectId" element={<AnimatedRouteWrapper styleType={transitionStyle} clickPos={clickPos}><ProjectDetail /></AnimatedRouteWrapper>} />
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
                   Page Transitions
                   <select value={transitionStyle} onChange={(e) => setTransitionStyle(e.target.value)} style={{ marginTop: '0.5rem', padding: '0.5rem', border: '2px solid #000', borderRadius: '6px', fontWeight: 'bold' }}>
                      <option value="none">Off (Instant)</option>
                      <option value="fast">Fast Fade</option>
                      <option value="fade">Smooth Fade</option>
                      <option value="slide">Brutal Slide</option>
                      <option value="iris">Cartoon Iris (Lime)</option>
                   </select>
                 </label>

                 <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 600, fontSize: '0.9rem' }}>
                   Visual Clicks
                   <select value={clickEffect} onChange={(e) => setClickEffect(e.target.value)} style={{ marginTop: '0.5rem', padding: '0.5rem', border: '2px solid #000', borderRadius: '6px', fontWeight: 'bold' }}>
                      <option value="none">Off</option>
                      <optgroup label="Sunbursts">
                        <option value="sunburst-monochrome">Monochrome Lines</option>
                        <option value="sunburst-color">Colorful Chunky</option>
                        <option value="sunburst-retro">Retro SVG Star</option>
                      </optgroup>
                      <optgroup label="Ripples">
                        <option value="ripple-point">Circular Wave</option>
                        <option value="ripple-button">Element Fit</option>
                        <option value="ripple-double">Double Echo</option>
                      </optgroup>
                   </select>
                 </label>

                 <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 600, fontSize: '0.9rem' }}>
                   Container Width
                   <select value={layoutWidth} onChange={(e) => setLayoutWidth(e.target.value)} style={{ marginTop: '0.5rem', padding: '0.5rem', border: '2px solid #000', borderRadius: '6px', fontWeight: 'bold' }}>
                      <option value="1100px">Standard (1100px)</option>
                      <option value="1400px">Wide (1400px)</option>
                      <option value="95%">Full Width (95%)</option>
                   </select>
                 </label>

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

      <ClickEffectLayer particles={clickParticles} type={clickEffect} />
    </div>
  );
}

export default App;
