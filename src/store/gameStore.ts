import { create } from 'zustand';
import {
  WORKER_COST,
  MAX_WOOD_CAPACITY,
  HARVEST_RANGE,
  DEPOSIT_RANGE,
  WORKER_COLLISION_RADIUS,
  HARVEST_SPEED,
  DEPOSIT_TO_HARVEST_DELAY,
  RETURN_TO_HARVEST_DELAY,
  INITIAL_TREE_WOOD,
  INITIAL_HOME_WOOD,
  MIN_HARVEST_RANGE,
  MAX_HARVEST_RANGE,
  HARVEST_ANGLE_SPACING,
} from '../constants';

export interface Position {
  x: number;
  y: number;
}

export interface Worker {
  id: string;
  position: Position;
  woodCarried: number;
  isSelected: boolean;
  isHarvesting: boolean;
  isMoving: boolean;
  targetPosition: Position | null;
  lastHarvestedTreeId: number | null;
}

export interface Tree {
  position: Position;
  woodAmount: number;
  harvestProgress: number;
}

export interface Home {
  position: Position;
  woodStored: number;
  isSelected: boolean;
}

interface GameState {
  workers: Worker[];
  trees: Tree[];
  home: Home;
  selectedEntityId: string | null;
  
  // Actions
  addWorker: (position: Position) => void;
  moveWorker: (workerId: string, position: Position) => void;
  selectEntity: (entityId: string | null) => void;
  startHarvesting: (workerId: string) => void;
  stopHarvesting: (workerId: string) => void;
  updateHarvestProgress: (workerId: string, treeId: number) => void;
  depositWood: (workerId: string) => void;
  trainWorker: () => void;
  updateWorkerPosition: (workerId: string, position: Position) => void;
  returnToHarvesting: (workerId: string) => void;
}

// Helper function to find a valid position near target that doesn't collide with other workers
function findValidPosition(
  workerId: string,
  targetX: number,
  targetY: number,
  workers: Worker[],
  currentX: number,
  currentY: number
): Position {
  // First try the direct target position
  const otherWorkers = workers.filter(w => w.id !== workerId);
  let isValidPosition = otherWorkers.every(other => {
    const dx = targetX - other.position.x;
    const dy = targetY - other.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance >= WORKER_COLLISION_RADIUS;
  });

  if (isValidPosition) {
    return { x: targetX, y: targetY };
  }

  // If direct position is not valid, try positions in a spiral pattern
  const angleStep = Math.PI / 8;
  const radiusStep = WORKER_COLLISION_RADIUS / 2;
  let radius = WORKER_COLLISION_RADIUS;
  let angle = Math.atan2(targetY - currentY, targetX - currentX);
  const maxAttempts = 32; // Limit search to prevent infinite loops

  for (let i = 0; i < maxAttempts; i++) {
    angle += angleStep;
    if (i % 8 === 0) radius += radiusStep;

    const tryX = targetX + radius * Math.cos(angle);
    const tryY = targetY + radius * Math.sin(angle);

    isValidPosition = otherWorkers.every(other => {
      const dx = tryX - other.position.x;
      const dy = tryY - other.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance >= WORKER_COLLISION_RADIUS;
    });

    if (isValidPosition) {
      return { x: tryX, y: tryY };
    }
  }

  // If no position found, return original target but with minimum spacing from nearest worker
  const nearestWorker = otherWorkers.reduce((nearest, other) => {
    const dx = targetX - other.position.x;
    const dy = targetY - other.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < nearest.distance ? { worker: other, distance } : nearest;
  }, { worker: otherWorkers[0], distance: Infinity });

  if (nearestWorker.worker) {
    const dx = targetX - nearestWorker.worker.position.x;
    const dy = targetY - nearestWorker.worker.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < WORKER_COLLISION_RADIUS) {
      const angle = Math.atan2(dy, dx);
      return {
        x: nearestWorker.worker.position.x + WORKER_COLLISION_RADIUS * Math.cos(angle),
        y: nearestWorker.worker.position.y + WORKER_COLLISION_RADIUS * Math.sin(angle)
      };
    }
  }

  return { x: targetX, y: targetY };
}

// Helper function to find the best harvesting position around a tree
function findHarvestPosition(
  workerId: string,
  tree: Tree,
  workers: Worker[],
  currentWorkerPos: Position
): Position {
  const harvestingWorkers = workers.filter(w => 
    w.id !== workerId && 
    w.isHarvesting && 
    w.lastHarvestedTreeId === 0
  );

  // If no other workers are harvesting, use the closest point
  if (harvestingWorkers.length === 0) {
    const angle = Math.atan2(
      tree.position.y - currentWorkerPos.y,
      tree.position.x - currentWorkerPos.x
    );
    return {
      x: tree.position.x - Math.cos(angle) * MIN_HARVEST_RANGE,
      y: tree.position.y - Math.sin(angle) * MIN_HARVEST_RANGE
    };
  }

  // Find all taken angles
  const takenAngles = harvestingWorkers.map(w => 
    Math.atan2(w.position.y - tree.position.y, w.position.x - tree.position.x)
  );

  // Normalize angles to 0-2π
  const normalizedTakenAngles = takenAngles.map(angle => 
    angle < 0 ? angle + 2 * Math.PI : angle
  ).sort((a, b) => a - b);

  // Find the largest gap between taken angles
  let largestGap = normalizedTakenAngles[0] + (2 * Math.PI - normalizedTakenAngles[normalizedTakenAngles.length - 1]);
  let bestAngle = (normalizedTakenAngles[0] + normalizedTakenAngles[normalizedTakenAngles.length - 1]) / 2;

  for (let i = 1; i < normalizedTakenAngles.length; i++) {
    const gap = normalizedTakenAngles[i] - normalizedTakenAngles[i - 1];
    if (gap > largestGap) {
      largestGap = gap;
      bestAngle = normalizedTakenAngles[i - 1] + gap / 2;
    }
  }

  // Use a random distance between MIN and MAX harvest range
  const distance = MIN_HARVEST_RANGE + Math.random() * (MAX_HARVEST_RANGE - MIN_HARVEST_RANGE);

  return {
    x: tree.position.x + Math.cos(bestAngle) * distance,
    y: tree.position.y + Math.sin(bestAngle) * distance
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  workers: [],
  trees: [
    {
      position: { x: window.innerWidth / 2 + 200, y: window.innerHeight / 2 },
      woodAmount: INITIAL_TREE_WOOD,
      harvestProgress: 0,
    },
  ],
  home: {
    position: { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 },
    woodStored: INITIAL_HOME_WOOD,
    isSelected: false,
  },
  selectedEntityId: null,

  addWorker: (position) => {
    const newWorker: Worker = {
      id: crypto.randomUUID(),
      position,
      woodCarried: 0,
      isSelected: false,
      isHarvesting: false,
      isMoving: false,
      targetPosition: null,
      lastHarvestedTreeId: null,
    };

    set((state) => ({
      workers: [...state.workers, newWorker],
    }));
  },

  moveWorker: (workerId, targetPosition) => {
    const state = get();
    const worker = state.workers.find(w => w.id === workerId);
    if (!worker) return;

    // Find a valid position that doesn't collide with other workers
    const validPosition = findValidPosition(
      workerId,
      targetPosition.x,
      targetPosition.y,
      state.workers,
      worker.position.x,
      worker.position.y
    );

    set((state) => ({
      workers: state.workers.map((w) =>
        w.id === workerId
          ? {
              ...w,
              isMoving: true,
              targetPosition: validPosition,
              isHarvesting: false,
            }
          : w
      ),
    }));
  },

  updateWorkerPosition: (workerId: string, position: Position) => {
    set((state) => ({
      workers: state.workers.map((worker) =>
        worker.id === workerId
          ? {
              ...worker,
              position,
              isMoving: false,
              targetPosition: null,
            }
          : worker
      ),
    }));
  },

  selectEntity: (entityId) => {
    set((state) => {
      // If selecting home
      if (entityId === 'home') {
        return {
          selectedEntityId: entityId,
          home: { ...state.home, isSelected: true },
          workers: state.workers.map(w => ({ ...w, isSelected: false })),
        };
      }
      
      // If selecting a worker
      const workerExists = state.workers.some(w => w.id === entityId);
      if (entityId && workerExists) {
        return {
          selectedEntityId: entityId,
          home: { ...state.home, isSelected: false },
          workers: state.workers.map(w => ({
            ...w,
            isSelected: w.id === entityId,
          })),
        };
      }
      
      // If deselecting (entityId is null)
      return {
        selectedEntityId: null,
        home: { ...state.home, isSelected: false },
        workers: state.workers.map(w => ({ ...w, isSelected: false })),
      };
    });
  },

  startHarvesting: (workerId) => {
    const state = get();
    const worker = state.workers.find(w => w.id === workerId);
    const tree = state.trees[0];

    if (!worker || !tree) return;

    if (worker.woodCarried >= MAX_WOOD_CAPACITY) {
      const home = state.home;
      const angle = Math.atan2(home.position.y - worker.position.y, home.position.x - worker.position.x);
      const targetX = home.position.x - Math.cos(angle) * (DEPOSIT_RANGE - 5);
      const targetY = home.position.y - Math.sin(angle) * (DEPOSIT_RANGE - 5);
      
      const validPosition = findValidPosition(
        workerId,
        targetX,
        targetY,
        state.workers,
        worker.position.x,
        worker.position.y
      );
      get().moveWorker(workerId, validPosition);
      return;
    }

    const distance = Math.hypot(
      worker.position.x - tree.position.x,
      worker.position.y - tree.position.y
    );

    if (distance <= HARVEST_RANGE && worker.woodCarried < MAX_WOOD_CAPACITY) {
      set((state) => ({
        workers: state.workers.map((w) =>
          w.id === workerId ? { 
            ...w, 
            isHarvesting: true,
            lastHarvestedTreeId: 0
          } : w
        ),
      }));
    } else if (distance > HARVEST_RANGE) {
      // Find optimal harvesting position
      const harvestPos = findHarvestPosition(workerId, tree, state.workers, worker.position);
      
      // Find valid position that doesn't collide with other workers
      const validPosition = findValidPosition(
        workerId,
        harvestPos.x,
        harvestPos.y,
        state.workers,
        worker.position.x,
        worker.position.y
      );
      
      set((state) => ({
        workers: state.workers.map((w) =>
          w.id === workerId ? { ...w, lastHarvestedTreeId: 0 } : w
        ),
      }));
      
      get().moveWorker(workerId, validPosition);
    }
  },

  stopHarvesting: (workerId) => {
    set((state) => ({
      workers: state.workers.map((w) =>
        w.id === workerId ? { ...w, isHarvesting: false } : w
      ),
    }));
  },

  updateHarvestProgress: (workerId, treeId) => {
    set((state) => {
      const worker = state.workers.find(w => w.id === workerId);
      const tree = state.trees[treeId];

      if (!worker || !tree || worker.woodCarried >= MAX_WOOD_CAPACITY) {
        return state;
      }

      // Check if still in range
      const distance = Math.hypot(
        worker.position.x - tree.position.x,
        worker.position.y - tree.position.y
      );
      
      if (distance > HARVEST_RANGE) {
        return {
          workers: state.workers.map((w) =>
            w.id === workerId ? { ...w, isHarvesting: false } : w
          ),
        };
      }

      const newProgress = tree.harvestProgress + HARVEST_SPEED;
      
      if (newProgress >= 1) {
        const updatedWorker = { ...worker, woodCarried: worker.woodCarried + 1 };
        
        // If max capacity reached, return to home
        if (updatedWorker.woodCarried >= MAX_WOOD_CAPACITY) {
          const home = state.home;
          const angle = Math.atan2(home.position.y - worker.position.y, home.position.x - worker.position.x);
          const targetX = home.position.x - Math.cos(angle) * (DEPOSIT_RANGE - 5);
          const targetY = home.position.y - Math.sin(angle) * (DEPOSIT_RANGE - 5);
          
          setTimeout(() => {
            get().moveWorker(workerId, { x: targetX, y: targetY });
          }, DEPOSIT_TO_HARVEST_DELAY);
        }

        return {
          trees: state.trees.map((t, i) =>
            i === treeId ? { ...t, harvestProgress: 0, woodAmount: t.woodAmount - 1 } : t
          ),
          workers: state.workers.map((w) =>
            w.id === workerId ? { ...updatedWorker, isHarvesting: updatedWorker.woodCarried < MAX_WOOD_CAPACITY } : w
          ),
        };
      }

      return {
        trees: state.trees.map((t, i) =>
          i === treeId ? { ...t, harvestProgress: newProgress } : t
        ),
      };
    });
  },

  depositWood: (workerId) => {
    const state = get();
    const worker = state.workers.find(w => w.id === workerId);
    const home = state.home;
    if (!worker || !home) return;

    // Check if in range of home
    const distance = Math.hypot(
      worker.position.x - home.position.x,
      worker.position.y - home.position.y
    );

    if (distance <= DEPOSIT_RANGE) {
      set((state) => {
        const worker = state.workers.find(w => w.id === workerId);
        if (!worker) return state;

        // After depositing, return to harvesting if we have a last harvested tree
        if (worker.lastHarvestedTreeId !== null) {
          setTimeout(() => {
            get().returnToHarvesting(workerId);
          }, 100);
        }

        return {
          workers: state.workers.map((w) =>
            w.id === workerId ? { ...w, woodCarried: 0, isHarvesting: false } : w
          ),
          home: {
            ...state.home,
            woodStored: state.home.woodStored + worker.woodCarried,
          },
        };
      });
    } else {
      // Move closer to home if out of range
      const angle = Math.atan2(home.position.y - worker.position.y, home.position.x - worker.position.x);
      const targetX = home.position.x - Math.cos(angle) * (DEPOSIT_RANGE - 5);
      const targetY = home.position.y - Math.sin(angle) * (DEPOSIT_RANGE - 5);
      get().moveWorker(workerId, { x: targetX, y: targetY });
    }
  },

  trainWorker: () => {
    const state = get();
    if (state.home.woodStored >= WORKER_COST) {
      const spawnPosition = {
        x: state.home.position.x + 50,
        y: state.home.position.y,
      };
      
      set((state) => ({
        home: {
          ...state.home,
          woodStored: state.home.woodStored - WORKER_COST,
        },
      }));
      
      get().addWorker(spawnPosition);
    }
  },

  returnToHarvesting: (workerId) => {
    const state = get();
    const worker = state.workers.find(w => w.id === workerId);
    if (!worker || worker.lastHarvestedTreeId === null) return;
    
    const tree = state.trees[worker.lastHarvestedTreeId];
    if (!tree) return;
    
    const angle = Math.atan2(tree.position.y - worker.position.y, tree.position.x - worker.position.x);
    const targetX = tree.position.x - Math.cos(angle) * (HARVEST_RANGE - 5);
    const targetY = tree.position.y - Math.sin(angle) * (HARVEST_RANGE - 5);
    
    get().moveWorker(workerId, { x: targetX, y: targetY });
    setTimeout(() => {
      get().startHarvesting(workerId);
    }, RETURN_TO_HARVEST_DELAY);
  },
})); 