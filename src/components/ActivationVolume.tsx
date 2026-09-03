import React, { useMemo } from 'react';
import { Vector3Tuple } from '../core/types';
import { computeContactPositions } from '../core/stimulation';

interface ActivationVolumeProps {
  entryPoint: Vector3Tuple;
  targetPoint: Vector3Tuple;
  activeContacts: number[];
  radiusMm: number;
}

export const ActivationVolume: React.FC<ActivationVolumeProps> = ({
  entryPoint,
  targetPoint,
  activeContacts,
  radiusMm,
}) => {
  const contactPositions = useMemo(() => {
    return computeContactPositions(entryPoint, targetPoint);
  }, [entryPoint, targetPoint]);

  return (
    <group name="ActivationVolume">
      {activeContacts.map((cIdx) => {
        const pos = contactPositions[cIdx];
        if (!pos) return null;
        return (
          <group key={cIdx} position={pos}>
            {/* Outer Translucent Proxy Sphere */}
            <mesh>
              <sphereGeometry args={[radiusMm, 32, 32]} />
              <meshStandardMaterial
                color="#FBBF24"
                emissive="#F59E0B"
                emissiveIntensity={0.5}
                roughness={0.25}
                metalness={0.1}
                transparent={true}
                opacity={0.35}
                depthWrite={false}
              />
            </mesh>

            {/* Inner Core Proxy Sphere */}
            <mesh>
              <sphereGeometry args={[radiusMm * 0.55, 24, 24]} />
              <meshBasicMaterial
                color="#FEF08A"
                transparent={true}
                opacity={0.3}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
