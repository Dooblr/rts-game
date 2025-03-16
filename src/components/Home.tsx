import { Home as HomeType } from '../store/gameStore';
import { useGameStore } from '../store/gameStore';

interface HomeProps {
  home: HomeType;
}

export function Home({ home }: HomeProps) {
  const { selectEntity, trainWorker } = useGameStore();

  // Create points for hexagon
  const size = 30;
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3 - Math.PI / 6;
    const x = size * Math.cos(angle);
    const y = size * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  return (
    <>
      <svg
        style={{
          position: 'absolute',
          left: home.position.x - size,
          top: home.position.y - size,
          width: size * 2,
          height: size * 2,
          cursor: 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation();
          selectEntity('home');
        }}
        onMouseEnter={(e) => {
          if (!home.isSelected) {
            e.currentTarget.style.filter = 'brightness(1.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!home.isSelected) {
            e.currentTarget.style.filter = 'none';
          }
        }}
      >
        <polygon
          points={points}
          fill="#cc0000"
          stroke={home.isSelected ? 'white' : 'none'}
          strokeWidth="2"
          transform={`translate(${size},${size})`}
        />
      </svg>

      {/* Production menu */}
      {home.isSelected && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '10px',
            borderRadius: '5px',
            color: 'white',
          }}
        >
          <button
            onClick={() => trainWorker()}
            style={{
              padding: '8px 16px',
              backgroundColor: home.woodStored >= 10 ? '#4CAF50' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: home.woodStored >= 10 ? 'pointer' : 'not-allowed',
            }}
          >
            Train Worker (10 wood)
          </button>
        </div>
      )}

      {/* Wood stored indicator */}
      <div
        style={{
          position: 'absolute',
          top: home.position.y - 50,
          left: home.position.x,
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '14px',
        }}
      >
        Wood: {home.woodStored}
      </div>
    </>
  );
} 