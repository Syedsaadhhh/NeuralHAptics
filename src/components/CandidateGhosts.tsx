import React from 'react';
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
  // Show up to 3 ghost candidate lines from search
  const visibleGhosts = candidates.slice(0, 3);

  return (
    <group name="CandidateGhosts">
      {/* 1. Previous Plan (Dashed / Dim Grey Ghost Line) */}
      {previousTrajectory && (
        <group>
          {(() => {
            const p1 = new THREE.Vector3(...previousTrajectory.entryPoint);
            const p2 = new THREE.Vector3(...previousTrajectory.targetPoint);
            const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const mat = new THREE.LineDashedMaterial({
              color: 0x64748b,
              dashSize: 2,
              gapSize: 1.5,
              transparent: true,
              opacity: 0.5,
            });
            const line = new THREE.Line(geo, mat);
            line.computeLineDistances();
            return <primitive object={line} />;
          })()}
        </group>
      )}

      {/* 2. Top Pareto Candidate Ghost Corridors */}
      {visibleGhosts.map((candidate, idx) => {
        const isHovered = candidate.candidateId === hoveredCandidateId;
        const isStaged = stagedCandidate?.candidateId === candidate.candidateId;

        // Don't render ghost line for staged if it's already rendered as the active probe
        if (isStaged) return null;

        const p1 = new THREE.Vector3(...candidate.entryPoint);
        const p2 = new THREE.Vector3(...candidate.targetPoint);
        const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const mat = new THREE.LineBasicMaterial({
          color: isHovered ? 0x00e5ff : 0x475569,
          transparent: true,
          opacity: isHovered ? 0.9 : 0.35 - idx * 0.08,
        });
        const line = new THREE.Line(geo, mat);

        return (
          <group key={candidate.candidateId}>
            <primitive object={line} />

            {/* Entry point dot */}
            <mesh position={candidate.entryPoint}>
              <sphereGeometry args={[isHovered ? 0.7 : 0.4, 12, 12]} />
              <meshBasicMaterial
                color={isHovered ? '#00E5FF' : '#64748B'}
                transparent
                opacity={isHovered ? 0.9 : 0.4}
              />
            </mesh>
          </group>
        );
      })}

      {/* 3. Visually Dominant Staged Candidate Indicator (Gold) */}
      {stagedCandidate && (
        <mesh position={stagedCandidate.entryPoint}>
          <ringGeometry args={[1.5, 2.5, 32]} />
          <meshBasicMaterial color="#FFB300" side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
};
