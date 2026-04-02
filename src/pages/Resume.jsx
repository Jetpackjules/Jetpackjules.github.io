import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Resume() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'inline-block', fontWeight: 700, border: '2px solid #000', padding: '0.5rem 1rem', background: '#fff', borderRadius: '8px', boxShadow: '2px 2px 0px #000' }}>
          &larr; Back to Home
        </Link>
        <a href="/Resume_Jules_Ropars_SA.pdf" download style={{ textDecoration: 'none' }}>
           <button className="brutalist-button" style={{ padding: '0.8rem 1.5rem', background: 'var(--accent)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             &#128229; Download PDF
           </button>
        </a>
      </div>

      {/* Resume content wrapped in brutalist panels */}
      <div className="brutalist-panel" style={{ padding: '3rem', background: '#fff', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
         <div style={{ borderBottom: '4px solid #000', paddingBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '3.5rem', margin: '0 0 0.5rem 0', fontWeight: 900, letterSpacing: '-1px' }}>JULES ROPARS</h1>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              +1 (206) 714-5719 &nbsp;&bull;&nbsp; jropars@cs.washington.edu &nbsp;&bull;&nbsp; linkedin.com/in/jropars
            </p>
         </div>

         {/* Education */}
         <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--accent)', border: '2px solid #000' }}></span>
              EDUCATION
            </h2>
            <div style={{ borderLeft: '3px solid #000', paddingLeft: '1.5rem', marginLeft: '5px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                 <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>University of Washington<br/><span style={{ fontSize: '1rem', fontWeight: 600 }}>Paul Allen Institute of Computer Science</span></h3>
                 <span style={{ fontWeight: 800, background: 'var(--accent-light)', padding: '2px 8px', border: '2px solid #000', borderRadius: '4px' }}>Exp. Jun. 2027</span>
               </div>
               <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>Bachelor's, Computer Science (Data Science Focus) | GPA: 3.78</p>
               <p style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.5 }}><strong>Relevant Courses:</strong> Data Structures & Parallelism, Software Design & Implementation, Matrix Algebra with Applications, Hardware/Software Interface</p>
            </div>
         </div>

         {/* Experience */}
         <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--accent-purple)', border: '2px solid #000' }}></span>
              PROFESSIONAL EXPERIENCE
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', borderLeft: '3px solid #000', paddingLeft: '1.5rem', marginLeft: '5px' }}>
               
               <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>AUGER <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '1rem' }}>| Bellevue, WA</span></h3>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Mar 2025 – Sep 2025</span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0.5rem 0', fontWeight: 800, color: 'var(--accent-purple)' }}>AI Ontology & Software Engineering Intern</p>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.5 }}>
                    <li style={{ marginBottom: '0.5rem' }}>Built out ontology for AI data management and worked to centralize logistics data for pipeline ingestion.</li>
                    <li>Implemented production code for mass tagging of ontic logistics infrastructure in the supply chain.</li>
                  </ul>
               </div>

               <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>UW MAKEABILITY LAB <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '1rem' }}>| Seattle, WA</span></h3>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Sep 2024 – Mar 2025</span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0.5rem 0', fontWeight: 800, color: 'var(--accent-purple)' }}>Machine Learning Researcher</p>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.5 }}>
                    <li style={{ marginBottom: '0.5rem' }}>Developed alongside postgraduate students a tool to help wheelchair users navigate the world by using AI to mark sidewalks with curbs, wheelchair ramps, etc.</li>
                    <li>Accelerated nightly database clustering by ~500% applying Density-Based Spatial Clustering of Applications with Noise (DBSCAN).</li>
                  </ul>
               </div>

               <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>ABBOTT <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '1rem' }}>| Alameda, CA</span></h3>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Aug 2023 – Sep 2024</span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0.5rem 0', fontWeight: 800, color: 'var(--accent-purple)' }}>AI/ML and Data Science Intern</p>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.5 }}>
                    <li style={{ marginBottom: '0.5rem' }}>Designed and deployed a centralized intranet database (Elasticsearch + Kibana) for the Diabetes Division.</li>
                    <li style={{ marginBottom: '0.5rem' }}>Built program to continually consolidate and re-index data from out-scaled sources (e.g., excel, google sheets).</li>
                    <li>Enabled the dynamic data visualization of 30,000+ employee records, streamlining HR operations.</li>
                  </ul>
               </div>

               <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>NEOHACKS <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '1rem' }}>| Seattle, WA</span></h3>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Jun 2022 – Jul 2022</span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0.5rem 0', fontWeight: 800, color: 'var(--accent-purple)' }}>Organizer & Host</p>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.5 }}>
                    <li style={{ marginBottom: '0.5rem' }}>Hosted the 48-hour hackathon for over 500 participants globally.</li>
                    <li>Built the registration website, team management system, and participant database.</li>
                  </ul>
               </div>

            </div>
         </div>

         {/* Projects */}
         <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#FF9B71', border: '2px solid #000' }}></span>
              ML PROJECTS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr)', gap: '1.5rem' }}>
               <div style={{ border: '2px solid #000', padding: '1.5rem', borderRadius: '8px', boxShadow: '4px 4px 0px #000' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, fontSize: '1.1rem' }}>SIMULATED WITH REINFORCEMENT LEARNING <span style={{ color: 'var(--text-secondary)' }}>(NEAT)</span></h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Leveraged Godot game engine to showcase in real-time the creation and evolution of species based on different emergent behaviors.</p>
               </div>
               <div style={{ border: '2px solid #000', padding: '1.5rem', borderRadius: '8px', boxShadow: '4px 4px 0px #000' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, fontSize: '1.1rem' }}>FULLY AI-DRIVEN YT ACCOUNTS</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Built a system to automatically generate YouTube videos entirely using AI, adjusting dynamically to SEO. 15k+ daily views.</p>
               </div>
               <div style={{ border: '2px solid #000', padding: '1.5rem', borderRadius: '8px', boxShadow: '4px 4px 0px #000' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, fontSize: '1.1rem' }}>ML ASL TRANSCRIBER</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Trained computer vision model to transcribe American Sign Language for 2023 Dubhacks Hackathon.</p>
               </div>
               <div style={{ border: '2px solid #000', padding: '1.5rem', borderRadius: '8px', boxShadow: '4px 4px 0px #000' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, fontSize: '1.1rem' }}>CUSTOM LLM</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tuned a custom LLM using TensorFlow for a Seattle-based crypto marketplace (Nibiru).</p>
               </div>
            </div>
         </div>

         {/* Skills String */}
         <div style={{ background: '#f4f4f0', padding: '1.5rem', border: '3px solid #000', borderRadius: '8px', boxShadow: '4px 4px 0px #000' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}><strong>Core:</strong> Reinforcement Learning, AI, Databricks, SEO, REST APIs, AWS, Elasticsearch, PPO, NEAT, Database management</p>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}><strong>Languages:</strong> Python, JavaScript, Java, SQL, C/C++, HTML/CSS, TypeScript, R, MySQL</p>
            <p style={{ margin: 0, fontWeight: 600 }}><strong>Interests:</strong> Hackathons, Squash, Classical History, Personal Programming Projects</p>
         </div>

      </div>
    </motion.div>
  );
}
