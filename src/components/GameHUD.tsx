import { useGameStore } from '../store/gameStore';

export function GameHUD() {
  const { home } = useGameStore();

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '10px 20px',
        borderRadius: '5px',
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold',
      }}
    >
      Wood: {home.woodStored}
    </div>
  );
} 