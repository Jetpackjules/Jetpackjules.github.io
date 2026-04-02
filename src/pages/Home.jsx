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
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2.5fr', gap: '2rem', width: '100%' }}>
      {/* LEFT COLUMN - Profile Box */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ duration: 0.4 }} 
        className="brutalist-panel" 
        style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: 'fit-content' }}
      >
        <div style={{ background: 'var(--accent-purple)', margin: '-1.5rem -1.5rem 1.5rem -1.5rem', height: '140px', borderRadius: '10px 10px 0 0', borderBottom: '3px solid #000' }}></div>
        <div style={{ width: '100px', height: '100px', borderRadius: '16px', background: 'var(--accent)', border: '3px solid #000', marginTop: '-65px', marginBottom: '1rem', boxShadow: '4px 4px 0px #000' }}></div>
        
        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>JULES</h2>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
          Creative Technologist | Engineer | 3D Architect
        </p>
        
        <p style={{ fontWeight: 800, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Connect with me</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem' }}>
          {['GH', 'IN', 'X', 'CV'].map(icon => (
            <div key={icon} style={{ width: '45px', height: '45px', border: '3px solid #000', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', boxShadow: '2px 2px 0px #000', cursor: 'pointer' }}>
               {icon}
            </div>
          ))}
        </div>
        
        <p style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '1rem' }}>Contributions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '4px' }}>
          {[...Array(60)].map((_, i) => (
             <div key={i} style={{ aspectRatio: '1/1', background: Math.random() > 0.7 ? 'var(--accent)' : '#e0e0e0', border: '1px solid #000', borderRadius: '2px' }}></div>
          ))}
        </div>
      </motion.div>

      {/* RIGHT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Get to know me &darr;</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
             
             {/* Skills Bento */}
             <div className="brutalist-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800 }}>&#128187; Core Skills</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {['React', 'Three.js', 'Godot', 'WebGL', 'Framer Motion'].map(s => (
                    <span key={s} style={{ background: '#f4f4f0', padding: '0.4rem 0.8rem', border: '2px solid #000', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, boxShadow: '2px 2px 0px #000' }}>{s}</span>
                  ))}
                </div>
             </div>
             
             {/* Location Bento */}
             <div className="brutalist-panel" style={{ background: 'var(--accent)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800 }}>&#128205; Location</h3>
                <p style={{ fontWeight: 600, margin: 0 }}>Seattle, WA</p>
             </div>

          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}>
           <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Projects &darr;</h2>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
             {projectsData.map((p, i) => (
                <Link to={`/projects/${p.id}`} key={p.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <motion.div 
                    whileHover={{ y: -5, x: -5, boxShadow: '10px 10px 0px #000' }}
                    className="brutalist-panel" 
                    style={{ height: '300px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.1s' }}
                  >
                     <div style={{ flex: 1, borderBottom: '3px solid #000', background: ['var(--accent)', 'var(--accent-light)', 'var(--accent-purple)'][i%3] }}>
                        {/* Projects thumbnail placeholder */}
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
