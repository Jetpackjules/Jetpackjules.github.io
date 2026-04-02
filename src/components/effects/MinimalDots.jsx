import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ParticleField = ({ count, sizeMultiplier, interactive }) => {
  const meshRef = useRef();
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
       const x = (Math.random() - 0.5) * 50;
       const y = (Math.random() - 0.5) * 50;
       const z = (Math.random() - 0.5) * 15 - 5; 
       temp.push({ 
           originalPos: new THREE.Vector3(x, y, z),
           currentPos: new THREE.Vector3(x, y, z),
           velocity: new THREE.Vector3(),
           baseSize: Math.random() * 0.6 + 0.2 // Slightly smaller base
       });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const cameraZ = 15;
    const vFov = (75 * Math.PI) / 180;
    const h = 2 * Math.tan(vFov / 2) * cameraZ;
    const w = h * state.camera.aspect;

    const mouseX = (state.pointer.x * w) / 2;
    const mouseY = (state.pointer.y * h) / 2;
    const mousePos = new THREE.Vector3(mouseX, mouseY, 0);

    const influenceRadius = 3.5;
    const returnSpeed = 0.12; 
    const repulsionStrength = 0.45; 

    particles.forEach((particle, i) => {
      const { originalPos, currentPos, velocity, baseSize } = particle;

      const driftX = Math.sin(time * 0.3 + originalPos.y * 0.5) * 0.01;
      const driftY = Math.cos(time * 0.3 + originalPos.x * 0.5) * 0.01;
      
      const dist = currentPos.distanceTo(mousePos);

      // Inverse Gravity (only if interactive enabled)
      if (interactive && dist < influenceRadius) {
        const force = (1 - dist / influenceRadius) * repulsionStrength;
        const dir = currentPos.clone().sub(mousePos).normalize();
        velocity.add(dir.multiplyScalar(force));
      }

      const returnForce = originalPos.clone().sub(currentPos).multiplyScalar(returnSpeed);
      velocity.add(returnForce);
      velocity.multiplyScalar(0.75); 
      currentPos.add(velocity).add(new THREE.Vector3(driftX, driftY, 0));

      const speed = velocity.length();
      // Apply the user's sizeMultiplier prop
      const finalSize = Math.max(0.01, (baseSize * sizeMultiplier) - speed * 1.5);

      dummy.position.copy(currentPos);
      dummy.scale.set(finalSize, finalSize, finalSize);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <circleGeometry args={[0.04, 16]} />
      <meshBasicMaterial 
        color="#111111" 
        transparent={true}
        opacity={0.3}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

export default function MinimalDots({ count = 8000, sizeMultiplier = 1.0, interactive = true }) {
  return (
    <Canvas 
      camera={{ position: [0, 0, 15], fov: 75 }} 
      gl={{ antialias: true, alpha: true }}
      eventSource={document.getElementById('root')}
      eventPrefix="client"
    >
      <ParticleField count={count} sizeMultiplier={sizeMultiplier} interactive={interactive} />
    </Canvas>
  );
}
