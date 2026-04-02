import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BrutalCubeInstanced = ({ count = 2500, spacing = 1.1 }) => {
  const meshRef = useRef();
  
  const particles = useMemo(() => {
    const temp = [];
    const side = Math.ceil(Math.sqrt(count));
    const offset = (side * spacing) / 2;
    for (let i = 0; i < count; i++) {
       const x = (i % side) * spacing - offset;
       const y = Math.floor(i / side) * spacing - offset;
       temp.push({ 
           originalX: x, 
           originalY: y,
           currentOffset: new THREE.Vector3(),
           targetOffset: new THREE.Vector3()
       });
    }
    return temp;
  }, [count, spacing]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const prevMouse = useRef(new THREE.Vector2());
  const mouseVelocity = useRef(new THREE.Vector2());

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    mouseVelocity.current.x = state.pointer.x - prevMouse.current.x;
    mouseVelocity.current.y = state.pointer.y - prevMouse.current.y;
    prevMouse.current.copy(state.pointer);
    mouseVelocity.current.multiplyScalar(0.9); 

    const cameraZ = 15;
    const vFov = (75 * Math.PI) / 180;
    const h = 2 * Math.tan(vFov / 2) * cameraZ;
    const w = h * state.camera.aspect;

    const mouseX = (state.pointer.x * w) / 2;
    const mouseY = (state.pointer.y * h) / 2;
    
    // Tight influence and lower velocity reaction to prevent overlap clamping
    const mouseInfluence = 4.5;
    const velocityEffect = 2;

    particles.forEach((particle, i) => {
      const { originalX, originalY, currentOffset, targetOffset } = particle;

      const distanceX = mouseX - originalX;
      const distanceY = mouseY - originalY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      if (distance < mouseInfluence) {
        const scale = 1 - distance / mouseInfluence;
        const movement = scale * 1.5; 
        
        const angle = Math.atan2(distanceY, distanceX);
        const moveX = Math.cos(angle) * movement;
        const moveY = Math.sin(angle) * movement;
        
        targetOffset.x = moveX + mouseVelocity.current.x * velocityEffect;
        targetOffset.y = moveY + mouseVelocity.current.y * velocityEffect;
        targetOffset.z = movement * 1.5; 
      } else {
        targetOffset.set(0, 0, 0);
      }

      currentOffset.lerp(targetOffset, 0.2);

      dummy.position.set(originalX + currentOffset.x, originalY + currentOffset.y, currentOffset.z);
      dummy.rotation.x = currentOffset.y * 0.3 + time * 0.15;
      dummy.rotation.y = -currentOffset.x * 0.3 + time * 0.15;
      
      const scaleOffset = 1 + currentOffset.length() * 0.1;
      dummy.scale.set(scaleOffset, scaleOffset, scaleOffset);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[0.65, 0.65, 0.65]} />
      <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
    </instancedMesh>
  );
};

export default function BrutalistCubes() {
  return (
    <Canvas 
      camera={{ position: [0, 0, 15], fov: 75 }} 
      gl={{ antialias: true, alpha: true }}
      eventSource={document.getElementById('root')}
      eventPrefix="client"
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={2.5} color="#CEF176" />
      <directionalLight position={[-10, -10, -5]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[0, 0, 10]} intensity={1.5} color="#ffffff" />
      <BrutalCubeInstanced count={2400} spacing={1.1} />
    </Canvas>
  );
}
