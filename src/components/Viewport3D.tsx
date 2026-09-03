import React, { useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { PlanState } from '../core/types';
import { TARGET_STRUCTURES, AVOIDANCE_REGIONS } from '../core/brainData';
import { CortexModel } from './CortexModel';
import { VesselNetwork } from './VesselNetwork';
import { DBSLead } from './DBSLead';
import { MachineHapticsOverlay } from './MachineHapticsOverlay';
import { RotateCcw } from 'lucide-react';

interface Viewport3DProps {
  planState: PlanState;
}

// Camera Helper for animated view switching
const CameraController: React.FC<{
  targetView: 'iso' | 'coronal' | 'sagittal' | 'axial' | 'probe' | null;
  entryPoint: [number, number, number];
  targetPoint: [number, number, number];
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}> = ({ targetView, entryPoint, targetPoint, controlsRef }) => {
  const { camera } = useThree();

  React.useEffect(() => {
    if (!targetView || !controlsRef.current) return;

    const center = new THREE.Vector3(16, -9, 0);
    controlsRef.current.target.copy(center);

    switch (targetView) {
      case 'iso':
        camera.position.set(65, 45, 95);
        break;
      case 'coronal':
        camera.position.set(16, 120, 0);
        break;
      case 'sagittal':
        camera.position.set(120, -9, 0);
        break;
      case 'axial':
        camera.position.set(16, -9, 120);
        break;
      case 'probe': {
        const pEntry = new THREE.Vector3(...entryPoint);
        const pTarget = new THREE.Vector3(...targetPoint);
        const dir = new THREE.Vector3().subVectors(pEntry, pTarget).normalize();
        const eye = pEntry.clone().add(dir.multiplyScalar(50));
        camera.position.copy(eye);
        controlsRef.current.target.copy(pTarget);
        break;
      }
    }
    controlsRef.current.update();
  }, [targetView, camera, entryPoint, targetPoint, controlsRef]);

  return null;
};

export const Viewport3D: React.FC<Viewport3DProps> = ({ planState }) => {
  const {
    entryPoint,
    targetPoint,
    targetId,
    stimulation,
    machineHaptics,
    showMachineHaptics,
  } = planState;

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [activeView, setActiveView] = useState<'iso' | 'coronal' | 'sagittal' | 'axial' | 'probe'>('iso');

  const targetObj = TARGET_STRUCTURES[targetId] || TARGET_STRUCTURES.stn_target;
  const avoidanceObj = AVOIDANCE_REGIONS[0];

  return (
    <div className="relative w-full h-full bg-[#080B11] overflow-hidden select-none">
      <Canvas
        camera={{ position: [65, 45, 95], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        dpr={[1, 1.25]}
        frameloop="demand"
      >
        <color attach="background" args={['#080B11']} />
        <fog attach="fog" args={['#080B11', 140, 300]} />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[60, 90, 60]} intensity={1.2} color="#FFFFFF" />
        <directionalLight position={[-60, -40, -40]} intensity={0.4} color="#00F0FF" />

        <CameraController
          targetView={activeView}
          entryPoint={entryPoint}
          targetPoint={targetPoint}
          controlsRef={controlsRef}
        />

        {/* Orbit Controls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping={true}
          dampingFactor={0.06}
          maxDistance={240}
          minDistance={15}
          target={[16, -9, 0]}
        />

        {/* Translucent Cerebral Cortex */}
        <CortexModel />

        {/* Thin Vascular Paths */}
        <VesselNetwork nearestHazardId={machineHaptics.nearestHazard.id} />

        {/* Selected Target Nucleus Only */}
        <group position={targetObj.center}>
          <mesh>
            <sphereGeometry args={[targetObj.radius, 24, 24]} />
            <meshStandardMaterial
              color={targetObj.color}
              emissive={targetObj.color}
              emissiveIntensity={0.8}
              roughness={0.2}
              metalness={0.15}
              transparent={true}
              opacity={0.85}
            />
          </mesh>
        </group>

        {/* Avoidance Region */}
        <group position={avoidanceObj.center}>
          <mesh>
            <sphereGeometry args={[avoidanceObj.radius, 24, 24]} />
            <meshStandardMaterial
              color={avoidanceObj.color}
              emissive="#991B1B"
              emissiveIntensity={0.25}
              roughness={0.5}
              transparent={true}
              opacity={0.25}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* Active DBS Lead & Active Trajectory Only */}
        <DBSLead
          entryPoint={entryPoint}
          targetPoint={targetPoint}
          activeContacts={stimulation.contacts}
        />

        {/* Machine Haptics 3D Vector Streamlines */}
        <MachineHapticsOverlay
          machineHaptics={machineHaptics}
          entryPoint={entryPoint}
          targetPoint={targetPoint}
          visible={showMachineHaptics}
        />
      </Canvas>

      {/* Floating View Switcher (Top Left) */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-slate-900/90 p-1 rounded border border-slate-800 text-xs">
        {(
          [
            { id: 'iso', label: '3D' },
            { id: 'coronal', label: 'Coronal' },
            { id: 'sagittal', label: 'Sagittal' },
            { id: 'axial', label: 'Axial' },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeView === v.id
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {v.label}
          </button>
        ))}

        <div className="h-3 w-px bg-slate-700 mx-0.5" />

        <button
          onClick={() => setActiveView('iso')}
          className="p-1 rounded text-slate-400 hover:text-white"
          title="Reset Camera"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Trajectory Coordinates Tag (Bottom Left) */}
      <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-slate-400">
        E: [{entryPoint.map((v) => v.toFixed(1)).join(', ')}] &rarr; T: [{targetPoint.map((v) => v.toFixed(1)).join(', ')}]
      </div>
    </div>
  );
};
