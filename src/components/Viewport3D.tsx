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
import { ActivationVolume } from './ActivationVolume';
import { CandidateGhosts } from './CandidateGhosts';
import { MachineHapticsOverlay } from './MachineHapticsOverlay';
import {
  Layers,
  RotateCcw,
  Eye,
  EyeOff,
  Compass,
} from 'lucide-react';

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
      case 'coronal': // Anterior-Posterior View
        camera.position.set(16, 120, 0);
        break;
      case 'sagittal': // Lateral View
        camera.position.set(120, -9, 0);
        break;
      case 'axial': // Superior View
        camera.position.set(16, -9, 120);
        break;
      case 'probe': { // Looking directly down trajectory
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
    stimulationPreview,
    searchCandidates,
    hoveredCandidateId,
    previousTrajectory,
    stagedCandidate,
    machineHaptics,
    showMachineHaptics,
  } = planState;

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [activeView, setActiveView] = useState<'iso' | 'coronal' | 'sagittal' | 'axial' | 'probe'>('iso');

  // Layer toggles
  const [layers, setLayers] = useState({
    cortex: true,
    vessels: true,
    nuclei: true,
    avoidance: true,
    ghosts: true,
    lead: true,
  });

  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const handleResetCamera = () => {
    setActiveView('iso');
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      <Canvas
        camera={{ position: [65, 45, 95], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#080B11']} />
        <fog attach="fog" args={['#080B11', 140, 300]} />

        {/* Studio Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[60, 90, 60]} intensity={1.3} color="#FFFFFF" />
        <directionalLight position={[-60, -40, -40]} intensity={0.4} color="#00F0FF" />
        <pointLight position={[12, -12, -6]} intensity={1.0} distance={70} color="#00F0FF" />
        <pointLight position={[20, -6, -3]} intensity={0.8} distance={60} color="#FBBF24" />

        <CameraController
          targetView={activeView}
          entryPoint={entryPoint}
          targetPoint={targetPoint}
          controlsRef={controlsRef}
        />

        {/* Orbit Controls with Silky Smooth Damping */}
        <OrbitControls
          ref={controlsRef}
          enableDamping={true}
          dampingFactor={0.06}
          maxDistance={240}
          minDistance={15}
          target={[16, -9, 0]}
        />

        {/* Procedural Cortex Shell & Sulcal Lines */}
        {layers.cortex && <CortexModel />}

        {/* Synthetic Vascular Network (14 Vessels) */}
        {layers.vessels && <VesselNetwork nearestHazardId={machineHaptics.nearestHazard.id} />}

        {/* Target Nuclei */}
        {layers.nuclei &&
          Object.values(TARGET_STRUCTURES).map((target) => {
            const isSelected = target.id === targetId;
            return (
              <group key={target.id} position={target.center}>
                <mesh>
                  <sphereGeometry args={[target.radius, 32, 32]} />
                  <meshStandardMaterial
                    color={target.color}
                    emissive={target.color}
                    emissiveIntensity={isSelected ? 0.75 : 0.25}
                    roughness={0.2}
                    metalness={0.15}
                    transparent={true}
                    opacity={isSelected ? 0.8 : 0.45}
                  />
                </mesh>
                {/* Target nucleus wireframe halo */}
                {isSelected && (
                  <mesh>
                    <sphereGeometry args={[target.radius * 1.18, 20, 20]} />
                    <meshBasicMaterial color={target.color} wireframe transparent opacity={0.35} />
                  </mesh>
                )}
              </group>
            );
          })}

        {/* Avoidance Region (Internal Capsule Demonstration Boundary) */}
        {layers.avoidance &&
          AVOIDANCE_REGIONS.map((avoidance) => (
            <group key={avoidance.id} position={avoidance.center}>
              <mesh>
                <sphereGeometry args={[avoidance.radius, 32, 32]} />
                <meshStandardMaterial
                  color={avoidance.color}
                  emissive="#B91C1C"
                  emissiveIntensity={0.3}
                  roughness={0.5}
                  transparent={true}
                  opacity={0.3}
                  depthWrite={false}
                />
              </mesh>
              <mesh>
                <sphereGeometry args={[avoidance.radius * 1.05, 16, 16]} />
                <meshBasicMaterial color="#FF3B69" wireframe transparent opacity={0.25} />
              </mesh>
            </group>
          ))}

        {/* Active DBS Lead & Contact Rings */}
        {layers.lead && (
          <>
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
          </>
        )}

        {/* Candidate Ghosts & Staged Trajectory Highlights */}
        {layers.ghosts && (
          <CandidateGhosts
            candidates={searchCandidates}
            hoveredCandidateId={hoveredCandidateId}
            previousTrajectory={previousTrajectory}
            stagedCandidate={stagedCandidate}
          />
        )}

        {/* Machine Haptics 3D Vector Streamlines */}
        <MachineHapticsOverlay
          machineHaptics={machineHaptics}
          entryPoint={entryPoint}
          targetPoint={targetPoint}
          visible={showMachineHaptics}
        />
      </Canvas>

      {/* Floating Viewport Camera Toolbar (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 glass-panel p-1.5 rounded-xl shadow-panel">
        <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          Views:
        </span>

        {(
          [
            { id: 'iso', label: '3D Iso' },
            { id: 'coronal', label: 'Coronal (AP)' },
            { id: 'sagittal', label: 'Sagittal (Lat)' },
            { id: 'axial', label: 'Axial (Sup)' },
            { id: 'probe', label: 'Probe POV' },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeView === v.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {v.label}
          </button>
        ))}

        <div className="h-4 w-px bg-slate-700/60 mx-1" />

        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Reset Camera Position"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Layers Filter (Top Right) */}
      <div className="absolute top-4 right-4 z-10">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium glass-panel shadow-panel transition-all ${
              showLayerMenu
                ? 'text-cyan-300 border-cyan-500/40'
                : 'text-slate-300 hover:text-white hover:border-slate-600'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Layers</span>
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 mt-2 w-52 glass-panel-elevated p-2 rounded-xl shadow-2xl space-y-1 text-xs">
              <div className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-1 tracking-wider">
                Anatomy Layers
              </div>

              {[
                { key: 'cortex' as const, label: 'Cerebral Cortex' },
                { key: 'vessels' as const, label: 'Vascular Arborization' },
                { key: 'nuclei' as const, label: 'Deep Target Nuclei' },
                { key: 'avoidance' as const, label: 'Hazard Avoidance Zones' },
                { key: 'lead' as const, label: 'DBS Lead & VTA Proxy' },
                { key: 'ghosts' as const, label: 'Pareto Candidate Trajectories' },
              ].map((l) => {
                const isEnabled = layers[l.key];
                return (
                  <button
                    key={l.key}
                    onClick={() => setLayers({ ...layers, [l.key]: !isEnabled })}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800/80 transition-colors"
                  >
                    <span>{l.label}</span>
                    {isEnabled ? (
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating 3D Spatial Compass / Coordinates */}
      <div className="absolute bottom-4 left-4 z-10 glass-panel px-3 py-1.5 rounded-xl text-xs flex items-center gap-3 text-slate-400 shadow-panel">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-cyan" />
          <span className="font-medium text-slate-200">Stereotactic View</span>
        </div>
        <div className="h-3 w-px bg-slate-700/60" />
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span>E: [{entryPoint.map((v) => v.toFixed(1)).join(', ')}]</span>
          <span>&rarr;</span>
          <span className="text-cyan-400">T: [{targetPoint.map((v) => v.toFixed(1)).join(', ')}]</span>
        </div>
      </div>

      {/* Orbit Gesture Tooltip (Bottom Center) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none text-[11px] text-slate-400 glass-panel px-3 py-1 rounded-full shadow-panel hidden sm:flex items-center gap-2">
        <span>Rotate: <strong className="text-slate-200">Left-Drag</strong></span>
        <span>&bull;</span>
        <span>Pan: <strong className="text-slate-200">Right-Drag</strong></span>
        <span>&bull;</span>
        <span>Zoom: <strong className="text-slate-200">Scroll</strong></span>
      </div>
    </div>
  );
};
