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
        <div style={{ width: '100%', height: '350px', borderBottom: 'var(--border-width) solid var(--border-color)', backgroundColor: 'var(--accent-purple)', position: 'relative', overflow: 'hidden' }}>
           {(project.headerImage || project.image || '').endsWith('.mp4') ? (
              <video src={`/assets/projects/${projectId}/${project.headerImage || project.image}`} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
           ) : (
              <div style={{ width: '100%', height: '100%', background: `url('/assets/projects/${projectId}/${project.headerImage || project.image || 'placeholder_img_or_gif.gif'}') center/cover` }} />
           )}
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
                
                {/* Introduction */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                   <div>
                      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 1rem 0', letterSpacing: '-1px' }}>The Challenge</h3>
                      <p style={{ fontSize: '1.15rem', fontWeight: 500, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Given an image of a squash court, the objective is to accurately predict the location of the ball at all times. Unlike other sports, squash features an incredibly fast-moving target that is only 40mm in diameter. 
                      </p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                        This project tackles severe motion blur, challenging camera angles, and dynamic partial occlusions caused by players swinging at high speeds in an enclosed box.
                      </p>
                   </div>
                   <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/assets/projects/squash/wide%20squash%20gif.gif" alt="Squash gameplay" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.08)' }} />
                   </div>
                </div>

                {/* Dataset & Preprocessing */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                   <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/assets/projects/squash/slide_4_img_1.jpeg" alt="Canny Edge Filter" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
                   </div>
                   <div style={{ order: 1 }}>
                      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem 0', letterSpacing: '-1px' }}>Dataset & Pre-Processing</h3>
                      <span style={{ display: 'inline-block', fontWeight: 800, background: 'var(--accent)', padding: '4px 16px', border: '2px solid #000', borderRadius: '4px', marginBottom: '1.5rem' }}>RoboFlow + Canny Edge</span>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        We downloaded a custom dataset from RoboFlow consisting of 424 labeled images featuring wooden floors and static white walls, with at least 1+ balls manually labeled per frame.
                      </p>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                        To optimize performance, we implemented a <strong>Canny Edge Filter</strong> upstream in the pipeline. This isolates structural boundaries and filters out "obviously incorrect" edges (like the straight architectural lines of the court walls), helping the network's weights to efficiently converge on the ball's motion.
                      </p>
                   </div>
                </div>

                {/* Model Architecture */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                   <div>
                      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem 0', letterSpacing: '-1px' }}>Model Architecture</h3>
                      <span style={{ display: 'inline-block', fontWeight: 800, background: 'var(--accent-purple)', padding: '4px 16px', border: '2px solid #000', borderRadius: '4px', marginBottom: '1.5rem' }}>Encoder-Decoder Heatmap</span>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        We constructed a deep computer vision architecture utilizing an Encoder-Decoder model (incorporating structured downsampling followed by targeted upsampling) that predicts a dense confidence heatmap rather than simple bounding boxes.
                      </p>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                        We tuned a <strong>Modified Focal Loss</strong> function parameterized across Alpha, Beta, and Ball Position weights. We trained the network prioritizing the mitigation of false-negatives; ensuring the model prefers predicting harmless false-positives on the floor rather than dropping a true tracking frame.
                      </p>
                   </div>
                   <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/assets/projects/squash/slide_3_img_1.jpeg" alt="Heatmap Loss Architecture" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
                   </div>
                </div>

                {/* Temporal Persistence */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                   <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/assets/projects/squash/slide_5_img_1.jpeg" alt="Kalman Filter Diagram" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
                   </div>
                   <div style={{ order: 1 }}>
                      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem 0', letterSpacing: '-1px' }}>Temporal Persistence</h3>
                      <span style={{ display: 'inline-block', fontWeight: 800, background: 'var(--accent-light)', padding: '4px 16px', border: '2px solid #000', borderRadius: '4px', marginBottom: '1.5rem' }}>Kalman Filter Pipeline</span>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        When a player physically steps in front of the ball or severe motion blur destroys pixel continuity, the CV heatmap natively loses confidence. To structurally solve this localized occlusion, we routed the raw coordinate payload through a continuous kinematic <strong>Kalman Filter</strong>.
                      </p>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                        The filter leverages object velocity momentum to mathematically predict and maintain an accurate ball position even when individual frames suffer from poor or non-existent visual data.
                      </p>
                   </div>
                </div>

                {/* Results & Future Scope */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem', alignItems: 'center', marginTop: '2rem' }}>
                   <div style={{ textAlign: 'center' }}>
                      <h3 style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0 0 1rem 0', letterSpacing: '-1.5px' }}>Final Product</h3>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto 2rem auto' }}>
                        By combining our Encoder-Decoder heatmap generation with kinematic Kalman smoothing, the final network successfully tracks up to 5 overlapping balls at once through heavy motion blur.
                      </p>
                   </div>
                   
                   <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', maxWidth: '1000px' }}>
                      <img src="/assets/projects/squash/multi-ball%20squash%20gif.gif" alt="Live Demo Tracking" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
                   </div>

                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
                      <div className="brutalist-panel" style={{ background: '#fff', padding: '2.5rem' }}>
                         <h4 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Future: Generalization</h4>
                         <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '1.05rem', fontWeight: 500 }}>Train and test on diverse datasets across different court styles, ball colors, and camera angles to evaluate robust adaptability.</p>
                      </div>
                      <div className="brutalist-panel" style={{ background: '#fff', padding: '2.5rem' }}>
                         <h4 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Future: AI Referee</h4>
                         <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '1.05rem', fontWeight: 500 }}>Utilize real-time inference to train an automated Squash "Referee" that can tally points out-of-bounds, combined with player-pose identifiers to algorithmically classify obstruction calls.</p>
                      </div>
                   </div>

                   <div style={{ marginTop: '3rem', textAlign: 'center', opacity: 0.35, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Collaborators: Daniel Shubin, Lawrence Tan, Lyle Deng (Jules Ropars - CV Lead)
                   </div>
                </div>

             </div>
          )}

          {/* Rainy Day Chrome Extension */}
          {projectId === 'rainy-day' && (
             <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8rem' }}>
                
                {/* Introduction */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                   <div>
                      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 1rem 0', letterSpacing: '-1px' }}>The Concept</h3>
                      <p style={{ fontSize: '1.15rem', fontWeight: 500, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Rainy Day New Tab reimagines the standard Chrome browsing experience by turning your monitor into a dynamic, atmospheric windowpane.
                      </p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        It generates a hyper-realistic WebGL rain simulation that tracks continuously down your screen, providing a soothing lo-fi aesthetic whenever you open a new tab.
                      </p>
                      <a href="https://chromewebstore.google.com/detail/rainy-day-new-tab/eaaeknijfjmpcjdfnpkeghjioaebimjg" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                         <button className="brutalist-button" style={{ background: 'var(--accent)', fontSize: '1.1rem', padding: '1rem 2rem', border: '3px solid #000', fontWeight: 900, cursor: 'pointer', boxShadow: 'var(--brutal-shadow)' }}>
                           Download on Chrome Web Store →
                         </button>
                      </a>
                   </div>
                   <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <video src="/assets/projects/rainy-day/header.mp4" autoPlay loop muted playsInline style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
                   </div>
                </div>

                {/* Technical Features */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                   <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                      <img src="/assets/projects/rainy-day/screen_0.png" alt="Time Widget" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scale(1.1)' }} />
                      <img src="/assets/projects/rainy-day/screen_1.png" alt="Weather Widget" style={{ width: '200%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scale(1.1) translateX(-25%)' }} />
                   </div>
                   <div style={{ order: 1 }}>
                      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem 0', letterSpacing: '-1px' }}>Utility Modules</h3>
                      <span style={{ display: 'inline-block', fontWeight: 800, background: 'var(--accent-light)', padding: '4px 16px', border: '2px solid #000', borderRadius: '4px', marginBottom: '1.5rem' }}>Localized Data Pipelines</span>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        To ensure the extension was actually functional and not just aesthetic, I engineered distinct minimalist floating modules into the ecosystem.
                      </p>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                        Users can toggle a clock/time display, and uniquely, a real-time hyper-local weather integration pipeline that geolocates the client and fetches live precipitation and temperature data to natively match the visual vibe of the extension.
                      </p>
                   </div>
                </div>

                {/* Final Product */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem', alignItems: 'center', marginTop: '2rem' }}>
                   <div style={{ textAlign: 'center' }}>
                      <h3 style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0 0 1rem 0', letterSpacing: '-1.5px' }}>Final Product</h3>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto 2rem auto' }}>
                        The final packaged application successfully handles native simulated rain droplets, local data caching, and user preference persistence across the browser session natively without heavy performance overhead.
                      </p>
                   </div>
                   <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', maxWidth: '1000px' }}>
                      <video src="/assets/projects/rainy-day/trailer.mp4" autoPlay loop muted playsInline style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
                   </div>
                </div>

             </div>
          )}

          {/* Placeholder Fallback */}
          {projectId !== '25d-window' && projectId !== 'squash' && projectId !== 'rainy-day' && (
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
