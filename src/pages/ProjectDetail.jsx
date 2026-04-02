import React from 'react';
import { Routes, Route, Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { projectsData } from './Home';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const project = projectsData.find(p => p.id === projectId) || { title: 'Not Found', desc: 'Project not found.' };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      style={{ width: '100%' }}
    >
      <Link to="/" style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem', fontWeight: 700, border: '2px solid #000', padding: '0.5rem 1rem', background: '#fff', borderRadius: '8px', boxShadow: '2px 2px 0px #000' }}>
        &larr; Back to Home
      </Link>
      
      <div className="brutalist-panel" style={{ padding: '3rem' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', fontWeight: 800 }}>{project.title}</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem', fontWeight: 600 }}>{project.desc}</p>
        
        <div style={{ width: '100%', height: '500px', background: 'var(--accent-light)', border: '3px solid #000', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.5rem', overflow: 'hidden' }}>
           <div style={{ padding: '2rem', background: '#fff', border: '3px solid #000', transform: 'rotate(-5deg)', boxShadow: '8px 8px 0px rgba(0,0,0,0.2)' }}>
              Project Media Showcase
           </div>
        </div>

        <div style={{ marginTop: '3rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1.8rem', fontWeight: 800 }}>Overview</h3>
          <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>
            This project represents a deep dive into technical problem solving and systematic architecture. 
            The goal was to create a robust and polished solution that addresses the specific needs in this domain. 
          </p>
        </div>
      </div>
    </motion.div>
  );
}
