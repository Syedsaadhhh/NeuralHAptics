import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PlanState } from '../core/types';
import { TARGET_STRUCTURES, AVOIDANCE_REGIONS } from '../core/brainData';
import { CortexModel } from './CortexModel';
import { VesselNetwork } from './VesselNetwork';
import { DBSLead } from './DBSLead';
import { ActivationVolume } from './ActivationVolume';
import { CandidateGhosts } from './CandidateGhosts';
import { MachineHapticsOverlay } from './MachineHapticsOverlay';

interface Viewport3DProps {
  planState: PlanState;
}

// Camera controller for smooth focus animation when staged corridor changes
const CameraManager: React.FC<{ stagedCandidateId?: string | null }> = ({
  stagedCandidateId,
}) => {
  const { camera } = useThree();
  const prevStagedRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (prevStagedRef.current !== undefined && stagedCandidateId !== prevStagedRef.current) {
      // Animate camera gently toward the active region
      const startPos = camera.position.clone();
      const targetPos = new THREE.Vector3(45, 30, 85);
      let progress = 0;

      const anim = () => {
        progress += 0.04;
        camera.position.lerpVectors(startPos, targetPos, Math.min(1, progress));
        camera.lookAt(16, -9, 0);
        if (progress < 1) {
          requestAnimationFrame(anim);
        }
      };
      requestAnimationFrame(anim);
    }
    prevStagedRef.current = stagedCandidateId;
  }, [stagedCandidateId, camera]);

  return null;
};

export const Viewport3D: React.FC<Viewport3DProps> = ({ planState }) => {
  const {
    entryPoint,
    targetPoint,
    targetId,
    stimulation,
    stimulationPreview,
    searchCandidates,
    hoveredCandidateId,
    previousTrajectory,
    stagedCandidate,
    machineHaptics,
    showMachineHaptics,
  } = planState;

  return (
    <div className="relative w-full h-full bg-dark-950 overflow-hidden select-none">
      <Canvas
        camera={{ position: [60, 45, 95], fov: 45, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#07090D']} />
        <fog attach="fog" args={['#07090D', 120, 260]} />

        {/* Lighting */}
        <ambientLight intensity={0.45} />
        <directionalLight position={[50, 80, 50]} intensity={1.2} color="#F8FAFC" />
        <directionalLight position={[-40, -30, -30]} intensity={0.3} color="#00E5FF" />
        <pointLight position={[12, -12, -6]} intensity={0.8} distance={60} color="#00E5FF" />

        <CameraManager stagedCandidateId={stagedCandidate?.candidateId} />

        {/* Orbit Controls with Damping */}
        <OrbitControls
          enableDamping={true}
          dampingFactor={0.05}
          maxDistance={220}
          minDistance={15}
          target={[16, -9, 0]}
        />

        {/* Procedural Cortex Shell & Sulcal Lines */}
        <CortexModel />

        {/* Synthetic Vascular Network (14 Vessels) */}
        <VesselNetwork nearestHazardId={machineHaptics.nearestHazard.id} />

        {/* Target Nuclei */}
        {Object.values(TARGET_STRUCTURES).map((target) => {
          const isSelected = target.id === targetId;
          return (
            <group key={target.id} position={target.center}>
              <mesh>
                <sphereGeometry args={[target.radius, 32, 32]} />
                <meshStandardMaterial
                  color={target.color}
                  emissive={target.color}
                  emissiveIntensity={isSelected ? 0.6 : 0.2}
                  roughness={0.2}
                  metalness={0.1}
                  transparent={true}
                  opacity={isSelected ? 0.75 : 0.4}
                />
              </mesh>
              {/* Target nucleus wireframe halo */}
              {isSelected && (
                <mesh>
                  <sphereGeometry args={[target.radius * 1.15, 16, 16]} />
                  <meshBasicMaterial color={target.color} wireframe transparent opacity={0.3} />
                </mesh>
              )}
            </group>
          );
        })}

        {/* Avoidance Region (Internal Capsule Demonstration Boundary) */}
        {AVOIDANCE_REGIONS.map((avoidance) => (
          <group key={avoidance.id} position={avoidance.center}>
            <mesh>
              <sphereGeometry args={[avoidance.radius, 32, 32]} />
              <meshStandardMaterial
                color={avoidance.color}
                emissive="#990022"
                emissiveIntensity={0.35}
                roughness={0.5}
                transparent={true}
                opacity={0.35}
                depthWrite={false}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[avoidance.radius * 1.05, 16, 16]} />
              <meshBasicMaterial color="#FF466C" wireframe transparent opacity={0.25} />
            </mesh>
          </group>
        ))}

        {/* Active DBS Lead & Contact Rings */}
        <DBSLead
          entryPoint={entryPoint}
          targetPoint={targetPoint}
          activeContacts={stimulation.contacts}
        />

        {/* Activation Proxy Volume */}
        <ActivationVolume
          entryPoint={entryPoint}
          targetPoint={targetPoint}
          activeContacts={stimulation.contacts}
          radiusMm={stimulationPreview.activationProxyRadiusMm}
        />

        {/* Candidate Ghosts & Staged Trajectory Highlights */}
        <CandidateGhosts
          candidates={searchCandidates}
          hoveredCandidateId={hoveredCandidateId}
          previousTrajectory={previousTrajectory}
          stagedCandidate={stagedCandidate}
        />

        {/* Machine Haptics 3D Vector Arrows */}
        <MachineHapticsOverlay
          machineHaptics={machineHaptics}
          entryPoint={entryPoint}
          targetPoint={targetPoint}
          visible={showMachineHaptics}
        />
      </Canvas>

      {/* 3D Viewport Corner Badges */}
      <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5 bg-dark-900/80 backdrop-blur px-2.5 py-1 rounded border border-dark-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Three.js WebGL Engine (60 FPS)</span>
        </div>
        <div className="text-[10px] text-slate-500 bg-dark-900/60 backdrop-blur px-2 py-0.5 rounded border border-dark-800">
          Stereotactic Synthetic Origin [0, 0, 0] mm
        </div>
      </div>

      <div className="absolute bottom-3 left-3 pointer-events-none text-[10px] font-mono text-slate-500 bg-dark-900/70 backdrop-blur px-2 py-1 rounded border border-dark-800">
        Left-drag: Orbit | Right-drag: Pan | Scroll: Zoom
      </div>
    </div>
  );
};
