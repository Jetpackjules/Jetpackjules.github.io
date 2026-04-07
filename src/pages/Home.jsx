import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import RainWindow from '../components/RainWindow';

export const projectsData = [
  { id: 'neat-godot', title: 'NEAT Godot Repo', category: 'Game Dev / AI', desc: 'Implementing NeuroEvolution of Augmenting Topologies within the Godot Engine.', delay: 0.1 },
  { id: '25d-window', title: '2.5D Window System', category: 'Graphics', desc: 'An interactive 2.5D window management system built with real-time rendering logic.', delay: 0.2 },
  { id: 'squash', title: 'Squash Ball Tracker', category: 'Computer Vision', desc: 'Encoder-Decoder heatmap model with Kalman filtering tracking 40mm squash balls at high speeds.', delay: 0.3, image: 'wide%20squash%20gif.gif', headerImage: 'multi-ball%20squash%20gif.gif' },
  { id: 'rainy-day', title: 'Rainy Day New Tab', category: 'Chrome Extension', desc: 'A soothing neo-brutalist Chrome extension simulating realistic monitor rain with hyper-local real-time weather data.', delay: 0.4, image: 'header.mp4', headerImage: 'header.mp4' },
  { id: 'floating-cubes', title: 'Reactive Cubes', category: 'Web3D', desc: 'Performant InstancedMesh effects using React Three Fiber.', delay: 0.5 }
];

export default function Home() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.8fr) 2fr', gap: '2.5rem', width: '100%' }}>
      {/* LEFT COLUMN - Profile Box */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ duration: 0.4 }} 
        className="brutalist-panel" 
        style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: 'fit-content', gap: '0.8rem' }}
      >
        <div style={{ background: 'var(--accent-purple)', margin: '-1.5rem -1.5rem 0 -1.5rem', height: '140px', borderRadius: '10px 10px 0 0', borderBottom: 'var(--border-width) solid var(--border-color)' }}></div>
        <div style={{ width: '100px', height: '100px', borderRadius: '16px', background: 'var(--accent)', border: 'var(--border-width) solid var(--border-color)', marginTop: '-65px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', boxShadow: 'var(--brutal-shadow)' }}>
          👽
        </div>
        
        <div style={{ marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
           <h2 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>JULES ROPARS</h2>
           <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.95rem', margin: 0, lineHeight: 1.4 }}>
             Software Engineer<br/>UW Paul Allen Student
           </p>
           <p style={{ fontWeight: 600, margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
             Seattle, WA
           </p>
        </div>

        <Link to="/resume" style={{ textDecoration: 'none', margin: 0 }}>
           <button className="brutalist-button resume-btn" style={{ width: '100%', padding: '0.8rem', background: '#fff', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition: 'background 0.1s' }}>
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
             View Resume / CV
           </button>
        </Link>
        
        <div>
           <p style={{ fontWeight: 800, marginBottom: '0.8rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
             Connect with me
           </p>
           <div style={{ display: 'flex', gap: '0.8rem' }}>
             <a href="https://github.com/Jetpackjules" target="_blank" rel="noreferrer" style={{ width: '48px', height: '48px', border: 'var(--border-width) solid var(--border-color)', borderRadius: '12px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', boxShadow: 'var(--brutal-shadow)', transition: 'transform 0.1s, box-shadow 0.1s, background 0.1s' }} className="social-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
             </a>
             <a href="https://www.linkedin.com/in/jropars/" target="_blank" rel="noreferrer" style={{ width: '48px', height: '48px', border: 'var(--border-width) solid var(--border-color)', borderRadius: '12px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', boxShadow: 'var(--brutal-shadow)', transition: 'transform 0.1s, box-shadow 0.1s, background 0.1s' }} className="social-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
             </a>
             <a href="/assets/resume/Resume_Jules_Ropars_SA.pdf" download style={{ width: '48px', height: '48px', border: 'var(--border-width) solid var(--border-color)', borderRadius: '12px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', boxShadow: 'var(--brutal-shadow)', transition: 'transform 0.1s, box-shadow 0.1s, background 0.1s' }} className="social-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
             </a>
           </div>
           
           <style>{`
             .social-btn:hover { background: var(--accent-light) !important; transform: translate(calc(var(--pop-x) * -0.5), calc(var(--pop-y) * -0.5)); box-shadow: calc(var(--pop-x) * 1.5) calc(var(--pop-y) * 1.5) 0px #000; }
             .social-btn:active { box-shadow: 0px 0px 0px #000 !important; transform: translate(var(--pop-x), var(--pop-y)) !important; }
             .resume-btn:hover { background: var(--accent-light) !important; }
           `}</style>
        </div>
      </motion.div>

      {/* RIGHT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
           
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0 0 2.5rem 0', paddingBottom: '1rem', borderBottom: 'var(--border-width) dashed var(--border-color)' }}>
              <h2 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-1.5px', margin: 0, color: 'var(--text-primary)' }}>Projects Gallery</h2>
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
           </div>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
             {projectsData.map((p, i) => (
                <Link to={`/projects/${p.id}`} key={p.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <motion.div 
                    whileHover={{ y: -8, x: 'calc(var(--pop-dir-x) * -8px)', boxShadow: 'calc(var(--pop-dir-x) * 12px) calc(var(--pop-dir-y) * 12px) 0px #000' }}
                    whileTap={{ y: 'calc(var(--pop-dir-y) * 6px)', x: 'calc(var(--pop-dir-x) * 6px)', boxShadow: '0px 0px 0px #000', transition: { duration: 0.05 } }}
                    className="brutalist-panel" 
                    style={{ height: '360px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: 'calc(var(--pop-dir-x) * 6px) calc(var(--pop-dir-y) * 6px) 0px #000' }}
                  >
                     <div style={{ flex: 1, borderBottom: 'var(--border-width) solid var(--border-color)', position: 'relative', overflow: 'hidden', backgroundColor: ['var(--accent)', 'var(--accent-light)', 'var(--accent-purple)'][i%3] }}>
                        {p.id === 'rainy-day' ? (
                           <RainWindow bgIdClass={8} />
                        ) : (p.image || '').endsWith('.mp4') ? (
                           <video src={`/assets/projects/${p.id}/${p.image}`} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                           <div style={{ width: '100%', height: '100%', background: `url('/assets/projects/${p.id}/${p.image || 'placeholder_img_or_gif.gif'}') center/cover` }} />
                        )}
                     </div>
                     <div style={{ padding: '1.5rem', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', border: '2px solid #000', padding: '3px 8px', borderRadius: '4px', width: 'fit-content', marginBottom: '0.8rem', background: 'var(--bg-color)', boxShadow: 'var(--brutal-shadow)' }}>{p.category}</span>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.5px' }}>{p.title}</h4>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.desc}</p>
                     </div>
                  </motion.div>
                </Link>
             ))}
           </div>
        </motion.div>
      </div>
    </div>
  );
}
