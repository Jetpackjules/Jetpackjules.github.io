import React, { useState, useEffect } from 'react';

export default function WidthSlider() {
  const [width, setWidth] = useState(1100);

  useEffect(() => {
    document.documentElement.style.setProperty('--layout-width', `${width}px`);
    // Cleanup if component unmounts
    return () => {
        document.documentElement.style.removeProperty('--layout-width');
    }
  }, [width]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: '#fff',
      border: '4px solid #000',
      padding: '10px 20px',
      boxShadow: '4px 4px 0px #000',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      width: '250px'
    }}>
      <label style={{ fontWeight: 800, fontSize: '0.9rem', color: '#000' }}>
        Layout Pixels: {width}px
      </label>
      <input 
        type="range" 
        min="600" 
        max="3000" 
        step="10"
        value={width} 
        onChange={(e) => setWidth(e.target.value)}
        style={{ width: '100%', cursor: 'pointer' }}
      />
    </div>
  );
}
