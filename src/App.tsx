import { useEffect } from 'react';
import './App.scss';
import { useGameStore } from './store/gameStore';
import { Worker } from './components/Worker';
import { Home } from './components/Home';
import { Tree } from './components/Tree';
import { GameHUD } from './components/GameHUD';

function App() {
  const { 
    workers, 
    trees, 
    home, 
    addWorker, 
    selectedEntityId, 
    moveWorker,
    startHarvesting 
  } = useGameStore();

  // Initialize game with one worker next to the home base
  useEffect(() => {
    if (workers.length === 0 && home) {
      addWorker({
        x: home.position.x + 50,
        y: home.position.y,
      });
    }
  }, [workers.length, addWorker, home]);

  const handleContainerClick = (e: React.MouseEvent) => {
    // Only handle background clicks for deselection
    const clickedElement = e.target as HTMLElement;
    if (clickedElement.className === 'game-container') {
      useGameStore.getState().selectEntity(null);
    }
  };

  const handleContainerRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Only handle interactions if a worker is selected
    const selectedWorker = workers.find(w => w.id === selectedEntityId);
    if (!selectedWorker) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if clicked near a tree
    const clickedTree = trees.find(tree => {
      const dx = clickX - tree.position.x;
      const dy = clickY - tree.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < 40; // Tree click radius
    });

    if (clickedTree) {
      // If clicked on a tree, start harvesting
      startHarvesting(selectedWorker.id);
    } else {
      // Calculate target position relative to current worker position
      moveWorker(selectedWorker.id, { x: clickX, y: clickY });
    }
  };

  return (
    <div 
      className="game-container"
      onClick={handleContainerClick}
      onContextMenu={handleContainerRightClick}
    >
      {/* Render game entities */}
      {workers.map((worker) => (
        <Worker key={worker.id} worker={worker} />
      ))}
      {trees.map((tree, index) => (
        <Tree key={index} tree={tree} index={index} />
      ))}
      <Home home={home} />
      
      {/* HUD */}
      <GameHUD />
    </div>
  );
}

export default App;
