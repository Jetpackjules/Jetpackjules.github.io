import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import RainWindow from '../components/RainWindow';
import { projectsData } from './Home';

const windowProjectAssetBase = '/assets/projects/25d-window';

function WindowPlaceholderMedia({ label }) {
  return (
    <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={`${windowProjectAssetBase}/placeholder_img_or_gif.gif`} alt={label} style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
    </div>
  );
}

function FishTankMedia({ label }) {
  return (
    <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video src={`${windowProjectAssetBase}/fish-tank-thumb.mp4`} poster={`${windowProjectAssetBase}/fish-tank-thumb.webp`} autoPlay loop muted playsInline preload="metadata" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} aria-label={label} />
    </div>
  );
}

function WindowWriteupSection({ title, tag, children, media, reverse = false }) {
  const textBlock = (
    <div>
      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem 0', letterSpacing: '-1px' }}>{title}</h3>
      {tag && (
        <span style={{ display: 'inline-block', fontWeight: 800, background: 'var(--accent)', padding: '4px 16px', border: '2px solid #000', borderRadius: '4px', marginBottom: '1.5rem' }}>
          {tag}
        </span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
      {reverse ? (
        <>
          {media}
          <div style={{ order: 1 }}>{textBlock}</div>
        </>
      ) : (
        <>
          {textBlock}
          {media}
        </>
      )}
    </div>
  );
}

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
           {projectId === 'rainy-day' ? (
              <RainWindow bgIdClass={15} />
           ) : (project.headerImage || project.image || '').endsWith('.mp4') ? (
              <video src={`/assets/projects/${projectId}/${project.headerImage || project.image}`} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
           ) : (
              <div style={{ width: '100%', height: '100%', background: `url('/assets/projects/${projectId}/${project.headerImage || project.image || 'placeholder_img_or_gif.gif'}') center/cover` }} />
           )}
        </div>
        
        <div style={{ padding: '3.5rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {project.category.split(' / ').map(cat => (
                <span key={cat} className="brutalist-panel" style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', padding: '6px 12px', background: 'var(--accent)', display: 'inline-block' }}>
                  {cat}
                </span>
              ))}
            </div>
            <h1 style={{ fontSize: '4.5rem', margin: '0 0 0.5rem 0', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1 }}>{project.title}</h1>
            <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{project.desc}</p>
          </div>

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
                      <img src="/assets/projects/squash/slide_3_img_1.jpeg" alt="Heatmap Loss Architecture" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
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
                      <img src="/assets/projects/squash/slide_5_img_1.jpeg" alt="Heatmap Loss Architecture" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
                   </div>
                </div>

                {/* Temporal Persistence */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                   <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/assets/projects/squash/wide%20squash%20gif.gif" alt="Kalman Filter Diagram Substitution" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
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
                      <h3 style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0 0 1rem 0', letterSpacing: '-1.5px' }}>Multi-ball Tracking</h3>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto 2rem auto' }}>
                        The final Kalman-filtered Heatmap pipeline successfully maintained target locks through extreme high-speed crossover events and transient occlusion with a completely stabilized bounding box.
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

                   <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ 
                        border: '2px solid var(--border-color)', 
                        background: '#fff', 
                        padding: '0.6rem 1.2rem', 
                        borderRadius: '20px', 
                        color: 'var(--text-secondary)', 
                        fontSize: '0.95rem', 
                        fontWeight: 800, 
                        boxShadow: '2px 2px 0px #000' 
                      }}>
                        Collaborators: Daniel Shubin, Jules Ropars, Lawrence Tan, Lyle Deng
                      </span>
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
                   </div>
                   <div className="brutalist-panel" style={{ width: '100%', height: '350px', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <RainWindow bgIdClass={8} />
                   </div>
                </div>

                {/* Technical Features */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                   <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <video src="/assets/projects/rainy-day/custom_demo.mp4" autoPlay loop muted playsInline style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
                   </div>
                   <div style={{ order: 1 }}>
                      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem 0', letterSpacing: '-1px' }}>Customisation</h3>
                      <span style={{ display: 'inline-block', fontWeight: 800, background: 'var(--accent-light)', padding: '4px 16px', border: '2px solid #000', borderRadius: '4px', marginBottom: '1.5rem' }}>Interface Settings</span>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        To make it a dedicated utility space, I added customizable settings allowing users to visually toggle different floating widgets across the window layout.
                      </p>
                      <p style={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                        You can opt in to show the current time alongside live weather information for the day.
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
                      <a href="https://chromewebstore.google.com/detail/rainy-day-new-tab/eaaeknijfjmpcjdfnpkeghjioaebimjg" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                         <button className="brutalist-button" style={{ background: 'var(--accent)', fontSize: '1.3rem', padding: '1.2rem 3rem', border: '4px solid #000', fontWeight: 900, cursor: 'pointer', boxShadow: 'var(--brutal-shadow)' }}>
                           Download on Chrome Web Store →
                         </button>
                      </a>
                   </div>
                   <div className="brutalist-panel" style={{ width: '100%', height: '500px', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', maxWidth: '1000px', position: 'relative' }}>
                      <RainWindow bgIdClass={1} />
                   </div>
                </div>

             </div>
          )}

          {/* 2.5D Window / Multi-Screen Tracked Display */}
          {projectId === '25d-window' && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '7rem' }}>
              <WindowWriteupSection
                title="What This Is"
                tag="Multi-Screen Tracked Display"
                media={<WindowPlaceholderMedia label="Final effect with multiple screens or projector faces placeholder" />}
              >
                <p style={{ margin: 0 }}>This project is a web-based tracked display system. Each screen acts like a physical window into the same 3D scene. Instead of every device showing the same camera view, each display renders a perspective based on its real-world position, size, and angle. When the viewer moves their head, the perspective shifts so the scene appears to sit behind the physical screens.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="System Setup"
                tag="Host + WebSocket Bridge"
                reverse
                media={<WindowPlaceholderMedia label="Laptop and extra display setup placeholder" />}
              >
                <p style={{ margin: 0 }}>The system runs from one host machine. The host runs the Python tracking and WebSocket bridge, then any device on the network can join through a browser. This makes it possible to add phones, laptops, tablets, external monitors, or projector clients without installing a custom app on each device. Each client registers itself, receives a marker slot from the server, and becomes part of the shared tracking setup.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="Web Client Flow"
                tag="Browser Client Setup"
                media={<WindowPlaceholderMedia label="Browser client opening and setup UI placeholder" />}
              >
                <p style={{ margin: 0 }}>Each display loads the Godot web build in a browser. On first setup, the client asks for the physical size of the lit screen area, not including bezels. That size is sent to the host and used later for the perspective math. After that, the screen can show calibration markers, receive tracking data, and render its own view of the shared 3D scene.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="ArUco Screen Calibration"
                tag="Marker-Based Pose Solving"
                reverse
                media={<WindowPlaceholderMedia label="Calibration marker screen placeholder" />}
              >
                <p style={{ margin: 0 }}>During calibration, each screen shows a unique ArUco marker layout. The center marker identifies the screen slot, and the corner markers let the tracker solve the screen's position, rotation, and scale. The tracking camera watches all visible screens at once and builds a shared layout map from the detected markers.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="Tracked-Screen Detection Overlay"
                tag="Live Tracker View"
                media={<WindowPlaceholderMedia label="Camera tracker view with green overlay placeholder" />}
              >
                <p style={{ margin: 0 }}>The tracker includes a live detection view. When a screen is identified, a green overlay appears on top of the detected screen region in the camera feed. This makes it clear which screens are currently being tracked, which marker IDs were recognized, and whether the camera has enough information to solve that display's pose.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="Live 3D Calibration View"
                tag="Debug Visualization"
                reverse
                media={<WindowPlaceholderMedia label="3D debug view showing screens camera and head position placeholder" />}
              >
                <p style={{ margin: 0 }}>The client includes a live 3D debug view for calibration and troubleshooting. It shows the solved screen planes in 3D space, the current tracking-camera pose, and the viewer/head position. This is useful for checking whether a screen was solved in the correct place, whether its rotation is flipped, and whether multiple screens are aligned into one shared coordinate system.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="Multi-Screen Tracking"
                tag="Networked Display Layout"
                media={<WindowPlaceholderMedia label="Several screens being scanned and solved together placeholder" />}
              >
                <p style={{ margin: 0 }}>The system supports multiple displays in the same room layout. Each device receives its own marker identity, reports its physical dimensions, and renders its own view after calibration. Because the clients are web-based, adding another screen mostly means opening the URL on another device and running the scan again. The current marker set has a practical slot limit, but the architecture is built around networked clients rather than a fixed local monitor setup.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="Head Tracking And Perspective"
                tag="Off-Axis Camera Frustum"
                reverse
                media={<FishTankMedia label="Fish tank view perspective thumbnail" />}
              >
                <p style={{ margin: 0 }}>After the screen layout is locked, the system uses the viewer's tracked head position to compute an off-axis camera frustum for each screen. The screen is treated as the projection plane. If the viewer moves left, right, up, down, closer, or farther away, the rendered perspective changes according to that physical relationship. This is what creates the "window into a 3D space" effect.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="Runtime Rendering"
                tag="Per-Screen Perspective"
                media={<FishTankMedia label="Fish tank runtime rendering thumbnail" />}
              >
                <p style={{ margin: 0 }}>At runtime, each solved screen has its own camera view. The client uses the screen's physical size, solved room transform, and the current viewer position to render the correct perspective for that display. Multiple devices can render different views of the same scene at the same time, so the setup behaves like several physical windows looking into one shared 3D space.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="Why Multiple Faces Matter"
                tag="Connected Display Faces"
                reverse
                media={<WindowPlaceholderMedia label="Three-face box or cube effect placeholder" />}
              >
                <p style={{ margin: 0 }}>The effect is strongest when multiple displays or projected faces form connected sides of a shape, like three faces of a cube. A single screen gives one perspective window. Multiple angled faces give more spatial cues because the virtual scene can continue across real corners. This makes objects feel more physically present than they do on one flat monitor.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="Current Implementation"
                tag="Active Workflow"
                media={<WindowPlaceholderMedia label="Latest demo montage placeholder" />}
              >
                <p style={{ margin: 0 }}>The current version includes the web client, physical screen-size registration, ArUco marker generation, camera calibration, marker-based screen pose solving, shared layout broadcasting, live head tracking, off-axis projection, multi-screen rendering, and a 3D debug view. The main workflow is active: connect devices, enter screen dimensions, scan markers, lock the layout, and render tracked perspective views.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="Main Technical Pieces"
                tag="Godot 4 + Python + OpenCV"
                reverse
                media={<WindowPlaceholderMedia label="Workflow or code system diagram placeholder" />}
              >
                <p style={{ margin: 0 }}>Godot 4 handles the client UI, 3D rendering, debug visualization, and off-axis camera math. Python and OpenCV handle camera calibration, ArUco detection, and screen pose solving. A WebSocket bridge connects the tracker, host state, and all browser clients. The system is designed so the tracking and layout solve happen once on the host, while each connected client renders its own correct view.</p>
              </WindowWriteupSection>
            </div>
          )}

          {/* Placeholder Fallback */}
          {projectId !== 'squash' && projectId !== 'rainy-day' && projectId !== '25d-window' && (
             <div style={{ marginTop: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', minHeight: '30vh' }}>
                <div style={{ textAlign: 'center' }}>
                   <h3 style={{ fontSize: '3rem', fontWeight: 900, margin: '0 0 1rem 0', letterSpacing: '-1px' }}>Under Construction</h3>
                   <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', fontWeight: 500, maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                     The formal neo-brutalist breakdown for this project is currently being written. In the meantime, you can explore the raw source code and implementation directly on GitHub!
                   </p>
                </div>
                <a href={project.github || `https://github.com/Jetpackjules/${projectId}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <button className="brutalist-button" style={{ fontSize: '1.4rem', padding: '1.2rem 2.5rem', background: 'var(--accent-purple)', color: '#000', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                    View Source on GitHub
                  </button>
                </a>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
