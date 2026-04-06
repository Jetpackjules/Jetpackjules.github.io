import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { projectsData } from './Home';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const project = projectsData.find(p => p.id === projectId);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!project) return <div>Project not found</div>;

  return (
    <div style={{ width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <Link to="/" className="brutalist-button" style={{ background: '#fff' }}>
          &larr; Back to Gallery
        </Link>
      </div>

      <div className="brutalist-panel" style={{ padding: '0', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header Image Thumbnail directly pointing to the asset */}
        <div style={{ width: '100%', height: '350px', borderBottom: 'var(--border-width) solid var(--border-color)', backgroundColor: 'var(--accent-purple)', backgroundImage: `url('/assets/projects/${projectId}/${project.headerImage || project.image || 'placeholder_img_or_gif.gif'}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        </div>
        
        <div style={{ padding: '3.5rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div>
            <span className="brutalist-panel" style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', padding: '6px 12px', background: 'var(--accent)', display: 'inline-block', marginBottom: '1rem' }}>{project.category}</span>
            <h1 style={{ fontSize: '4.5rem', margin: '0 0 0.5rem 0', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1 }}>{project.title}</h1>
            <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{project.desc}</p>
          </div>

          {projectId === '25d-window' && (
             <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '6rem' }}>
                
                {/* Intro / Context */}
                <div style={{ borderLeft: 'var(--border-width) solid var(--accent)', paddingLeft: '2rem' }}>
                   <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Overview</h3>
                   <p style={{ fontSize: '1.2rem', fontWeight: 500, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                     This project explores <strong>Head-Coupled Perspective (HCP)</strong> to create a faux-3D window effect on flat displays. By continuously tracking the user's head position, the rendered projection scene dynamically skews to perfectly match the physical viewing angle, creating an optical illusion of depth inside your monitor format.
                   </p>
                </div>

                {/* Path 1 */}
                <div className="brutalist-panel" style={{ background: '#f4f4f0', padding: '2.5rem' }}>
                   <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 1fr', gap: '3rem', alignItems: 'center' }}>
                      <div className="brutalist-panel" style={{ width: '100%', height: '280px', padding: 0, background: `url('/assets/projects/25d-window/placeholder_img_or_gif.gif') center/cover` }} />
                      <div>
                         <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem 0', letterSpacing: '-1px' }}>Method 1:<br/> Single Display</h3>
                         <span style={{ display: 'inline-block', fontWeight: 800, background: 'var(--accent-purple)', padding: '2px 8px', border: '2px solid #000', borderRadius: '4px', marginBottom: '1rem' }}>Local Webcam Tracking</span>
                         <p style={{ fontWeight: 500, lineHeight: 1.5, fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
                           This method uses standard facial recognition via a local webcam to calculate eye position relative to a single fixed monitor. The camera frustum statically skews dynamically to match. <br/><br/><strong>Zero physical calibration required!</strong> It is the easiest entry point for a stunning 2.5D visual.
                         </p>
                      </div>
                   </div>
                </div>

                {/* Path 2 */}
                <div>
                   <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                      <span style={{ display: 'inline-block', fontWeight: 800, background: 'var(--accent-light)', padding: '4px 12px', border: '2px solid #000', borderRadius: '4px', marginBottom: '1rem' }}>Advanced Implementation</span>
                      <h3 style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0', letterSpacing: '-1.5px' }}>Method 2:<br/> Multi-Screen & ArUco</h3>
                   </div>
                   
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
                      {/* Step A */}
                      <div className="brutalist-panel" style={{ padding: '2rem', background: '#fff' }}>
                         <div className="brutalist-panel" style={{ width: '100%', height: '250px', padding: 0, background: `url('/assets/projects/25d-window/placeholder_img_or_gif.gif') center/cover`, marginBottom: '1.5rem' }} />
                         <h4 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>1. Space Calibration</h4>
                         <p style={{ margin: 0, fontWeight: 500, lineHeight: 1.5, color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                           Utilizing ArUco markers to map out the physical offsets of multiple screens in true 3D space, capturing real-world window coordinates and spatial relationships.
                         </p>
                      </div>

                      {/* Step B */}
                      <div className="brutalist-panel" style={{ padding: '2rem', background: '#fff' }}>
                         <div className="brutalist-panel" style={{ width: '100%', height: '250px', padding: 0, background: `url('/assets/projects/25d-window/placeholder_img_or_gif.gif') center/cover`, marginBottom: '1.5rem' }} />
                         <h4 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>2. Mobile Perspective Tracking</h4>
                         <p style={{ margin: 0, fontWeight: 500, lineHeight: 1.5, color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                           Streaming precise 6-DOF positional data from an iPhone across the local network to perfectly align the frustum across all calibrated screens simultaneously.
                         </p>
                      </div>
                   </div>
                </div>

             </div>
          )}

          {/* Squash Ball Tracker */}
          {projectId === 'squash' && (
             <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8rem' }}>
                
                {/* The Challenge */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                   <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                         <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>The Challenge</h3>
                         <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', border: '2px solid var(--border-color)', padding: '4px 10px', borderRadius: '6px' }}>In collaboration with Lawrence & Daniel</span>
                      </div>
                      <p style={{ fontSize: '1.15rem', fontWeight: 500, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Given an image of a squash court, the objective is to accurately predict the location of the ball at all times. Unlike other sports, squash features an incredibly fast-moving target that is only 40mm in diameter. 
                      </p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                        This project tackles severe motion blur, challenging camera angles, and dynamic partial occlusions caused by players. We trained on a custom dataset of 424 labeled images from RoboFlow featuring heavy wooden flooring and strict white boundary walls.
                      </p>
                   </div>
                   <div className="brutalist-panel" style={{ width: '100%', height: '400px', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/assets/projects/squash/wide%20squash%20gif.gif" alt="Squash gameplay" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                   </div>
                </div>

                {/* Heatmap Generation */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                   <div className="brutalist-panel" style={{ width: '100%', height: '400px', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/assets/projects/squash/multi-ball%20squash%20gif.gif" alt="Multi-ball tracking heatmap" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                   </div>
                   <div style={{ order: 1 }}>
                      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem 0', letterSpacing: '-1px' }}>Heatmap Generation</h3>
                      <span style={{ display: 'inline-block', fontWeight: 800, background: 'var(--accent-purple)', padding: '2px 8px', border: '2px solid #000', borderRadius: '4px', marginBottom: '1.5rem' }}>Encoder-Decoder Model</span>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        We constructed a deep computer vision architecture that predicts a dense confidence heatmap rather than simple bounding boxes. By utilizing an Encoder-Decoder model, the network flawlessly tracks multiple overlapping moving targets simultaneously.
                      </p>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                        To optimize performance, we implemented a <strong>Canny Edge Filter</strong> upstream in the pipeline. This actively isolates structural boundaries and filters out strict unmoving lines (like court walls), forcing the network's weights to successfully converge entirely on rapid organic motion.
                      </p>
                   </div>
                </div>

                {/* Kalman Filtering */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                   <div>
                      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem 0', letterSpacing: '-1px' }}>Temporal Persistence</h3>
                      <span style={{ display: 'inline-block', fontWeight: 800, background: 'var(--accent-light)', padding: '2px 8px', border: '2px solid #000', borderRadius: '4px', marginBottom: '1.5rem' }}>Kalman Filter Pipeline</span>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        When a player physically steps in front of the ball, the CV heatmap natively loses confidence. To solve this occlusion, we routed the raw coordinate payload through a continuous kinematic Kalman Filter.
                      </p>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                        The filter leverages object velocity momentum to mathematically predict the ball's position even during total visual occlusion. Furthermore, we aggressively biased the Modified Focal Loss parameters, guaranteeing the model prefers predicting harmless false-positives on the wooden floor over prematurely dropping a true-positive tracking frame.
                      </p>
                   </div>
                   <div className="brutalist-panel" style={{ width: '100%', height: '400px', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/assets/projects/squash/slide_5_img_1.jpeg" alt="Kalman Filter Diagram" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                   </div>
                </div>

             </div>
          )}

          {/* Placeholder Fallback */}
          {projectId !== '25d-window' && projectId !== 'squash' && (
             <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="brutalist-panel" style={{ width: '100%', height: '400px', background: `url('/assets/projects/${projectId}/placeholder_img_or_gif.gif') center/cover` }}></div>
                <p style={{ fontSize: '1.2rem', fontWeight: 500, lineHeight: 1.6 }}>
                  Project breakdown template payload for {project.title}. Detailed gifs and text will be inserted here following the neo-brutalist styling map.
                </p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
