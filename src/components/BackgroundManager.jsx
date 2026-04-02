import React from 'react';
import BrutalistCubes from './effects/BrutalistCubes';
import MinimalDots from './effects/MinimalDots';
import PlexusLines from './effects/PlexusLines';

export default function BackgroundManager({ effect, dotProps }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      {effect === 'cubes' && <BrutalistCubes />}
      {effect === 'dots' && <MinimalDots count={dotProps.count} sizeMultiplier={dotProps.size} interactive={dotProps.interactive} />}
      {effect === 'lines' && <PlexusLines />}
    </div>
  );
}
