import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import RainWindow from '../components/RainWindow';
import { projectsData } from './Home';

const windowProjectAssetBase = '/assets/projects/25d-window';
const bonkProjectAssetBase = '/assets/projects/bonk-rl';

function BonkVideo({ src, poster, label, caption, className = '' }) {
  return (
    <motion.figure
      className={`bonk-media ${className}`.trim()}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <video
        src={`${bonkProjectAssetBase}/${src}`}
        poster={poster ? `${bonkProjectAssetBase}/${poster}` : undefined}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={label}
      />
      {caption && <figcaption>{caption}</figcaption>}
    </motion.figure>
  );
}

function BonkBarChart({ title, metric, items, maxValue, ticks, className = '' }) {
  const summary = items.map(item => `${item.label}: ${item.display}`).join(', ');
  return (
    <motion.figure
      className={`bonk-chart ${className}`.trim()}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <figcaption>
        <strong>{title}</strong>
        <span>{metric}</span>
      </figcaption>
      <div className="bonk-column-chart" role="img" aria-label={`${title}. ${metric}. ${summary}`}>
        <div className="bonk-y-axis" aria-hidden="true">
          <div className="bonk-y-axis-values">
            {ticks.map(tick => <span key={tick}>{tick}</span>)}
          </div>
          <span />
        </div>
        <div className="bonk-plot">
          <div className="bonk-plot-area">
            <div className="bonk-grid-lines" aria-hidden="true">
              {ticks.map(tick => <span key={tick} />)}
            </div>
            <div className="bonk-columns" style={{ '--bonk-column-count': items.length }} aria-hidden="true">
              {items.map(item => {
                const height = Math.max(0, Math.min(100, (item.value / maxValue) * 100));
                return (
                  <div className="bonk-column" key={item.label}>
                    <strong className="bonk-column-value" style={{ bottom: `calc(${height}% + 6px)` }}>{item.display}</strong>
                    <motion.span
                      className="bonk-column-bar"
                      style={{ backgroundColor: item.color }}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${height}%` }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.65, ease: 'easeOut' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bonk-column-labels" style={{ '--bonk-column-count': items.length }} aria-hidden="true">
            {items.map(item => (
              <span key={item.label}><i style={{ backgroundColor: item.color }} />{item.shortLabel || item.label}</span>
            ))}
          </div>
        </div>
      </div>
    </motion.figure>
  );
}

function BonkMapDuelChart({ title, metric, groups, ticks, legend }) {
  const summary = groups
    .map(group => `${group.label}: ${group.items.map(item => `${item.label} ${item.display}`).join(', ')}`)
    .join('. ');

  return (
    <motion.figure
      className="bonk-chart bonk-map-duel-chart"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <figcaption>
        <div>
          <strong>{title}</strong>
          <span>{metric}</span>
        </div>
        <div className="bonk-duel-legend" aria-label="PPO architecture colors">
          {legend.map(item => <span key={item.label}><i style={{ backgroundColor: item.color }} />{item.label}</span>)}
        </div>
      </figcaption>
      <div className="bonk-duel-chart-body" role="img" aria-label={`${title}. ${metric}. ${summary}`}>
        <div className="bonk-duel-axis" aria-hidden="true">
          <div>
            {ticks.map(tick => <span key={tick}>{tick}</span>)}
          </div>
          <span />
        </div>
        <div className="bonk-duel-plot" aria-hidden="true">
          <div className="bonk-duel-plot-area">
            <div className="bonk-grid-lines">
              {ticks.map(tick => <span key={tick} />)}
            </div>
            <div className="bonk-duel-groups">
              {groups.map(group => (
                <div className="bonk-duel-group" key={group.label}>
                  {group.items.map(item => {
                    const height = Math.max(0, Math.min(100, item.value * 100));
                    return (
                      <div className="bonk-duel-column" key={item.label}>
                        <strong className="bonk-duel-value" style={{ bottom: `calc(${height}% + 7px)` }}>{item.display}</strong>
                        <motion.span
                          className="bonk-duel-bar"
                          style={{ backgroundColor: item.color }}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${height}%` }}
                          viewport={{ once: true, amount: 0.45 }}
                          transition={{ duration: 0.65, ease: 'easeOut' }}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="bonk-duel-map-labels">
            {groups.map(group => <strong key={group.label}>{group.label}</strong>)}
          </div>
        </div>
      </div>
    </motion.figure>
  );
}

function WindowPlaceholderMedia({ label }) {
  return (
    <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={`${windowProjectAssetBase}/placeholder_img_or_gif.gif`} alt={label} style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
    </div>
  );
}

function WindowAssetMedia({ label, src, poster }) {
  const isVideo = src.endsWith('.mp4');

  return (
    <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {isVideo ? (
        <video src={`${windowProjectAssetBase}/${src}`} poster={poster ? `${windowProjectAssetBase}/${poster}` : undefined} autoPlay loop muted playsInline preload="metadata" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} aria-label={label} />
      ) : (
        <img src={`${windowProjectAssetBase}/${src}`} alt={label} loading="lazy" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
      )}
    </div>
  );
}

function FishTankMedia({ label }) {
  return (
    <div className="brutalist-panel" style={{ width: '100%', padding: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video src={`${windowProjectAssetBase}/single-screen-pingpong.mp4`} poster={`${windowProjectAssetBase}/single-screen-pingpong.webp`} autoPlay loop muted playsInline preload="metadata" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} aria-label={label} />
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
        <div style={{ width: '100%', height: projectId === 'bonk-rl' ? 'min(380px, 62vw)' : '350px', borderBottom: 'var(--border-width) solid var(--border-color)', backgroundColor: projectId === 'bonk-rl' ? '#272727' : 'var(--accent-purple)', position: 'relative', overflow: 'hidden' }}>
           {projectId === 'rainy-day' ? (
              <RainWindow bgIdClass={15} />
           ) : (project.headerImage || project.image || '').endsWith('.mp4') ? (
              <video src={`/assets/projects/${projectId}/${project.headerImage || project.image}`} poster={project.thumbnailPoster ? `/assets/projects/${projectId}/${project.thumbnailPoster}` : undefined} autoPlay loop muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
           ) : (
              <div style={{ width: '100%', height: '100%', background: `url('/assets/projects/${projectId}/${project.headerImage || project.image || 'placeholder_img_or_gif.gif'}') center/cover` }} />
           )}
        </div>
        
        <div className="project-detail-content" style={{ padding: '3.5rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {project.category.split(' / ').map(cat => (
                <span key={cat} className="brutalist-panel" style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', padding: '6px 12px', background: 'var(--accent)', display: 'inline-block' }}>
                  {cat}
                </span>
              ))}
            </div>
            <h1 className="project-detail-title" style={{ fontSize: '4.5rem', margin: '0 0 0.5rem 0', fontWeight: 900, lineHeight: 1 }}>{project.title}</h1>
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

          {/* Bonk reinforcement-learning system */}
          {projectId === 'bonk-rl' && (
            <div className="bonk-project">
              <section className="bonk-opening">
                <div className="bonk-opening-grid">
                  <div className="bonk-opening-copy">
                    <span className="bonk-project-kicker">Physics at Play / UW CSE 493</span>
                    <h2 className="bonk-opening-title">Can an agent learn physics through play?</h2>
                    <p className="bonk-lead">
                      We recreated Bonk.io as a controllable research environment and used it to compare three PPO agents: a standard baseline, a curiosity-driven model, and a model with an auxiliary physics-prediction task. The study asks how reward design, predictive loss, and training environment affect movement, exploration, and transfer to new maps.
                    </p>
                  </div>
                  <BonkVideo
                    src="pyramid_climb_clean.mp4"
                    poster="pyramid_climb_clean.webp"
                    label="A PPO policy climbing the pyramid map"
                    className="bonk-opening-media"
                  />
                </div>
              </section>

              <section className="bonk-section bonk-section--sensor">
                <div className="bonk-copy">
                  <span className="bonk-eyebrow">01 / THE ENVIRONMENT</span>
                  <h2>A calibrated Bonk.io recreation.</h2>
                  <p>
                    Because Bonk.io is closed-source, we built a local Box2D recreation and calibrated its movement against recorded gameplay. Matching velocity, acceleration, gravity, input force, friction, and bounce behavior made the clone useful for controlled training rather than just visual imitation.
                  </p>
                  <p>
                    The policy does not consume pixels. It receives a compact geometric observation containing player motion, the objective and opponent state, nearby surfaces, and raycast measurements. The split view shows a rollout alongside that spatial representation.
                  </p>
                </div>
                <BonkVideo
                  src="hero_parkour_raycast_comparison.mp4"
                  poster="hero_parkour_clean.webp"
                  label="The same procedural parkour rollout shown with raycasts off and on"
                  caption="The same rollout in clean view and geometric sensor view."
                  className="bonk-media--comparison"
                />
              </section>

              <section className="bonk-methods">
                <div className="bonk-copy bonk-copy--centered">
                  <span className="bonk-eyebrow bonk-eyebrow--purple">02 / THREE PPO VARIANTS</span>
                  <h2>Three PPO configurations.</h2>
                  <p>Each model uses the same actor-critic PPO foundation. What changes is the signal used to guide learning.</p>
                </div>
                <div className="bonk-method-grid">
                  <div className="bonk-method">
                    <strong>Baseline PPO</strong>
                    <p>Learns directly from game reward and establishes the comparison point.</p>
                  </div>
                  <div className="bonk-method">
                    <strong>Physics Auxiliary</strong>
                    <p>Predicts the next position and velocity, adding a physics-consistency task to PPO loss.</p>
                  </div>
                  <div className="bonk-method">
                    <strong>Curiosity PPO</strong>
                    <p>Turns surprising next-state prediction errors into an exploration reward.</p>
                  </div>
                </div>
              </section>

              <section className="bonk-section bonk-section--reverse">
                <BonkVideo
                  src="moving_ladder_generalist_clean.mp4"
                  poster="moving_ladder_generalist_clean.webp"
                  label="A PPO policy climbing a route with moving platforms"
                  caption="Tracking moving surfaces while preserving jump timing and momentum."
                />
                <div className="bonk-copy">
                  <span className="bonk-eyebrow">03 / PRETRAINING</span>
                  <h2>Two pretraining environments.</h2>
                  <p>
                    The curriculum introduces basic control, gaps, moving objectives, procedural parkour, and mixed-map navigation in stages. Each step adds a physical behavior while revisiting earlier maps to reduce forgetting.
                  </p>
                  <p>
                    A second pretraining route uses one dense playground containing many obstacles at once. Comparing the two asks whether structured progression or concentrated variety produces behavior that transfers more reliably.
                  </p>
                  <div className="bonk-inline-facts" aria-label="Curriculum details">
                    <span>staged curriculum</span><span>dense playground</span><span>same PPO foundation</span>
                  </div>
                </div>
              </section>

              <section className="bonk-showcase">
                <div className="bonk-copy bonk-copy--centered">
                  <span className="bonk-eyebrow bonk-eyebrow--purple">04 / TRANSFER</span>
                  <h2>Fine-tuning on six unseen maps.</h2>
                  <p>
                    The pretrained agents are moved onto six new maps covering combat, ladder climbing, lethal gaps, moving platforms, and bounce-pad control. Success rate, distance to the objective, and collision behavior show not only whether a policy succeeds, but how it adapts.
                  </p>
                </div>
                <div className="bonk-dual-grid">
                  <div className="bonk-example">
                    <BonkVideo
                      src="moving_death_specialist_clean.mp4"
                      poster="moving_death_specialist_clean.webp"
                      label="A fine-tuned policy crossing lethal moving platforms"
                      caption="Moving platforms and death zones in the same transfer task."
                    />
                    <h3>Moving death platforms</h3>
                    <p>The policy combines waiting, lateral control, and committed jumps across a route where a mistimed landing ends the episode.</p>
                  </div>
                  <div className="bonk-example">
                    <BonkVideo
                      src="bounce_arc_specialist_clean.mp4"
                      poster="bounce_arc_specialist_clean.webp"
                      label="A fine-tuned policy completing a precision bounce route"
                      caption="Bounce-pad control, momentum, and hazard avoidance."
                    />
                    <h3>Precision bounce arc</h3>
                    <p>The route requires dropping into bounce surfaces, carrying momentum through hazards, and converting a rebound into controlled ascent.</p>
                  </div>
                </div>
              </section>

              <section className="bonk-results-evidence">
                <div className="bonk-copy bonk-copy--centered">
                  <span className="bonk-eyebrow">05 / MATCHED TRANSFER RESULTS</span>
                  <h2>Same map. Faster adaptation.</h2>
                  <p>
                    On Combat Flat, all three curriculum-pretrained agents improved during fine-tuning. At the same early checkpoint, auxiliary and curiosity PPO had already passed 85% success while baseline remained near 41%. Baseline eventually reached the same target, but required roughly one-third more steps.
                  </p>
                </div>
                <div className="bonk-result-grid">
                  <BonkBarChart
                    title="Combat Flat / Equal Budget"
                    metric="Success rate near 2.04M fine-tuning steps / higher is better"
                    maxValue={1}
                    ticks={['100%', '75%', '50%', '25%', '0']}
                    items={[
                      { label: 'Baseline PPO', shortLabel: 'Baseline', value: 0.4061, display: '40.6%', color: '#92979b' },
                      { label: 'Physics auxiliary', shortLabel: 'Auxiliary', value: 0.8518, display: '85.2%', color: '#b69cff' },
                      { label: 'Curiosity PPO', shortLabel: 'Curiosity', value: 0.8593, display: '85.9%', color: '#c9f36d' },
                    ]}
                  />
                  <BonkBarChart
                    title="Combat Flat / Speed to Target"
                    metric="Fine-tuning steps to 85% success / lower is better"
                    maxValue={3000000}
                    ticks={['3.0M', '2.0M', '1.0M', '0']}
                    items={[
                      { label: 'Baseline PPO', shortLabel: 'Baseline', value: 2998272, display: '3.00M', color: '#92979b' },
                      { label: 'Physics auxiliary', shortLabel: 'Auxiliary', value: 2015232, display: '2.02M', color: '#b69cff' },
                      { label: 'Curiosity PPO', shortLabel: 'Curiosity', value: 2048000, display: '2.05M', color: '#c9f36d' },
                    ]}
                  />
                </div>
                <p className="bonk-results-source">Matched curriculum runs on Combat Flat. Equal-budget values use the nearest saved evaluation to 2.048M fine-tuning steps.</p>
              </section>

              <section className="bonk-section">
                <div className="bonk-copy">
                  <span className="bonk-eyebrow">06 / COMBAT</span>
                  <h2>Combat and collision behavior.</h2>
                  <p>
                    An active opponent turns movement into a contact problem. The agent must approach with useful momentum, recover after impact, protect its own position, and either capture the objective or push the opponent out of bounds.
                  </p>
                  <p>
                    The study also tracks collisions during combat fine-tuning. As policies improve, fewer contacts can still produce stronger outcomes, suggesting that they learn how to use force rather than merely collide more often.
                  </p>
                </div>
                <BonkVideo
                  src="combat_duel_raycasts.mp4"
                  poster="combat_duel_raycasts.webp"
                  label="Two PPO policies dueling with geometric observations visible"
                  caption="Opponent-aware sensing during a physics-based duel."
                />
              </section>

              <section className="bonk-takeaway" id="results">
                <div className="bonk-takeaway-heading">
                  <span className="bonk-eyebrow bonk-eyebrow--purple">WHAT WE FOUND</span>
                  <h2>The aggregate hid task-specific behavior.</h2>
                  <p>Direct duels between curriculum-pretrained specialists show a dominant baseline on Combat Flat, a much closer Death Gap contest, and a clear auxiliary advantage on Safe Ladder. Curiosity struggled in combat but remained competitive on the navigation tasks.</p>
                </div>
                <BonkMapDuelChart
                  title="Specialist Duel Score, Map by Map"
                  metric="Win = 1 point, draw = 1/2 point / higher is better"
                  ticks={['100%', '75%', '50%', '25%', '0']}
                  legend={[
                    { label: 'Baseline', color: '#92979b' },
                    { label: 'Auxiliary', color: '#b69cff' },
                    { label: 'Curiosity', color: '#c9f36d' },
                  ]}
                  groups={[
                    {
                      label: 'Combat Flat',
                      items: [
                        { label: 'Baseline', value: 1, display: '100%', color: '#92979b' },
                        { label: 'Auxiliary', value: 0.469, display: '46.9%', color: '#b69cff' },
                        { label: 'Curiosity', value: 0.031, display: '3.1%', color: '#c9f36d' },
                      ],
                    },
                    {
                      label: 'Death Gap',
                      items: [
                        { label: 'Baseline', value: 0.688, display: '68.8%', color: '#92979b' },
                        { label: 'Auxiliary', value: 0.25, display: '25.0%', color: '#b69cff' },
                        { label: 'Curiosity', value: 0.562, display: '56.2%', color: '#c9f36d' },
                      ],
                    },
                    {
                      label: 'Safe Ladder',
                      items: [
                        { label: 'Baseline', value: 0.125, display: '12.5%', color: '#92979b' },
                        { label: 'Auxiliary', value: 0.953, display: '95.3%', color: '#b69cff' },
                        { label: 'Curiosity', value: 0.422, display: '42.2%', color: '#c9f36d' },
                      ],
                    },
                  ]}
                />
                <p className="bonk-takeaway-source">Latest curriculum-pretrained specialist for each PPO architecture; 64 balanced duel episodes per model on each map. A win is an objective capture or knockout. Results were regenerated directly from the saved fine-tuned checkpoints.</p>
              </section>

              <section className="bonk-cta">
                <div>
                  <span className="bonk-eyebrow">PAPER + IMPLEMENTATION</span>
                  <h2>Physics at Play</h2>
                  <p>The full paper covers environment calibration, model architecture, curriculum design, transfer experiments, and the limits of each approach.</p>
                </div>
                <div className="bonk-cta-actions">
                  <a href={`${bonkProjectAssetBase}/physics-at-play.pdf`} target="_blank" rel="noreferrer" className="brutalist-button bonk-source-link">Read the paper</a>
                  <a href="https://github.com/danishubin/bonkio" target="_blank" rel="noreferrer" className="brutalist-button bonk-source-link">View source</a>
                </div>
                <p className="bonk-project-attribution">Research by Trisha Bhatawdekar, Jules Ropars, and Daniel Shubin.</p>
              </section>
            </div>
          )}

          {/* 2.5D Window / Multi-Screen Tracked Display */}
          {projectId === '25d-window' && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '7rem' }}>
              <WindowWriteupSection
                title="What This Is"
                tag="Multi-Screen Tracked Display + ArUco Calibration"
                media={<WindowAssetMedia src="intro-aruco-laptop.mp4" poster="intro-aruco-laptop.webp" label="ArUco laptop calibration preview" />}
              >
                <p style={{ margin: 0 }}>This project is a web-based tracked display system. Each screen acts like a physical window into the same 3D scene. Instead of every device showing the same camera view, each display renders a perspective based on its real-world position, size, and angle. When the viewer moves their head, the perspective shifts so the scene appears to sit behind the physical screens.</p>
                <p style={{ margin: 0 }}>During calibration, each screen shows a unique ArUco marker layout. The center marker identifies the screen slot, and the corner markers let the tracker solve the screen's position, rotation, and scale. The tracking camera watches all visible screens at once and builds a shared layout map from the detected markers.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="Tracked-Screen Detection Overlay"
                tag="Live Tracker View"
                media={<WindowAssetMedia src="tracked-screen-overlay-pingpong.mp4" poster="tracked-screen-overlay-pingpong.webp" label="Camera tracker view with green overlay on detected screens" />}
              >
                <p style={{ margin: 0 }}>The tracker includes a live detection view. When a screen is identified, a green overlay appears on top of the detected screen region in the camera feed. This makes it clear which screens are currently being tracked, which marker IDs were recognized, and whether the camera has enough information to solve that display's pose.</p>
              </WindowWriteupSection>

              <WindowWriteupSection
                title="Viewer Head Position Debug View"
                tag="Calibrated 3D View"
                reverse
                media={<WindowAssetMedia src="viewer-head-debug-pingpong.mp4" poster="viewer-head-debug-pingpong.webp" label="3D debug view showing screens camera and viewer head position" />}
              >
                <p style={{ margin: 0 }}>Once the screens are calibrated, the 3D debug view shows the solved display planes together with the viewer's tracked head position. This makes it possible to see whether the head position is being interpreted correctly relative to the physical screens before relying on the final perspective effect.</p>
              </WindowWriteupSection>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem', alignItems: 'center' }}>
                <div style={{ maxWidth: '900px' }}>
                  <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem 0', letterSpacing: '-1px' }}>Single And Multi-Screen Tracking</h3>
                  <span style={{ display: 'inline-block', fontWeight: 800, background: 'var(--accent)', padding: '4px 16px', border: '2px solid #000', borderRadius: '4px', marginBottom: '1.5rem' }}>
                    Functional Tracked Views
                  </span>
                  <p style={{ margin: 0, fontWeight: 500, lineHeight: 1.6, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                    After the screen layout is locked, the system uses the viewer's tracked head position to compute an off-axis camera frustum for each screen. A single screen behaves like one physical window into the scene, while multiple angled screens can render different views of the same space at the same time.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
                  <div>
                    <h4 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 1rem 0' }}>Multi-Screen View</h4>
                    <WindowAssetMedia src="three-screens-pingpong.mp4" poster="three-screens-pingpong.webp" label="Multi-screen functional tracking view" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 1rem 0' }}>Single-Screen View</h4>
                    <FishTankMedia label="Single-screen functional tracking view" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder Fallback */}
          {projectId !== 'squash' && projectId !== 'rainy-day' && projectId !== '25d-window' && projectId !== 'bonk-rl' && (
             <div style={{ marginTop: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', minHeight: '30vh' }}>
                <div style={{ textAlign: 'center' }}>
                   <h3 style={{ fontSize: '3rem', fontWeight: 900, margin: '0 0 1rem 0', letterSpacing: '-1px' }}>Under Construction</h3>
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
