import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export const projectsData = [
  { id: 'neat-godot', title: 'NEAT Godot Repo', category: 'Game Dev / AI', desc: 'Implementing NeuroEvolution of Augmenting Topologies within the Godot Engine.', delay: 0.1 },
  { id: '25d-window', title: '2.5D Window System', category: 'Graphics', desc: 'An interactive 2.5D window management system built with real-time rendering logic.', delay: 0.2 },
  { id: 'floating-cubes', title: 'Reactive Cubes', category: 'Web3D', desc: 'Performant InstancedMesh effects using React Three Fiber.', delay: 0.3 }
];

export default function Home() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2.5fr', gap: '2rem', width: '100%' }}>
      {/* LEFT COLUMN - Profile Box */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ duration: 0.4 }} 
        className="brutalist-panel" 
        style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: 'fit-content', gap: '1rem' }}
      >
        <div style={{ background: 'var(--accent-purple)', margin: '-1.5rem -1.5rem 0 -1.5rem', height: '140px', borderRadius: '10px 10px 0 0', borderBottom: '3px solid #000' }}></div>
        <div style={{ width: '100px', height: '100px', borderRadius: '16px', background: 'var(--accent)', border: '3px solid #000', marginTop: '-65px', boxShadow: '4px 4px 0px #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
          👽
        </div>
        
        <div>
           <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.5rem 0 0 0', letterSpacing: '-1px' }}>JULES ROPARS</h2>
           <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.95rem', margin: '0.5rem 0', lineHeight: 1.4 }}>
             Creative Technologist | Engineer | 3D Architect
           </p>
           <p style={{ fontWeight: 600, margin: '0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
             &#128205; Seattle, WA
           </p>
        </div>
        
        <Link to="/resume" style={{ textDecoration: 'none' }}>
           <button className="brutalist-button" style={{ width: '100%', padding: '0.8rem', background: '#fff', fontSize: '1rem', marginTop: '0.5rem' }}>
             &#128196; View Resume / CV
           </button>
        </Link>
        
        <div style={{ borderTop: '3px solid #000', marginTop: '0.5rem', paddingTop: '1rem' }}>
           <p style={{ fontWeight: 800, marginBottom: '0.8rem', fontSize: '1rem' }}>Connect</p>
           <div style={{ display: 'flex', gap: '0.8rem' }}>
             <a href="https://github.com/Jetpackjules" target="_blank" rel="noreferrer" style={{ width: '45px', height: '45px', border: '3px solid #000', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', boxShadow: '2px 2px 0px #000', cursor: 'pointer', textDecoration: 'none', color: '#000' }}>
                GH
             </a>
             <a href="https://www.linkedin.com/in/jropars/" target="_blank" rel="noreferrer" style={{ width: '45px', height: '45px', border: '3px solid #000', borderRadius: '8px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', boxShadow: '2px 2px 0px #000', cursor: 'pointer', textDecoration: 'none', color: '#000' }}>
                IN
             </a>
           </div>
        </div>

        <div style={{ borderTop: '3px solid #000', marginTop: '0.5rem', paddingTop: '1rem' }}>
           <h3 style={{ fontSize: '1rem', margin: '0 0 0.8rem 0', fontWeight: 800 }}>&#128187; Core Skills</h3>
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
             {['React', 'Three.js', 'Godot', 'WebGL', 'Framer Motion', 'C#', 'TypeScript', 'C++'].map(s => (
               <span key={s} style={{ background: '#f4f4f0', padding: '0.3rem 0.6rem', border: '2px solid #000', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, boxShadow: '2px 2px 0px #000' }}>{s}</span>
             ))}
           </div>
        </div>
        
      </motion.div>

      {/* RIGHT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
           <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 1.5rem 0', letterSpacing: '-1px' }}>Projects Gallery &darr;</h2>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
             {projectsData.map((p, i) => (
                <Link to={`/projects/${p.id}`} key={p.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <motion.div 
                    whileHover={{ y: -5, x: -5, boxShadow: '10px 10px 0px #000' }}
                    className="brutalist-panel" 
                    style={{ height: '320px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.1s' }}
                  >
                     <div style={{ flex: 1, borderBottom: '3px solid #000', background: ['var(--accent)', 'var(--accent-light)', 'var(--accent-purple)'][i%3] }}>
                     </div>
                     <div style={{ padding: '1.5rem', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', border: '2px solid #000', padding: '2px 6px', borderRadius: '4px', width: 'fit-content', marginBottom: '0.5rem' }}>{p.category}</span>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, fontSize: '1.3rem' }}>{p.title}</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.desc}</p>
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
