import { useEffect, useRef, useState } from 'react';
import { Worker as WorkerType } from '../store/gameStore';
import { useGameStore } from '../store/gameStore';
import {
  WORKER_RADIUS,
  MOVEMENT_DURATION,
  MAX_WOOD_CAPACITY,
  HARVEST_RANGE,
} from '../constants';

const HARVEST_RATE = 1000; // 1 second per wood unit

interface WorkerProps {
  worker: WorkerType;
}

export function Worker({ worker }: WorkerProps) {
  const { selectEntity, updateWorkerPosition, depositWood, startHarvesting, updateHarvestProgress } = useGameStore();
  const workerRef = useRef<HTMLDivElement>(null);
  const shouldReturnToTree = useRef(false);
  const [progress, setProgress] = useState(0);
  const progressStartTime = useRef<number | null>(null);
  const animationFrameRef = useRef<number>();

  // Check if worker is in range of a tree and should start harvesting
  useEffect(() => {
    if (worker.isMoving || worker.isHarvesting || worker.woodCarried >= MAX_WOOD_CAPACITY) return;

    const gameStore = useGameStore.getState();
    const nearestTree = gameStore.trees.find(tree => {
      const dx = tree.position.x - worker.position.x;
      const dy = tree.position.y - worker.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= HARVEST_RANGE;
    });

    if (nearestTree) {
      startHarvesting(worker.id);
    }
  }, [worker.position, worker.id, worker.isMoving, worker.isHarvesting, worker.woodCarried, startHarvesting]);

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
        updateWorkerPosition(worker.id, { x: targetX, y: targetY });
        
        if (worker.woodCarried > 0) {
          shouldReturnToTree.current = true;
          depositWood(worker.id);
        } else if (shouldReturnToTree.current && worker.lastHarvestedTreeId !== null) {
          shouldReturnToTree.current = false;
          startHarvesting(worker.id);
        }
      }
    }

    requestAnimationFrame(animate);
  }, [worker.isMoving, worker.targetPosition, worker.position, worker.id, updateWorkerPosition, worker.woodCarried, depositWood, worker.lastHarvestedTreeId, startHarvesting]);

  // Handle harvesting progress animation
  useEffect(() => {
    if (!worker.isHarvesting || worker.lastHarvestedTreeId === null) {
      setProgress(0);
      progressStartTime.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    function animateProgress(timestamp: number) {
      if (!progressStartTime.current) {
        progressStartTime.current = timestamp;
      }

      const elapsed = timestamp - progressStartTime.current;
      const currentProgress = (elapsed % HARVEST_RATE) / HARVEST_RATE;
      const completedCycles = Math.floor(elapsed / HARVEST_RATE);

      // Check if we've completed a cycle
      if (completedCycles > 0) {
        progressStartTime.current = timestamp;
        if (worker.woodCarried < MAX_WOOD_CAPACITY) {
          updateHarvestProgress(worker.id, worker.lastHarvestedTreeId);
        }
      }

      setProgress(currentProgress);
      animationFrameRef.current = requestAnimationFrame(animateProgress);
    }

    animationFrameRef.current = requestAnimationFrame(animateProgress);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [worker.isHarvesting, worker.woodCarried, worker.id, worker.lastHarvestedTreeId, updateHarvestProgress]);

  // Handle auto-return to home when full
  useEffect(() => {
    if (!worker.isHarvesting || worker.isMoving) return;

    if (worker.woodCarried >= MAX_WOOD_CAPACITY) {
      const gameStore = useGameStore.getState();
      const home = gameStore.home;
      if (home) {
        gameStore.moveWorker(worker.id, home.position);
      }
    }
  }, [worker.isHarvesting, worker.isMoving, worker.id, worker.woodCarried]);

  const size = WORKER_RADIUS * 2;
  const circumference = 2 * Math.PI * (size / 2 + 2);

  return (
    <div
      ref={workerRef}
      className={`worker ${worker.isSelected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: `${worker.position.x}px`,
        top: `${worker.position.y}px`,
        width: size,
        height: size,
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
      {/* Circular Progress Indicator */}
      {worker.isHarvesting && (
        <svg
          style={{
            position: 'absolute',
            top: -4,
            left: -4,
            width: size + 8,
            height: size + 8,
            transform: 'rotate(-90deg)',
            zIndex: 2,
          }}
        >
          <circle
            cx={(size + 8) / 2}
            cy={(size + 8) / 2}
            r={size / 2 + 2}
            fill="none"
            stroke="#4CAF50"
            strokeWidth="2"
            strokeDasharray={`${progress * circumference} ${circumference}`}
            style={{
              transition: 'stroke-dasharray 0.1s linear',
            }}
          />
        </svg>
      )}
    </div>
  );
} 