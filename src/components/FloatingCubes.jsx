import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ParticleField = ({ count = 6000 }) => {
  const meshRef = useRef();
  
  const particles = useMemo(() => {
    const temp = [];
    // Spread particles across a wider area to ensure full coverage
    for (let i = 0; i < count; i++) {
       const x = (Math.random() - 0.5) * 50;
       const y = (Math.random() - 0.5) * 50;
       const z = (Math.random() - 0.5) * 15 - 5; // Slight depth
       temp.push({ 
           originalPos: new THREE.Vector3(x, y, z),
           currentPos: new THREE.Vector3(x, y, z),
           velocity: new THREE.Vector3(),
           size: Math.random() * 0.6 + 0.3 // Randomize slightly for depth illusion
       });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Convert normalized pointer to world coords
    const cameraZ = 15;
    const vFov = (75 * Math.PI) / 180;
    const h = 2 * Math.tan(vFov / 2) * cameraZ;
    const w = h * state.camera.aspect;

    const mouseX = (state.pointer.x * w) / 2;
    const mouseY = (state.pointer.y * h) / 2;
    // Assume Z is near 0 for interactions
    const mousePos = new THREE.Vector3(mouseX, mouseY, 0);

    const influenceRadius = 7;
    const returnSpeed = 0.03; // Smooth spring
    const repulsionStrength = 0.15; // Force

    particles.forEach((particle, i) => {
      const { originalPos, currentPos, velocity, size } = particle;

      // Ambient subtle drift
      const driftX = Math.sin(time * 0.3 + originalPos.y * 0.5) * 0.01;
      const driftY = Math.cos(time * 0.3 + originalPos.x * 0.5) * 0.01;
      
      const dist = currentPos.distanceTo(mousePos);

      // Inverse Gravity: mouse pushes particles away
      if (dist < influenceRadius) {
        const force = (1 - dist / influenceRadius) * repulsionStrength;
        const dir = currentPos.clone().sub(mousePos).normalize();
        velocity.add(dir.multiplyScalar(force));
      }

      // Spring back to original position to maintain the grid/cloud
      const returnForce = originalPos.clone().sub(currentPos).multiplyScalar(returnSpeed);
      velocity.add(returnForce);
      
      // Friction (damping)
      velocity.multiplyScalar(0.85);

      // Apply kinematics
      currentPos.add(velocity).add(new THREE.Vector3(driftX, driftY, 0));

      // Visual response: particles shrink as they move faster (like fading)
      const speed = velocity.length();
      const dynamicScale = Math.max(0.01, size - speed * 1.5);

      dummy.position.copy(currentPos);
      dummy.scale.set(dynamicScale, dynamicScale, dynamicScale);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      {/* Circle geometry looks like flat dots facing the camera */}
      <circleGeometry args={[0.04, 16]} />
      {/* Super minimal faint transparent color */}
      <meshBasicMaterial 
        color="#ffffff" 
        transparent={true}
        opacity={0.15}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

export default function FloatingCubes() {
  return (
    <Canvas camera={{ position: [0, 0, 15], fov: 75 }} gl={{ antialias: true, alpha: true }}>
      {/* Remove lights because MeshBasicMaterial doesn't need them and it keeps it cleaner */}
      <ParticleField count={8000} />
    </Canvas>
  );
}
