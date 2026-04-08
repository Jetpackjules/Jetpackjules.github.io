import React, { useEffect, useRef } from 'react';
import { startRainBackground } from './rain-effect/background-rain';

export default function RainWindow({ style, bgIdClass }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let isActive = true;

    if (canvasRef.current) {
        // Load the simulation logic inside the component 
        startRainBackground({ 
            canvas: canvasRef.current,
            // Use background ID if passed or fallback to the daily seeded dynamic ID
            backgroundId: bgIdClass || undefined
        }).catch(err => {
            console.error("Rain Effect Boot Error", err);
        });
    }

    return () => {
        isActive = false;
        // In a completely native pipeline we would halt the requestAnimationFrame loop here
        // The engine doesn't expose a kill() natively, but DOM tear-down will stop it from compounding if limited correctly.
    };
  }, [bgIdClass]);

  const fallbackBg = bgIdClass ? `url('/assets/rain-effect/rotation/image-${bgIdClass}-bg.png')` : 'none';

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill', background: `#000 ${fallbackBg} 0 0 / 100% 100% no-repeat`, ...style }} />;
}
