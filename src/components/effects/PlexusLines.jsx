import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PlexusEffect = ({ count = 250, distanceThreshold = 3.5 }) => {
  const pointsGeomRef = useRef();
  const linesGeomRef = useRef();

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
       temp.push({
           pos: new THREE.Vector3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 10),
           vel: new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, 0)
       });
    }
    return temp;
  }, [count]);

  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const maxLines = 5000;
  const linePositions = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);

  useFrame((state) => {
    const cameraZ = 15;
    const vFov = (75 * Math.PI) / 180;
    const h = 2 * Math.tan(vFov / 2) * cameraZ;
    const w = h * state.camera.aspect;

    const mouseX = (state.pointer.x * w) / 2;
    const mouseY = (state.pointer.y * h) / 2;
    const mousePos = new THREE.Vector3(mouseX, mouseY, 0);

    let lineIndex = 0;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      p.pos.add(p.vel);

      if (p.pos.x > 25 || p.pos.x < -25) p.vel.x *= -1;
      if (p.pos.y > 25 || p.pos.y < -25) p.vel.y *= -1;

      const distToMouse = p.pos.distanceTo(mousePos);
      
      // Fast, strong gravity repulsion without drawing lines to mouse
      if (distToMouse < 4.0) {
        const force = (1 - distToMouse / 4.0) * 0.25; 
        const dir = p.pos.clone().sub(mousePos).normalize();
        p.vel.add(dir.multiplyScalar(force));
      }
      
      if (p.vel.length() > 0.08) {
        p.vel.normalize().multiplyScalar(0.08); 
      }

      positions[i * 3] = p.pos.x;
      positions[i * 3 + 1] = p.pos.y;
      positions[i * 3 + 2] = p.pos.z;
    }

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (lineIndex >= maxLines * 6) break;
        
        const p1 = particles[i].pos;
        const p2 = particles[j].pos;
        const dist = p1.distanceTo(p2);

        if (dist < distanceThreshold) {
          linePositions[lineIndex++] = p1.x;
          linePositions[lineIndex++] = p1.y;
          linePositions[lineIndex++] = p1.z;
          linePositions[lineIndex++] = p2.x;
          linePositions[lineIndex++] = p2.y;
          linePositions[lineIndex++] = p2.z;
        }
      }
    }

    if (pointsGeomRef.current) {
        pointsGeomRef.current.attributes.position.needsUpdate = true;
    }
    if (linesGeomRef.current) {
        linesGeomRef.current.setDrawRange(0, lineIndex / 3);
        linesGeomRef.current.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      <points>
        <bufferGeometry ref={pointsGeomRef}>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.2} color="#111111" transparent opacity={0.6} />
      </points>
      <lineSegments>
        <bufferGeometry ref={linesGeomRef}>
          <bufferAttribute attach="attributes-position" count={maxLines * 2} array={linePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#111111" transparent opacity={0.25} />
      </lineSegments>
    </group>
  );
};

export default function PlexusLines() {
  return (
    <Canvas 
      camera={{ position: [0, 0, 15], fov: 75 }} 
      gl={{ antialias: true, alpha: true }}
      eventSource={document.getElementById('root')}
      eventPrefix="client"
    >
      <PlexusEffect count={250} distanceThreshold={3.5} />
    </Canvas>
  );
}
