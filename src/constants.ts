// Game mechanics
export const WORKER_COST = 10;
export const MAX_WOOD_CAPACITY = 5;
export const HARVEST_RANGE = 40;
export const DEPOSIT_RANGE = 50;
export const WORKER_RADIUS = 20;
export const WORKER_COLLISION_RADIUS = WORKER_RADIUS * 2;

// Worker positioning around resources
export const MIN_HARVEST_RANGE = HARVEST_RANGE - 5;
export const MAX_HARVEST_RANGE = HARVEST_RANGE - 2;
export const HARVEST_ANGLE_SPACING = Math.PI / 4; // 45 degrees between workers

// Speeds and timings
export const MOVEMENT_DURATION = 500; // ms
export const HARVEST_SPEED = 0.1; // Progress per tick
export const HARVEST_TICK_RATE = 1000; // ms
export const RETURN_TO_HARVEST_DELAY = 600; // ms
export const DEPOSIT_TO_HARVEST_DELAY = 100; // ms

// Visual settings
export const TREE_SIZE = 40;
export const TREE_TRUNK_WIDTH = 12;
export const TREE_TRUNK_HEIGHT = 20;
export const PROGRESS_BAR_HEIGHT = 4;
export const RANGE_INDICATOR_COLOR = 'rgba(255, 0, 0, 0.1)';
export const RANGE_INDICATOR_BORDER = 'rgba(255, 0, 0, 0.3)';

// Resource amounts
export const INITIAL_TREE_WOOD = 100;
export const INITIAL_HOME_WOOD = 0; 