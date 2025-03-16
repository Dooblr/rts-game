import { useState, useEffect } from 'react';
import { Tree as TreeType } from '../store/gameStore';
import { useGameStore } from '../store/gameStore';
import {
  TREE_SIZE,
  TREE_TRUNK_WIDTH,
  TREE_TRUNK_HEIGHT,
  HARVEST_RANGE,
  RANGE_INDICATOR_COLOR,
  RANGE_INDICATOR_BORDER,
} from '../constants';

interface TreeProps {
  tree: TreeType;
  index: number;
}

interface ClickAnimation {
  id: number;
  x: number;
  y: number;
}

export function Tree({ tree, index }: TreeProps) {
  const { selectedEntityId, workers, startHarvesting } = useGameStore();
  const selectedWorker = workers.find(w => w.id === selectedEntityId);
  const [clickAnimations, setClickAnimations] = useState<ClickAnimation[]>([]);
  const [showRange, setShowRange] = useState(false);

  // Cleanup animations after they finish
  useEffect(() => {
    if (clickAnimations.length > 0) {
      const timer = setTimeout(() => {
        setClickAnimations([]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [clickAnimations]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedWorker) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setClickAnimations([
        ...clickAnimations,
        { id: Date.now(), x, y }
      ]);

      startHarvesting(selectedWorker.id);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: tree.position.x - TREE_SIZE / 2,
        top: tree.position.y - (TREE_SIZE + TREE_TRUNK_HEIGHT / 2),
        width: TREE_SIZE,
        height: TREE_SIZE + TREE_TRUNK_HEIGHT,
        cursor: selectedWorker ? 'pointer' : 'default',
      }}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        handleClick(e);
      }}
      onMouseEnter={() => setShowRange(true)}
      onMouseLeave={() => setShowRange(false)}
    >
      {/* Range indicator */}
      {showRange && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: HARVEST_RANGE * 2,
            height: HARVEST_RANGE * 2,
            borderRadius: '50%',
            backgroundColor: RANGE_INDICATOR_COLOR,
            border: `1px solid ${RANGE_INDICATOR_BORDER}`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Click animations */}
      {clickAnimations.map(animation => (
        <div
          key={animation.id}
          style={{
            position: 'absolute',
            left: animation.x,
            top: animation.y,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '2px solid #4CAF50',
            transform: 'translate(-50%, -50%)',
            animation: 'ripple 1s ease-out forwards',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      ))}

      {/* Tree trunk */}
      <div
        style={{
          position: 'absolute',
          bottom: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: TREE_TRUNK_WIDTH,
          height: TREE_TRUNK_HEIGHT,
          backgroundColor: '#8B4513',
        }}
      />
      
      {/* Tree top */}
      <div
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: TREE_SIZE,
          height: TREE_SIZE,
          backgroundColor: '#228B22',
          borderRadius: '50%',
        }}
      />

      {/* Progress bar */}
      {tree.harvestProgress > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '-10px',
            left: '0',
            width: '100%',
            height: '4px',
            backgroundColor: '#333',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${tree.harvestProgress * 100}%`,
              height: '100%',
              backgroundColor: '#4CAF50',
              transition: 'width 0.1s linear',
            }}
          />
        </div>
      )}

      {/* Wood amount */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '10px',
          fontSize: '12px',
        }}
      >
        {tree.woodAmount}
      </div>
    </div>
  );
} 