import { useEffect, useRef } from 'react';
import { Worker as WorkerType } from '../store/gameStore';
import { useGameStore } from '../store/gameStore';
import {
  WORKER_RADIUS,
  MOVEMENT_DURATION,
} from '../constants';

interface WorkerProps {
  worker: WorkerType;
}

export function Worker({ worker }: WorkerProps) {
  const { selectEntity, updateWorkerPosition, depositWood, startHarvesting } = useGameStore();
  const workerRef = useRef<HTMLDivElement>(null);

  // Handle worker movement animation
  useEffect(() => {
    if (!worker.isMoving || !worker.targetPosition || !workerRef.current) return;

    const element = workerRef.current;
    const startX = worker.position.x;
    const startY = worker.position.y;
    const targetX = worker.targetPosition.x;
    const targetY = worker.targetPosition.y;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / MOVEMENT_DURATION, 1);

      const currentX = startX + (targetX - startX) * progress;
      const currentY = startY + (targetY - startY) * progress;

      element.style.left = `${currentX}px`;
      element.style.top = `${currentY}px`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Update the final position in the store
        updateWorkerPosition(worker.id, { x: targetX, y: targetY });
        
        // If we were moving to deposit wood, try depositing
        if (worker.woodCarried > 0) {
          depositWood(worker.id);
        } else if (worker.lastHarvestedTreeId !== null) {
          // If we just deposited and have a tree to return to, start harvesting
          startHarvesting(worker.id);
        }
      }
    }

    requestAnimationFrame(animate);
  }, [worker.isMoving, worker.targetPosition, worker.position, worker.id, updateWorkerPosition, worker.woodCarried, depositWood, worker.lastHarvestedTreeId, startHarvesting]);

  // Handle harvesting progress updates
  useEffect(() => {
    if (!worker.isHarvesting) return;

    const interval = setInterval(() => {
      useGameStore.getState().updateHarvestProgress(worker.id, 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [worker.isHarvesting, worker.id]);

  return (
    <div
      ref={workerRef}
      className={`worker ${worker.isSelected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: `${worker.position.x}px`,
        top: `${worker.position.y}px`,
        width: WORKER_RADIUS * 2,
        height: WORKER_RADIUS * 2,
        marginLeft: `-${WORKER_RADIUS}px`,
        marginTop: `-${WORKER_RADIUS}px`,
        borderRadius: '50%',
        backgroundColor: '#0066cc',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease',
        boxShadow: worker.isSelected 
          ? '0 0 0 3px white' 
          : 'none',
        zIndex: worker.isSelected ? 2 : 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        selectEntity(worker.id);
      }}
      onMouseEnter={(e) => {
        if (!worker.isSelected) {
          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        if (!worker.isSelected) {
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {/* Wood carried indicator */}
      {worker.woodCarried > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#8B4513',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '10px',
            fontSize: '12px',
            zIndex: 3,
          }}
        >
          {worker.woodCarried}
        </div>
      )}
    </div>
  );
} 