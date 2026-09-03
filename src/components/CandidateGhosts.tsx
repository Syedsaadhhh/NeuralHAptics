import React, { useMemo } from 'react';
import * as THREE from 'three';
import { CandidateTrajectory, Vector3Tuple } from '../core/types';

interface CandidateGhostsProps {
  candidates: CandidateTrajectory[];
  hoveredCandidateId: string | null;
  previousTrajectory: { entryPoint: Vector3Tuple; targetPoint: Vector3Tuple } | null;
  stagedCandidate: CandidateTrajectory | null;
}

export const CandidateGhosts: React.FC<CandidateGhostsProps> = ({
  candidates,
  hoveredCandidateId,
  previousTrajectory,
  stagedCandidate,
}) => {
  // Show up to 4 Pareto candidates
  const visibleGhosts = candidates.slice(0, 4);

  // Memoize previous trajectory line object
  const prevLineObj = useMemo(() => {
    if (!previousTrajectory) return null;
    const p1 = new THREE.Vector3(...previousTrajectory.entryPoint);
    const p2 = new THREE.Vector3(...previousTrajectory.targetPoint);
    const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const mat = new THREE.LineBasicMaterial({
      color: 0x64748B,
      transparent: true,
      opacity: 0.4,
    });
    return new THREE.Line(geo, mat);
  }, [previousTrajectory]);

  // Memoize candidate trajectory line objects
  const candidateItems = useMemo(() => {
    return visibleGhosts.map((c, idx) => {
      const p1 = new THREE.Vector3(...c.entryPoint);
      const p2 = new THREE.Vector3(...c.targetPoint);
      const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const mat = new THREE.LineBasicMaterial({
        color: 0x475569,
        transparent: true,
        opacity: 0.35 - idx * 0.06,
      });
      const line = new THREE.Line(geo, mat);
      return {
        id: c.candidateId,
        entryPoint: c.entryPoint,
        lineObj: line,
      };
    });
  }, [visibleGhosts]);

  return (
    <group name="CandidateGhosts">
      {/* 1. Previous Trajectory (Silver Reference Line) */}
      {prevLineObj && <primitive object={prevLineObj} />}

      {/* 2. Pareto Candidate Trajectory Streams */}
      {candidateItems.map((item) => {
        const isHovered = item.id === hoveredCandidateId;
        const isStaged = stagedCandidate?.candidateId === item.id;

        if (isStaged) return null;

        return (
          <group key={item.id}>
            <primitive object={item.lineObj} />

            {/* Entry point dot */}
            <mesh position={item.entryPoint}>
              <sphereGeometry args={[isHovered ? 0.8 : 0.45, 16, 16]} />
              <meshBasicMaterial
                color={isHovered ? '#00F0FF' : '#64748B'}
                transparent
                opacity={isHovered ? 0.95 : 0.45}
              />
            </mesh>
          </group>
        );
      })}

      {/* 3. Visually Dominant Staged Candidate Collar (Vibrant Gold) */}
      {stagedCandidate && (
        <group position={stagedCandidate.entryPoint}>
          <mesh>
            <ringGeometry args={[1.4, 2.6, 32]} />
            <meshBasicMaterial color="#FBBF24" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.15]}>
            <ringGeometry args={[2.8, 3.0, 32]} />
            <meshBasicMaterial color="#FBBF24" side={THREE.DoubleSide} transparent opacity={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
};
